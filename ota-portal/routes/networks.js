/**
 * Authorized requests for networks in the database.
 */

const express = require("express");
const router = express.Router();

const rclient = require("../utils/redis-client");
const errors = require("../utils/httperror");
const request = require("../utils/request");
const ssh = require("./../utils/ssh");

const network = require("../utils/network");

/**
 * Create a network.
 */
router.post("/", errors.asyncWrap(async function(req, res, next) {
    const netReq = request.validateBody(req, ["name"]);

    // generate new uuid
    let uuid;
    let key;
    while (!key) {
        uuid = rclient.createGUID();
        key = network.networkExists(uuid);
    }

    // create network entry
    const networkEntry = await network.obj.create(uuid, req.user.username, netReq.name);

    // add network to user's list
    [err, redisRes] = await rclient.addToSet(network.userNetworksKeyFromReq(req), uuid);

    res.status(201).send(networkEntry);
}));

/**
 * Get the registration script command for a network.
 */
router.get("/:id/ijamreg.sh", errors.asyncWrap(async function(req, res, next) {
    // get requested network
    const networkId = req.params.id;
    [redisRes, networkKey] = await network.getNetworkFromOwner(req, networkId);

    // get public key
    const pubKey = (await ssh.getPubKey()).trimEnd();

    // get registration key
    const regKey = redisRes.regKey;

    // construct command
    const cmd = `cd jamota-tools\n./ijamdownload.sh --networkId="${networkId}" --pubKey="${pubKey}" --regKey="${regKey}" --insecure --`;

    res.header("content-type", "application/x-sh");
    res.send(cmd);
}));

/**
 * Delete a network.
 */
router.delete("/:id", errors.asyncWrap(async function(req, res, next) {
    // get requested network
    const networkId = req.params.id;
    [redisRes, networkKey] = await network.getNetworkFromOwner(req, networkId);

    await rclient.del(networkKey);

    res.sendStatus(204);
}));

function map(networkObj) {
    const createdOn = Number.parseInt(networkObj.createdOn);

    return {
        name: networkObj.name,
        createdOn: new Date(createdOn).toDateString(),
    };
}

async function filterNetworkEntries(networkIds) {
    let networks = {};

    for (let networkId of networkIds) {
        [err, networkObj] = await rclient.getObj(network.networkKey(networkId));
        if (networkObj) {
            networks[networkId] = map(networkObj);
        }
    }

    return networks;
}

/**
 * Get all networks.
 */
router.get("/", errors.asyncWrap(async function(req, res, next) {
    [err, networkIds] = await rclient.getSetMembers(network.userNetworksKeyFromReq(req));

    var data = await filterNetworkEntries(networkIds);

    if (req.headers.accept === "application/json") {
        res.send(data)
    }
    else {
        res.render("network/list", {
            data: data
        });
    }
}));

module.exports = router;
