const errors = require("./httperror");
const rclient = require("./redis-client");

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
const regKeyLen = 32;
const minRegKeySum = 14;
const maxRegKeySum = 100;

const nodeKey = (nodeId) => "node:" + nodeId;

const newRegKey = function() {
    var bytes = new Uint8Array(regKeyLen);

    let sum = 0;
    for (let i = 0; i < regKeyLen; ++i) {
        // compute next byte
        const curMod = sum % 256;
        let minRange = Math.max(((minRegKeySum - curMod + 256) % 256) - (regKeyLen - i - 1), 0);
        let maxRange = Math.min(((maxRegKeySum - curMod + 256) % 256) + (regKeyLen - i - 1), 255);
        if (minRange > maxRange) {
            maxRange = 255;
        }
        const val = Math.floor(Math.random() * (maxRange - minRange) + minRange);

        // store in key
        bytes[i] = val;
        sum += val;
    }

    return Buffer.from(bytes).toString("hex");
}

const validateRegKey = function(regKey) {
    // get byte array
    var bytes = Buffer.from(regKey, "hex");

    let sum = 0;
    for (const [idx, val] of bytes.entries()) {
        if (idx >= regKeyLen) {
            break;
        }
        sum += val;
    }

    sum = sum % 256;
    return sum >= minRegKeySum && sum <= maxRegKeySum;
}

const isExpired = function(nodeObj) {
    const lastRegisteredOn = Number.parseInt(nodeObj.lastRegisteredOn);
    return lastRegisteredOn !== 0 && lastRegisteredOn + registrationExpiry < Date.now();
};

const newNodeObj = function(name, type) {
    return {
        status: statuses.CREATED,
        name: name,
        type: type,
        regKey: newRegKey(),
        sshUser: "",
        ip: "",
        createdOn: Date.now(),
        lastRegisteredOn: 0,
        lastOnlineOn: 0,
    };
};

const refreshedNodeObj = function(sshUser) {
    return {
        status: statuses.OFFLINE,
        lastRegisteredOn: Date.now(),
        regKey: newRegKey(),
        sshUser: sshUser,
    };
};

const expiredNodeObj = function() {
    return {
        status: statuses.EXPIRED,
        regKey: "",
    };
};

const revokedNodeObj = function() {
    return {
        status: statuses.REVOKED,
        regKey: "",
    };
};

const onlineNodeObj = function(sshUser, ip) {
    return {
        status: statuses.ONLINE,
        sshUser: sshUser,
        ip: ip,
        lastOnlineOn: Date.now(),
    };
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

/**
 * Throw an error if the current status is not in the list of valid origins.
 * @param {*} nodeObj Node object with the field "status".
 * @param {*} targetStatus The requested updated status.
 * @param  {...any} validOrigins The list of valid origin statuses.
 */
const validateNodeTransition = function(nodeObj, targetStatus, ...validOrigins) {
    if (validOrigins.indexOf(nodeObj.status) === -1) {
        errors.error(403, `Cannot transition node from ${nodeObj.status} to ${targetStatus}.`);
    }
};

/**
 * Throw an error if the current status is invalid.
 * @param {object} nodeObj Node object with the field "status".
 * @param {string} targetStatus The requested updated status.
 * @param  {...string} invalidOrigins The list of invalid origins.
 */
const invalidateNodeTransition = function(nodeObj, targetStatus, ...invalidOrigins) {
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
    newRegKey: newRegKey,
    validateRegKey: validateRegKey,
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
    validateNodeTransition: validateNodeTransition,
    invalidateNodeTransition: invalidateNodeTransition,
    userNodesKey: (username) => "user:" + username + ":nodes",
    userNodesKeyFromReq: (req) => "user:" + req.user.username + ":nodes",
};
