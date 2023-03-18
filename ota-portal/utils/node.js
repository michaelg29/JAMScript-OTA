const errors = require("./httperror");
const rclient = require("./redis-client");
const keys = require("./keys");

const types = {
    DEVICE: "device",
    FOG: "fog",
    CLOUD: "cloud"
};

const statuses = {
    CREATED: "created",
    OFFLINE: "offline",
    ONLINE: "online",
    EXPIRED: "expired",
    REVOKED: "revoked",
};

const registrationExpiry = 1000 * 60 * 60 * 24 * 90;

const nodeKey = (nodeId) => "node:" + nodeId;

const isExpired = function(nodeObj) {
    const lastRegisteredOn = Number.parseInt(nodeObj.lastRegisteredOn);
    return lastRegisteredOn !== 0 && lastRegisteredOn + registrationExpiry < Date.now();
};

/**
 * Create a new node object and store in the database.
 * @param {string} id Guid of the node.
 * @param {string} name Name.
 * @param {string} type Type of the node, selected from `types`.
 * @returns The created node object.
 */
const newNodeObj = async function(id, name, type) {
    const nodeObj = {
        status: statuses.CREATED,
        name: name,
        type: type,
        devKey: keys.generateKey(),
        sshUser: "",
        ip: "",
        createdOn: Date.now(),
        lastRegisteredOn: 0,
        lastOnlineOn: 0,
    };

    [err, redisRes] = await rclient.setObj(nodeKey(id), nodeObj);
    if (err) {
        errors.error(500, err);
    }

    return nodeObj;
};

/**
 * Update the node object to be offline with a new registration key.
 * @param {string} id Guid of the node.
 * @param {string} sshUser User to SSH into the node with.
 * @returns The node object with the updated fields.
 */
const refreshedNodeObj = async function(id, sshUser) {
    const nodeObj = {
        status: statuses.OFFLINE,
        lastRegisteredOn: Date.now(),
        regKey: keys.generateKey(),
        sshUser: sshUser,
    };

    [err, redisRes] = await rclient.setObj(nodeKey(id), nodeObj);
    if (err) {
        errors.error(500, err);
    }

    return nodeObj;
};

/**
 * Update the node object to be expired.
 * @param {string} id Guid of the node.
 * @returns The node object with the updated fields.
 */
const expiredNodeObj = async function(id) {
    const nodeObj = {
        status: statuses.EXPIRED,
        regKey: "",
    };

    [err, redisRes] = await rclient.setObj(nodeKey(id), nodeObj);
    if (err) {
        errors.error(500, err);
    }
};

/**
 * Update the node object to be revoked and clear the registration key.
 * @param {string} id Guid of the node.
 * @returns The node object with the updated fields.
 */
const revokedNodeObj = async function(id) {
    const nodeObj = {
        status: statuses.REVOKED,
        regKey: "",
    };

    [err, redisRes] = await rclient.setObj(nodeKey(id), nodeObj);
    if (err) {
        errors.error(500, err);
    }
};

/**
 * Update the node object to be online.
 * @param {string} id Guid of the node.
 * @param {string} sshUser User to SSH into the node with.
 * @param {string} ip The active IP address of the node.
 * @returns The node object with the updated fields.
 */
const onlineNodeObj = async function(id, sshUser, ip) {
    const nodeObj = {
        status: statuses.ONLINE,
        sshUser: sshUser,
        ip: ip,
        lastOnlineOn: Date.now(),
    };

    [err, redisRes] = await rclient.setObj(nodeKey(id), nodeObj);
    if (err) {
        errors.error(500, err);
    }
};

/**
 * Get the node from the database. Throw an error if it does not exist.
 * @param {string} nodeId Guid of the node.
 * @returns [node object, node key mapping to the object in the database].
 */
const getNode = async function(nodeId) {
    const key = nodeKey(nodeId);
    [err, redisRes] = await rclient.getObj(key);
    if (err || !redisRes) {
        errors.error(404, "Node not found.");
    }

    return [redisRes, key];
};

/**
 * Determine if the node exists.
 * @param {string} nodeId guid of the node.
 * @returns The node key if the node exists, false otherwise.
 */
const nodeExists = async function(nodeId) {
    const key = nodeKey(nodeId);
    [err, redisRes] = await rclient.execute("keys", [key]);

    return (!redisRes || redisRes.length === 0)
        ? key
        : false;
}

const userNodesKeyFromReq = (req) => "user:" + req.user.username + ":nodes";

/**
 * Throw an error if the requested node does not belong to the requesting user.
 * @param {object} req The request object.
 * @param {string} nodeId Guid of the node.
 */
const belongsToOwner = async function(req, nodeId) {
    const userNodesKey = userNodesKeyFromReq(req);
    [err, redisRes] = await rclient.isInSet(userNodesKey, nodeId);
    if (err || redisRes === 0) {
        errors.error(404, "Node not found.");
    }
}

/**
 * Get the node from the database. Throw an error if it does not exist or if it does not belong to the user.
 * @param {object} req The request object.
 * @param {string} nodeId Guid of the node.
 * @returns [node object, node key mapping to the object in the database].
 */
const getNodeFromOwner = async function(req, nodeId) {
    belongsToOwner(req, nodeId);
    return await getNode(nodeId);
}

/**
 * Throw an error if the current status is not in the list of valid origins.
 * @param {object} nodeObj Node object with the field "status".
 * @param {string} targetStatus The requested updated status.
 * @param  {string[]} validOrigins The list of valid origin statuses.
 */
const validateNodeTransition = function(nodeObj, targetStatus, validOrigins) {
    if (validOrigins.indexOf(nodeObj.status) === -1) {
        errors.error(403, `Cannot transition node from ${nodeObj.status} to ${targetStatus}.`);
    }
};

/**
 * Throw an error if the current status is invalid.
 * @param {object} nodeObj Node object with the field "status".
 * @param {string} targetStatus The requested updated status.
 * @param  {string[]} invalidOrigins The list of invalid origins.
 */
const invalidateNodeTransition = function(nodeObj, targetStatus, invalidOrigins) {
    if (invalidOrigins.indexOf(nodeObj.status) !== -1) {
        errors.error(403, `Cannot transition node from ${nodeObj.status} to ${targetStatus}.`);
    }
}

module.exports = {
    nodeKey: nodeKey,
    types: types,
    typesList: Object.values(types).join(", "),
    validType: (type) => Object.values(types).includes(type),
    statuses: statuses,
    registrationExpiry: registrationExpiry,
    isExpired: isExpired,
    obj: {
        create: newNodeObj,
        refresh: refreshedNodeObj,
        expire: expiredNodeObj,
        revoke: revokedNodeObj,
        online: onlineNodeObj,
    },
    getNode: getNode,
    nodeExists: nodeExists,
    belongsToOwner: belongsToOwner,
    getNodeFromOwner: getNodeFromOwner,
    validateNodeTransition: validateNodeTransition,
    invalidateNodeTransition: invalidateNodeTransition,
    userNodesKey: (username) => "user:" + username + ":nodes",
    userNodesKeyFromReq: userNodesKeyFromReq,
};
