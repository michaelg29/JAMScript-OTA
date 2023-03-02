const express = require("express");
const router = express.Router();

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");
const request = require("./../utils/request");
const ssh = require("./../utils/ssh");

const node = require("./../utils/node");

router.post("/register/:id", errors.asyncWrap(async function(req, res, next) {
    let clientIp = request.getIp(req);
    let nodeReq;
    if (!!process.env.SSH_IP_IN_FORM) {
        nodeReq = request.validateBody(req, ["regKey", "sshUser", "ip"]);
        clientIp = nodeReq.ip;
    }
    else {
        nodeReq = request.validateBody(req, ["regKey", "sshUser"]);
    }

    // validate registration key before accessing database
    if (!node.validateRegKey(nodeReq.regKey)) {
        errors.error(403, "Invalid registration key.");
    }
    
    // get requested node
    const nodeId = req.params.id;
    const nodeKey = node.nodeKey(nodeId);

    // get existing node entry
    [err, redisRes] = await rclient.getObj(nodeKey);
    if (err || !redisRes) {
        errors.error(404, "Node not found.");
    }

    if (redisRes.status == node.statuses.REVOKED) {
        errors.error(403, "Node is revoked.");
    }

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

module.exports = router;
