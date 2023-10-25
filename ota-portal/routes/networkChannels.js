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

    console.log(nodeIds);

    // create channel
    await channel.newChannelObj(networkId, nodeIds);

    // return response
    res.sendStatus(200);
}));

/**
 * Upload a file to the channel.
 */
router.post("/:id/channel/file", async function(req, res) {
    req.setEncoding(null);

    try {
        // persist file locally
        fs.writeFileSync(`${process.env.JAMOTA_ROOT}/channels/${req.params.id}`, Buffer.from(req.body));

        // asynchronously dispatch process to upload file to nodes
        execNodeScript([scriptPath("jxe_loader"), "--networkId", req.params.id, "--type", "file"], (data) => {
            console.log(data.toString());
        });

        res.sendStatus(200);
    }
    catch (e) {
        console.log("Failed", e);
        res.sendStatus(500);
    }
});

/**
 * Upload a command to the channel.
 */
router.post("/:id/channel/cmd", async function(req, res) {
    try {
        let cmd = req.body;
        console.log(cmd);

        // dispatch process to send command to nodes
        execScript([scriptPath("jxe_loader"), "--networkId", req.params.id, "--type", "command"], (data) => {
            console.log(data.toString());
        });

        res.sendStatus(200);
    }
    catch (e) {
        console.log("Failed", e);
        res.sendStatus(500);
    }
});

module.exports = router;
