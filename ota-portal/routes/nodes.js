const express = require("express");
const router = express.Router();

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");
const request = require("./../utils/request");

const node = require("./../utils/node");

function applyFilter(nodeObj) {
    return true;
}

function map(nodeObj) {
    const createdOn = Number.parseInt(nodeObj.createdOn);
    const lastRegisteredOn = Number.parseInt(nodeObj.lastRegisteredOn);

    return {
        name: nodeObj.name,
        type: nodeObj.type,
        status: nodeObj.status,
        createdOn: new Date(createdOn).toDateString(),
        lastRegisteredOn: lastRegisteredOn === 0
            ? 'Not registered yet'
            : new Date(lastRegisteredOn).toDateString(),
    };
}

async function filterNodeEntries(username, nodeIds) {
    let nodes = {};

    for (let nodeId of nodeIds) {
        [err, nodeObj] = await rclient.getObj(node.nodeKey(nodeId));
        if (applyFilter(nodeObj)) {
            nodes[nodeId] = map(nodeObj);
        }
    }

    return nodes;
}

router.get("/", errors.asyncWrap(async function(req, res, next) {
    [err, nodeIds] = await rclient.getSetMembers(node.userNodesKeyFromReq(req));

    res.render("node/list", {
        data: await filterNodeEntries(req.user.username, nodeIds)
    });
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

    // create node entry
    const nodeObj = node.obj.create(nodeReq.name, nodeReq.type);
    [err, redisRes] = await rclient.setObj(key, nodeObj);

    // add node entry to user's list
    [err, redisRes] = await rclient.addToSet(node.userNodesKeyFromReq(req), uuid);

    res.send(nodeObj.regKey);
}));

module.exports = router;
