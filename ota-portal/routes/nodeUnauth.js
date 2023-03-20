/**
 * Unauthorized requests to transition nodes in the database. These
 * requests come from the node itself, hence does not have an active
 * OAuth session or access token.
 */

const express = require("express");
const router = express.Router();

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");
const request = require("./../utils/request");
const ssh = require("./../utils/ssh");

const node = require("./../utils/node");
const network = require("./../utils/network");
const keys = require("./../utils/keys");

/**
 * Register a node.
 */
router.post("/", errors.asyncWrap(async function(req, res, next) {
    const clientIp = request.getIp(req);
    const nodeReq = request.validateBody(req, ["nodeId?", "name", "type", "networkId", "regKey", "sshUser", "encKey"]);

    if (!node.validType(nodeReq.type)) {
        errors.error(400, `Invalid node type, must be one of: ${node.typesList}.`);
    }

    // validate registration key before accessing database
    if (!keys.validateKey(nodeReq.regKey)) {
        console.log("not good key");
        errors.error(403, "Invalid registration key.");
    }

    // validate network
    const networkId = nodeReq.networkId;
    [redisRes, networkKey] = await network.getNetwork(networkId);
    if (redisRes.regKey !== nodeReq.regKey) {
        console.log("mismatch");
        errors.error(403, "Invalid registration key.");
    }

    // test SSH key
    if (!(await ssh.testSSH(nodeReq.sshUser, clientIp))) {
        errors.error(403, "Invalid SSH connection.");
    }

    // determine node ID
    const nodeId = nodeReq.nodeId || rclient.createGUID();
    let key;
    while (!key) {
        key = node.nodeExists(nodeId);
        nodeId = rclient.createGUID;
    }

    // create object
    await node.obj.create(nodeId, networkId, nodeReq.name, nodeReq.type, nodeReq.sshUser, nodeReq.encKey);

    // add node entry to user's list
    [err, redisRes] = await rclient.addToSet(node.userNodesKeyFromReq(req), nodeId);

    // add node entry to network's list
    [err, redisRes] = await rclient.addToSet(node.networkNodesKey(networkId));

    res.status(201).send(nodeId + "\n");
}));

router.put("/:id/register", errors.asyncWrap(async function(req, res, next) {
    const clientIp = request.getIp(req);
    const nodeReq = request.validateBody(req, ["regKey", "sshUser"]);

    // validate registration key before accessing database
    if (!node.validateRegKey(nodeReq.regKey)) {
        errors.error(403, "Invalid registration key.");
    }
    
    // get requested node
    const nodeId = req.params.id;
    [redisRes, nodeKey] = await node.getNode(nodeId);

    // cannot register/refresh if revoked
    node.invalidateNodeTransition(redisRes, node.statuses.ONLINE, [node.statuses.REVOKED]);

    if (node.isExpired(redisRes)) {
        const expiredNodeObj = node.obj.expire();
        [err, redisRes] = await rclient.setObj(nodeKey, expiredNodeObj);
        errors.error(403, "Expired registration key.");
    }

    // test SSH connection
    if (!(await ssh.testSSH(nodeId, nodeReq.sshUser, clientIp))) {
        errors.error(403, "Invalid SSH connection.");
    }

    // update node entry in DB
    redisRes = await node.obj.refresh(nodeId, nodeReq.sshUser);

    res.status(200).send(redisRes.regKey + "\n");
}));

/**
 * Set the node as online.
 */
router.put("/:id/online", errors.asyncWrap(async function(req, res, next) {
    const clientIp = request.getIp(req);
    const nodeReq = request.validateBody(req, ["regKey", "sshUser", "curVer"]);
    const sshUser = nodeReq.sshUser;

    // get requested node
    const nodeId = req.params.id;
    [redisRes, nodeKey] = await node.getNode(nodeId);

    // can put online only if offline
    node.validateNodeTransition(redisRes, node.statuses.ONLINE, [node.statuses.OFFLINE]);

    // validate the requesting device
    if (!(await ssh.testSSH(nodeId, nodeReq.sshUser, clientIp))) {
        errors.error(403, "Invalid SSH connection.");
    }

    // update node entry in DB
    await node.obj.online(nodeId, sshUser, clientIp);

    res.status(200).send();
}));

/**
 * Set the node as offline.
 */
router.put("/:id/offline", errors.asyncWrap(async function(req, res, next) {
    // get requested node
    const nodeId = req.params.id;
    [redisRes, nodeKey] = await node.getNode(nodeId);

    // can put offline only if online
    node.validateNodeTransition(redisRes, node.statuses.OFFLINE, [node.statuses.ONLINE]);

    // update node entry in DB
    await node.obj.revoke(nodeId);

    res.status(200).send();
}));

module.exports = router;
