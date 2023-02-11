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

    // validate registration key
    if (redisRes.regKey !== req.body.regKey) {
        errors.error(400, "Invalid registration key.", "register");
    }

    // TODO: test SSH connection

    // update node entry in DB
    [err, redisRes] = await rclient.setObj(nodeKey, {
        mac: nodeReq.mac,
        pubKey: nodeReq.pubKey,
        registeredOn: Date.now(),
        lastRefreshedOn: Date.now(),
        status: node.statuses.REGISTERED
    });
    if (err) {
        errors.error(500, err);
    }

    res.status(200).send("Node registered.\n");
}));

module.exports = router;
