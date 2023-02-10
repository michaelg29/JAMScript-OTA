const express = require("express");
const router = express.Router();
const crypto = require("crypto");

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");
const request = require("./../utils/request");

const nodeTypes = ["device", "fog", "cloud"];

function nodeKey(uuid) {
    return "node:" + uuid;
}

router.post("/", errors.asyncWrap(async function(req, res, next) {
    const node = request.validateBody(req, ["type"]);
    if (!nodeTypes.includes(node.type)) {
        errors.error(400, `Invalid node type, must be one of: ${nodeTypes.join(", ")}.`);
    }

    // generate new uuid
    let uuid;
    let key;
    while (true) {
        uuid = rclient.createGUID();

        key = nodeKey(uuid);
        [err, redisRes] = await rclient.execute("keys", [key]);
        if (!redisRes || redisRes.length === 0) {
            break;
        }
    }

    // generate registration key
    var regKey = crypto.randomBytes(32).toString("hex");

    // create node entry
    [err, redisRes] = await rclient.setObj(key, {
        name: "",
        type: node.type,
        mac: "",
        publicKey: "",
        regKey: regKey,
        user_username: req.user.username,
        createdOn: Date.now(),
        registeredOn: 0,
        lastRefreshedOn: 0
    });

    res.send({
        nodeId: uuid,
        regKey: regKey
    });
}));

module.exports = router;
