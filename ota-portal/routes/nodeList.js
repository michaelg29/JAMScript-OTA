/**
 * Authorized requests to manipulate and fetch multiple nodes.
 */

const express = require("express");
const router = express.Router();

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");

const node = require("./../utils/node");
const network = require("./../utils/network");
const channel = require("./../utils/channel");

function applyFilter(nodeObj) {
    return true;
}

function map(network, nodeObj) {
    const createdOn = Number.parseInt(nodeObj.createdOn);
    const lastRegisteredOn = Number.parseInt(nodeObj.lastRegisteredOn);

    return {
        name: nodeObj.name,
        type: nodeObj.type,
        status: nodeObj.status,
        networkName: network.name,
        createdOn: new Date(createdOn).toDateString(),
        lastRegisteredOn: (lastRegisteredOn === 0
            ? 'Not registered yet'
            : new Date(lastRegisteredOn).toDateString()),
        arch: nodeObj.arch
    };
}

async function filterNodeEntries(req, networkIds) {
    let nodes = {};
    const requestedNetworkId = req.query["network-id"] || false;

    for (let networkId of networkIds) {
        if (requestedNetworkId) {
            // query for requested network
            if (networkId != requestedNetworkId) continue;

            try {
                await network.belongsToOwner(req, networkId);
            } catch {
                continue;
            }
        }

        let [networkObj, _] = await network.getNetwork(networkId);
        let [err, nodeIds] = await rclient.getSetMembers(node.networkNodesKey(networkId));

        for (let nodeId of nodeIds) {
            [err, nodeObj] = await rclient.getObj(node.nodeKey(nodeId));
            if (nodeObj && applyFilter(nodeObj)) {
                nodes[nodeId] = map(networkObj, nodeObj);
            }
        }
    }

    return nodes;
}

/**
 * Get all nodes.
 */
router.get("/", errors.asyncWrap(async function(req, res) {
    let [err, networkIds] = await rclient.getSetMembers(network.userNetworksKeyFromReq(req));

    var data = await filterNodeEntries(req, networkIds);
    var networkId = undefined;
    var files = [];
    if ("network-id" in req.query) {
        networkId = req.query["network-id"];

        files = await channel.getChannelFiles(networkId);
    }

    if (req.headers.accept === "application/json") {
        res.send(data)
    }
    else {
        res.render("node/list", {
            data: data,
            networkId: networkId,
            files: files,
        });
    }
}));

module.exports = router;
