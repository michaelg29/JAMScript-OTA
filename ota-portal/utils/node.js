const crypto = require("crypto");

const types = {
    DEVICE: "device",
    FOG: "fog",
    CLOUD: "cloud"
};

const statuses = {
    CREATED: "created",
    REGISTERED: "registered",
    EXPIRED: "expired",
    REVOKED: "revoked",
};

const registrationExpiry = 1000 * 60 * 60 * 24 * 90;
const regKeyLen = 32;
const minRegKeySum = 14;
const maxRegKeySum = 100;

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
}

const newNodeObj = function(name, type) {
    return {
        name: name,
        type: type,
        regKey: newRegKey(),
        sshUser: "",
        createdOn: Date.now(),
        lastRegisteredOn: 0,
        status: statuses.CREATED
    };
}

const refreshedNodeObj = function(sshUser) {
    return {
        lastRegisteredOn: Date.now(),
        status: statuses.REGISTERED,
        regKey: newRegKey(),
        sshUser: sshUser
    };
}

const expiredNodeObj = function() {
    return {
        status: statuses.EXPIRED,
        regKey: "",
    };
}

const revokedNodeObj = function() {
    return {
        status: statuses.REVOKED,
        regKey: ""
    }
}

module.exports = {
    nodeKey: (uuid) => "node:" + uuid,
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
    },
    userNodesKey: (username) => "user:" + username + ":nodes",
    userNodesKeyFromReq: (req) => "user:" + req.user.username + ":nodes",
};
