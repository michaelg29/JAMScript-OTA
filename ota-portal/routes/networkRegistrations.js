/**
 * Authorized requests for network registrations in the database.
 */

const express = require("express");
const router = express.Router();

const errors = require("../utils/httperror");
const request = require("../utils/request");

const network = require("../utils/network");
const passphrases = require("../utils/network_passphrase");

/**
 * Get the node registration form.
 */
router.get("/:id/node", errors.asyncWrap(async function(req, res, next) {
    [err, redisRes] = await network.getNetworkFromOwner(req, req.params.id);

    res.render("network/register", {
        netId: req.params.id
    });
}));

/**
 * Prepare a node passphrase.
 */
router.post("/:id/node", errors.asyncWrap(async function(req, res, next) {
    const nodeReq = request.validateBody(req, ["name", "pass"]);

    passphrases.validateNetworkPassphrase(nodeReq.pass);

    // check requested network
    const networkId = req.params.id;
    await network.getNetworkFromOwner(req, networkId);

    // set in database
    await passphrases.addNetworkPassphrase(networkId, nodeReq.name, nodeReq.pass);

    res.redirect("/nodes?network-id=" + req.params.id);
}));

/**
 * Clear all unused passphrases.
 */
router.delete("/:id/passphrases", errors.asyncWrap(async function(req, res, next) {
    const networkId = req.params.id;
    await network.getNetworkFromOwner(req, networkId);
    await passphrases.clearPassphrases(networkId);
    res.sendStatus(204);
}));

module.exports = router;
