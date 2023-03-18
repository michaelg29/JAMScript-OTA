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
const ssh = require("./../utils/ssh");

const node = require("./../utils/node");

/**
 * Create a node.
 */
router.post("/", errors.asyncWrap(async function(req, res, next) {
    const nodeReq = request.validateBody(req, ["name", "type"]);
    if (!node.validType(nodeReq.type)) {
        errors.error(400, `Invalid node type, must be one of: ${node.typesList}.`, "node/reserve");
    }

    // generate new uuid
    let uuid;
    let key;
    while (!key) {
        uuid = rclient.createGUID();
        key = node.nodeExists(uuid);
    }

    // create node entry
    await node.obj.create(uuid, nodeReq.name, nodeReq.type);

    // add node entry to user's list
    [err, redisRes] = await rclient.addToSet(node.userNodesKeyFromReq(req), uuid);

    res.render("node/tools", {
        nodeId: uuid
    });
}));

/**
 * Get form to download registration tools.
 */
router.get("/:id/tools", errors.asyncWrap(async function(req, res, next) {
    const nodeId = req.params.id;
    await node.belongsToOwner(req, nodeId);
    res.render("node/tools", {
        nodeId: nodeId
    });
}));

/**
 * Download registration tools.
 */
router.get("/:id/tools.sh", errors.asyncWrap(async function(req, res, next) {
    // get requested node
    const nodeId = req.params.id;
    [redisRes, nodeKey] = await node.getNodeFromOwner(req, nodeId);

    // get public key
    const pubKey = (await ssh.getPubKey()).trimEnd();

    // get registration key
    const regKey = redisRes.regKey;

    // construct command
    const cmd = `cd jamota-tools\n./ijamdownload.sh --nodeid="${nodeId}" --pubkey="${pubKey}" --regkey="${regKey}" --insecure --`;

    res.header("content-type", "application/x-sh");
    res.send(cmd);
}));

/**
 * Revoke a node.
 */
router.purge("/:id", errors.asyncWrap(async function(req, res, next) {
    // get requested node
    const nodeId = req.params.id;
    node.belongsToOwner(req, nodeId);

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
    await rclient.removeFromSet(node.userNodesKeyFromReq(req), nodeId);
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
    await ssh.pingSSH(redisRes.sshUser, redisRes.ip);

    res.status(200).send();
}));

module.exports = router;
