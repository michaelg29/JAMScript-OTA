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
const fs = require("fs");

const { spawn } = require("child_process");

const scriptPath = (script) => `${process.env.JAMOTA_ROOT}/ota-portal/bin/${script}.js`;

async function execNodeScript(args, onstdout, onstderr) {
    return new Promise((resolve, reject) => {
        const proc = spawn("node", args, {
            detached: true
        });

        if (onstdout) {
            proc.stdout.on("data", onstdout);
        }

        if (onstderr) {
            proc.stderr.on("data", onstderr);
        }

        proc.on("exit", (code) => {
            resolve(code);
        });
    });
}

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

    // create channel
    await channel.newChannelObj(networkId, nodeIds);

    // return response
    res.sendStatus(200);
}));

/**
 * Upload a file to the channel.
 */
router.post("/:id/channel/file", errors.asyncWrap(async function(req, res) {
    req.setEncoding(null);

    const networkId = req.params.id;
    await network.belongsToOwner(req, networkId);

    try {
        // persist file locally
        fs.writeFileSync(`${process.env.CHANNEL_FILES_DIR}/${networkId}`, Buffer.from(req.body));

        // asynchronously dispatch process to upload file to nodes
        // execNodeScript([scriptPath("jxe_loader"), "--networkId", networkId, "--type", "file"], (data) => {
        //     console.log(data.toString());
        // });

        res.sendStatus(200);
    }
    catch (e) {
        console.log("Failed", e);
        res.sendStatus(500);
    }
}));

/**
 * Upload a command to the channel.
 */
router.post("/:id/channel/cmd", errors.asyncWrap(async function(req, res) {
    const networkId = req.params.id;
    await network.belongsToOwner(req, networkId);

    try {
        // persist command locally in file
        fs.writeFileSync(`${process.env.CHANNEL_COMMANDS_DIR}/${networkId}`, req.body);

        // dispatch process to send command to nodes
        // execScript([scriptPath("jxe_loader"), "--networkId", req.params.id, "--type", "cmd"], (data) => {
        //     console.log(data.toString());
        // });

        res.sendStatus(200);
    }
    catch (e) {
        console.log("Failed", e);
        res.sendStatus(500);
    }
}));

module.exports = router;
