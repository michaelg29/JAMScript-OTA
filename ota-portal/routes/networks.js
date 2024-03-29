/**
 * Authorized requests for networks in the database.
 */

const express = require("express");
const router = express.Router();
const fs = require("fs");

const rclient = require("../utils/redis-client");
const errors = require("../utils/httperror");
const request = require("../utils/request");

const ijam_types = require("../utils/ijam_types");
const network = require("../utils/network");
const passphrases = require("../utils/network_passphrase");
const node = require("../utils/node");

/**
 * Create a network.
 */
router.post("/", errors.asyncWrap(async function(req, res, next) {
    const netReq = request.validateBody(req, ["id", "name"]);

    // validate ID
    if (netReq.id.length > ijam_types.maxNetworkIdLength) {
        errors.error(400, "Network ID cannot be more than 16 characters.");
    }

    // ensure unique ID
    let redisRes, networkKey;
    try {
        [redisRes, networkKey] = await network.getNetwork(netReq.id);
    }
    catch { }
    if (redisRes) {
        errors.error(400, "Network with that ID exists.")
    }

    // create network entry
    const networkEntry = await network.obj.create(netReq.id, req.user.username, netReq.name);

    // add network to user's list
    [err, redisRes] = await rclient.addToSet(network.userNetworksKeyFromReq(req), netReq.id);

    // create directories for the network
    for (let dir of [
        `${process.env.CHANNELS_DIR}/${netReq.id}`,
        `${process.env.CHANNELS_DIR}/${netReq.id}/files`]) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    res.status(201).send(networkEntry);
}));

/**
 * Delete a network.
 */
router.delete("/:id", errors.asyncWrap(async function(req, res, next) {
    // get requested network
    const networkId = req.params.id;
    let [_, networkKey] = await network.getNetworkFromOwner(req, networkId);

    // ensure no more nodes registered
    let [err, redisRes] = await rclient.getSetMembers(node.networkNodesKey(networkId));
    if (redisRes.length > 0) {
        errors.error(400, "Nodes still registered on the network.");
    }

    // delete nodes list
    await rclient.del(node.networkNodesKey(networkId));

    // delete passphrases
    await passphrases.clearPassphrases(networkId);

    // remove from user network list
    await rclient.removeFromSet(network.userNetworksKeyFromReq(req), networkId);

    await rclient.del(networkKey);

    res.sendStatus(204);
}));

function map(networkObj, nodeListSize, passphraseListSize) {
    const createdOn = Number.parseInt(networkObj.createdOn);

    return {
        name: networkObj.name,
        createdOn: new Date(createdOn).toDateString(),
        nodeListSize: nodeListSize,
        passphraseListSize: passphraseListSize
    };
}

async function filterNetworkEntries(networkIds) {
    let networks = {};

    for (let networkId of networkIds) {
        let [_, networkObj] = await rclient.getObj(network.networkKey(networkId));
        if (networkObj) {

            networks[networkId] = map(networkObj,
                await rclient.getSetSize(node.networkNodesKey(networkId)),
                await passphrases.getNumberOfPassphrases(networkId));
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
        res.send(data);
    }
    else {
        res.render("network/list", {
            data: data
        });
    }
}));

module.exports = router;
