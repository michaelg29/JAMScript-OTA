
const rclient = require("./redis-client");

const maxPassphraseLength = 16;

/** Get the key mapping to the network's active passphrases. */
const networkPassphrasesKey = (networkId) => "network:" + networkId + ":passphrases";
const networkPassphraseNamesKey = (networkId) => "network:" + networkId + ":passphraseNames";

/**
 * Check the passphrase is only alphanumeric characters.
 * @param {string} passphrase The passphrase to validate.
 */
const validateNetworkPassphrase = function(passphrase) {
    if (passphrase.length > maxPassphraseLength) errors.error(400, "Passphrase must be less than 16 characters.");

    if (passphrase.match(/[^a-zA-Z0-9]/gm)) errors.error(400, "Passphrase can only contain alphanumeric characters.");
}

/**
 * Check the passphrase is only alphanumeric characters.
 * @param {Buffer} passphrase The passphrase to validate.
 */
const validateNetworkPassphraseBuf = function(buf) {
    validateNetworkPassphrase(buf.toString("utf-8"));
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
    validateNetworkPassphrase(passphrase);

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
    validateNetworkPassphrase(passphrase);

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
    maxPassphraseLength: maxPassphraseLength,
    validateNetworkPassphrase: validateNetworkPassphrase,
    validateNetworkPassphraseBuf: validateNetworkPassphraseBuf,
    clearPassphrases: clearPassphrases,
    addNetworkPassphrase: addNetworkPassphrase,
    matchNetworkPassphrase: matchNetworkPassphrase,
    getNumberOfPassphrases: getNumberOfPassphrases
}
