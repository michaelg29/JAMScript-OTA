/**
 * Authorized requests to transition nodes in the database. These
 * requests come from the website, where a user must have an
 * active logged-in session.
 */

const express = require("express");
const router = express.Router();

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");
const request = require("./../utils/request");

const node = require("./../utils/node");

/**
 * Revoke a node.
 */
router.purge("/:id", errors.asyncWrap(async function(req, res, next) {
    // get requested node
    const nodeId = req.params.id;
    await node.getNodeFromOwner(req, nodeId);

    // update node entry in DB
    await node.obj.revoke(nodeId);

    res.status(200).send();
}));

/**
 * Hard delete a node from the database.
 */
router.delete("/:id", errors.asyncWrap(async function(req, res, next) {
    // get requested node
    const nodeId = req.params.id;
    [redisRes, nodeKey] = await node.getNodeFromOwner(req, nodeId);

    // can only delete if revoked or expired
    node.validateNodeTransition(redisRes, "deleted", [node.statuses.REVOKED, node.statuses.EXPIRED]);
    await rclient.removeFromSet(node.networkNodesKey(redisRes.networkId), nodeId);
    await rclient.del(nodeKey);

    res.sendStatus(204);
}));

/**
 * Ping a node.
 */
router.notify("/:id", errors.asyncWrap(async function(req, res, next) {
    // get requested node
    const nodeId = req.params.id;
    [redisRes, nodeKey] = await node.getNodeFromOwner(req, nodeId);

    // can ping only if online
    if (redisRes.status !== node.statuses.ONLINE) {
        errors.error(403, "Node not online.");
    }

    // ping the node

    res.status(200).send();
}));

module.exports = router;
