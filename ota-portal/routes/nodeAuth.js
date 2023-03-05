/**
 * Authorized requests to transition nodes in the database. These
 * requests come from the website, where a user must have an
 * active logged-in session.
 */

const express = require("express");
const router = express.Router();

const rclient = require("./../utils/redis-client");
const errors = require("./../utils/httperror");
const request = require("./../utils/request");
const ssh = require("./../utils/ssh");

const node = require("./../utils/node");

router.post("/", errors.asyncWrap(async function(req, res, next) {
    const nodeReq = request.validateBody(req, ["name", "type"]);
    if (!node.validType(nodeReq.type)) {
        errors.error(400, `Invalid node type, must be one of: ${node.typesList}.`, "node/reserve");
    }

    // generate new uuid
    let uuid;
    let key;
    while (!key) {
        uuid = rclient.createGUID();
        key = nodeExists(uuid);
    }

    // generate public key
    const pubKey = await ssh.generateAndSaveKeys(uuid);

    // create node entry
    const nodeObj = node.obj.create(nodeReq.name, nodeReq.type);
    [err, redisRes] = await rclient.setObj(key, nodeObj);

    // add node entry to user's list
    [err, redisRes] = await rclient.addToSet(node.userNodesKeyFromReq(req), uuid);

    res.render("node/register", {
        id: uuid,
        pubKey: pubKey,
        regKey: nodeObj.regKey
    });
}));

router.put("/:id/revoke", errors.asyncWrap(async function(req, res, next) {
    // get requested node
    const nodeId = req.params.id;
    if (!node.nodeExists(nodeId)) {
        errors.error(404, "Node not found.");
    }

    // update node entry in DB
    const nodeObj = node.obj.revoke(nodeReq.sshUser);
    [err, redisRes] = await rclient.setObj(nodeKey, nodeObj);
    if (err) {
        errors.error(500, err);
    }

    res.status(200).send();
}));

module.exports = router;
