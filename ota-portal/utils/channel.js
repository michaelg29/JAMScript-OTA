
const errors = require("./httperror");
const rclient = require("./redis-client");

const networkChannelKey = (networkId) => "network:" + networkId + ":channel";

/**
 * Create a channel for a network.
 * @param {string} networkId The network ID.
 * @param {Array} nodeIds The list of node IDs.
 */
const newChannelObj = async function(networkId, nodeIds) {
    const setKey = networkChannelKey(networkId);
    console.log(networkId, nodeIds);

    // delete existing channel
    await rclient.del(setKey);

    // add new node keys
    for (let nodeId of nodeIds) {
        await rclient.addToSet(setKey, nodeId);
    }
};

module.exports = {
    newChannelObj: newChannelObj
};
