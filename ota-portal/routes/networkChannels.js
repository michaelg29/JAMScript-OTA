/**
 * Authorized requests for network channels in the database.
 */

const express = require("express");
const router = express.Router();

const errors = require("../utils/httperror");
const request = require("../utils/request");
const rclient = require("../utils/redis-client");

const network = require("../utils/network");
const channel = require("../utils/channel");
const node = require("../utils/node");

/**
 * Create a channel to communicate with multiple nodes. Each network can only have one active channel.
 */
router.post("/:id/channel", errors.asyncWrap(async function(req, res) {
    // parse request
    const networkId = req.params.id;
    const channelReq = request.validateBody(req, ["nodeIds?"]);

    // validate request
    await network.getNetworkFromOwner(req, networkId);
    let [err, networkNodeIds] = await rclient.getSetMembers(node.networkNodesKey(networkId));
    
    let nodeIds = [];
    if ("nodeIds" in channelReq && channelReq.nodeIds.length > 0) {
        // filter nodes to the current network
        for (let nodeId of channelReq.nodeIds) {
            if (networkNodeIds.indexOf(nodeId) != -1) {
                nodeIds.push(nodeId);
            }
        }
    }
    else {
        // if none provided, select all nodes in the network
        nodeIds = networkNodeIds;
    }

    console.log(nodeIds);

    // create channel
    await channel.newChannelObj(networkId, nodeIds);

    // return response
    res.status(200);
}));

module.exports = router;
