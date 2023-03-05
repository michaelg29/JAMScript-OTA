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
    node.invalidateNodeTransition(redisRes, node.statuses.ONLINE, node.statuses,REVOKED);

    // validate registration key
    if (redisRes.regKey !== nodeReq.regKey) {
        errors.error(403, "Invalid registration key.");
    }
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
    const nodeObj = node.obj.refresh(nodeReq.sshUser);
    [err, redisRes] = await rclient.setObj(nodeKey, nodeObj);
    if (err) {
        errors.error(500, err);
    }

    res.status(200).send(nodeObj.regKey + "\n");
}));

router.put("/:id/online", errors.asyncWrap(async function(req, res, next) {

}));

router.put("/:id/offline", errors.asyncWrap(async function(req, res, next) {
    // get requested node
    const nodeId = req.params.id;
    [redisRes, nodeKey] = await node.getNode(nodeId);

    // can put offline only if online
    node.validateNodeTransition(redisRes, node.statuses.OFFLINE, node.statuses.ONLINE);

    // update node entry in DB
    const nodeObj = node.obj.revoke(nodeReq.sshUser);
    [err, redisRes] = await rclient.setObj(nodeKey, nodeObj);
    if (err) {
        errors.error(500, err);
    }

    res.status(200).send();
}));

module.exports = router;
