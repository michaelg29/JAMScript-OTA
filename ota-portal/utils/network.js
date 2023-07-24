const errors = require("./httperror");
const rclient = require("./redis-client");
const passphrases = require("./network_passphrase");

/** Get the network key. */
const networkKey = (networkId) => "network:" + networkId;

/** Get the key mapping to the user's network list. */
const userNetworksKeyFromReq = (req) => "user:" + req.user.username + ":networks";

/** Get the key mapping to the network's active passphrases. */
const networkPassphrasesKey = (networkId) => "network:" + networkId + ":passphrases";
const networkPassphraseNamesKey = (networkId) => "network:" + networkId + ":passphraseNames";

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

/**
 * Clear all passphrases.
 * @param {string} netId The network ID.
 */
const clearPassphrases = async function(netId) {
    await rclient.del(networkPassphraseNamesKey(netId));
    await rclient.del(networkPassphrasesKey(netId));
}

/**
 * Add a single-use passphrase for a node to use to register with the network.
 * @param {string} netId The network ID to add the key to.
 * @param {string} nodeName The name of the node that will be registered with this key.
 * @param {string} passphrase Passphrase for the node to use in registration.
 */
const addNetworkPassphrase = async function(netId, nodeName, passphrase) {
    passphrases.validateNetworkPassphrase(passphrase);

    // add passphrase to set
    await rclient.addToSet(networkPassphrasesKey(netId), passphrase);

    // set associated name
    let obj = {};
    obj[passphrase] = nodeName;
    await rclient.setObjOrThrow(networkPassphraseNamesKey(netId), obj);
}

/**
 * Check that a passphrase matches the network then delete it.
 * @param {string} netId The network ID.
 * @param {string} passphrase The passphrase to check.
 * @returns [Network object, the name of the node matching the passphrase].
 */
const matchNetworkPassphrase = async function(netId, passphrase) {
    passphrases.validateNetworkPassphrase(passphrase);

    if (await rclient.isInSet(networkPassphrasesKey(netId), passphrase)) {
        let [err, redisRes] = await rclient.getObjField(networkPassphraseNamesKey(netId), passphrase);
        if (!err && !!redisRes) {
            // delete from database
            await rclient.removeFromSet(networkPassphrasesKey(netId), passphrase);
            await rclient.delObjField(networkPassphraseNamesKey(netId), passphrase);
            let nodeName = redisRes;
            [redisRes, _] = await getNetwork(netId);

            // return node name
            return [redisRes, nodeName];
        }
    }

    errors.error(401, "Invalid passphrase.");
}

/**
 * Get the number of passphrases for a network.
 * @param {string} netId Network ID.
 * @returns The number of valid passphrases for the network.
 */
const getNumberOfPassphrases = async function(netId) {
    return await rclient.getSetSize(networkPassphrasesKey(netId));
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
    clearPassphrases: clearPassphrases,
    addNetworkPassphrase: addNetworkPassphrase,
    matchNetworkPassphrase: matchNetworkPassphrase,
    getNumberOfPassphrases: getNumberOfPassphrases
};
