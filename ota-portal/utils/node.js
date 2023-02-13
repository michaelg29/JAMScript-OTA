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

const newRegKey = () => crypto.randomBytes(32).toString("hex");

const isExpired= function(nodeObj) {
    const lastRegisteredOn = Number.parseInt(nodeObj.lastRegisteredOn);
    return lastRegisteredOn !== 0 && lastRegisteredOn + registrationExpiry < Date.now();
}

const newNodeObj = function(name, type, username) {
    return {
        name: name,
        type: type,
        mac: "",
        pubKey: "",
        regKey: newRegKey(),
        user_username: username,
        lastRegisteredOn: 0,
        status: statuses.CREATED
    };
}

const refreshedNodeObj = function(mac, pubKey) {
    return {
        mac: mac,
        pubKey: pubKey,
        lastRegisteredOn: Date.now(),
        status: statuses.REGISTERED,
        regKey: newRegKey()
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
        pubKey: "",
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
