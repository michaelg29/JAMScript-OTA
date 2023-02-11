const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");
const request = require("./../utils/request");

const node = require("./../utils/node");

router.get("/", errors.asyncWrap(async function(req, res, next) {
    res.render("node/list");
}));

router.get("/reserve", function(req, res, next) {
    res.render("node/reserve");
});

router.post("/", errors.asyncWrap(async function(req, res, next) {
    const nodeReq = request.validateBody(req, ["name", "type"]);
    if (!node.validType(nodeReq.type)) {
        errors.error(400, `Invalid node type, must be one of: ${node.typesList}.`, "node/reserve");
    }

    // generate new uuid
    let uuid;
    let key;
    while (true) {
        uuid = rclient.createGUID();

        key = node.nodeKey(uuid);
        [err, redisRes] = await rclient.execute("keys", [key]);
        if (!redisRes || redisRes.length === 0) {
            break;
        }
    }

    // generate registration key
    var regKey = crypto.randomBytes(32).toString("hex");

    // create node entry
    [err, redisRes] = await rclient.setObj(key, {
        name: nodeReq.name,
        type: nodeReq.type,
        mac: "",
        pubKey: "",
        regKey: regKey,
        user_username: req.user.username,
        createdOn: Date.now(),
        registeredOn: 0,
        lastRefreshedOn: 0,
        status: node.statuses.CREATED
    });

    res.redirect("/ijam/register/" + uuid);
}));

module.exports = router;
