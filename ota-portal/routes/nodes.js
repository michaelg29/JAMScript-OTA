/**
 * Authorized requests to manipulate and fetch multiple nodes.
 */

const express = require("express");
const router = express.Router();

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");

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

async function filterNodeEntries(nodeIds) {
    let nodes = {};

    for (let nodeId of nodeIds) {
        [err, nodeObj] = await rclient.getObj(node.nodeKey(nodeId));
        if (nodeObj && applyFilter(nodeObj)) {
            nodes[nodeId] = map(nodeObj);
        }
    }

    return nodes;
}

/**
 * Get all nodes.
 */
router.get("/", errors.asyncWrap(async function(req, res, next) {
    [err, nodeIds] = await rclient.getSetMembers(node.userNodesKeyFromReq(req));

    var data = await filterNodeEntries(nodeIds);

    if (req.headers.accept === "application/json") {
        res.send(data)
    }
    else {
        res.render("node/list", {
            data: data
        });
    }
}));

/**
 * Get node creation form.
 */
router.get("/reserve", function(req, res, next) {
    res.render("node/reserve");
});

module.exports = router;
