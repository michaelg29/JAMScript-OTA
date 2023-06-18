const errors = require("./httperror");
const rclient = require("./redis-client");
const keys = require("./keys");

const networkKey = (networkId) => "network:" + networkId;

/**
 * Create a new network object.
 * @param {string} id Guid of the network.
 * @param {string} username Username of the requesting user.
 * @param {string} name Name of the network.
 * @returns The created network object.
 */
const newNetworkObj = async function(id, username, name) {
    const networkObj = {
        name: name,
        regKey: keys.generateKey(),
        createdOn: Date.now(),
        username: username,
    };

    [err, redisRes] = await rclient.setObj(networkKey(id), networkObj);
    if (err) {
        errors.error(500, err);
    }

    return networkObj;
};

/**
 * Get the network from the database. Throw an error if it does not exist.
 * @param {string} networkId Guid of the network.
 * @returns [network object, network key mapping to the object in the database].
 */
const getNetwork = async function(networkId) {
    const key = networkKey(networkId);
    [err, redisRes] = await rclient.getObj(key);
    if (err || !redisRes) {
        errors.error(404, "Network not found.");
    }

    return [redisRes, key];
};

/**
 * Determine if the network exists.
 * @param {string} netId guid of the node.
 * @returns The network key if the network exists, false otherwise.
 */
const networkExists = async function(netId) {
    const key = networkKey(netId);
    [err, redisRes] = await rclient.execute("keys", [key]);

    return (!redisRes || redisRes.length === 0)
        ? false
        : key;
}

const userNetworksKeyFromReq = (req) => "user:" + req.user.username + ":networks";

/**
 * Throw an error if the requested network does not belong to the requesting user.
 * @param {object} req The request object.
 * @param {string} netId Guid of the network.
 */
const belongsToOwner = async function(req, netId) {
    const userNetsKey = userNetworksKeyFromReq(req);
    [err, redisRes] = await rclient.isInSet(userNetsKey, netId);
    if (err || redisRes == 0) {
        errors.error(404, "Network not found.");
    }
}

/**
 * Get the network from the database. Throw an error if it does not exist or if it does not belong to the user.
 * @param {object} req The request object.
 * @param {string} netId Guid of the network.
 * @returns [network object, network key mapping to the object in the database].
 */
const getNetworkFromOwner = async function(req, netId) {
    belongsToOwner(req, netId);
    return await getNetwork(netId);
}

module.exports = {
    networkKey: networkKey,
    obj: {
        create: newNetworkObj
    },
    getNetwork: getNetwork,
    networkExists: networkExists,
    belongsToOwner: belongsToOwner,
    getNetworkFromOwner: getNetworkFromOwner,
    userNetworksKeyFromReq: userNetworksKeyFromReq,
};
