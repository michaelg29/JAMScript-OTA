const express = require("express");
const router = express.Router();

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");
const request = require("./../utils/request");

const node = require("./../utils/node");

router.post("/register/:id", errors.asyncWrap(async function(req, res, next) {
    const nodeReq = request.validateBody(req, ["regKey", "mac", "pubKey"]);
    
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
    if (redisRes.regKey !== req.body.regKey) {
        errors.error(403, "Invalid registration key.");
    }
    if (node.isExpired(redisRes)) {
        const expiredNodeObj = node.obj.expire();
        [err, redisRes] = await rclient.setObj(nodeKey, expiredNodeObj);
        errors.error(403, "Expired registration key.");
    }

    // TODO: test SSH connection

    // update node entry in DB
    const nodeObj = node.obj.refresh(nodeReq.mac, nodeReq.pubKey);
    [err, redisRes] = await rclient.setObj(nodeKey, nodeObj);
    if (err) {
        errors.error(500, err);
    }

    res.status(200).send(nodeObj.regKey + "\n");
}));

module.exports = router;
