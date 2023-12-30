
const fs = require("fs");

const errors = require("./httperror");
const node = require("./node");
const rclient = require("./redis-client");

const networkChannelKey = (networkId) => "network:" + networkId + ":channel";

/**
 * Create a channel for a network.
 * @param {string} networkId The network ID.
 * @param {Array} nodeIds The list of node IDs.
 */
const newChannelObj = async function(networkId, nodeIds) {
    const setKey = networkChannelKey(networkId);

    // delete existing channel
    await rclient.del(setKey);

    // add new node keys
    for (let nodeId of nodeIds) {
        await rclient.addToSet(setKey, nodeId);
    }
};

/**
 * Get the list of nodes on the channel.
 * @param {string} networkId The network ID.
 * @param {Array} nodeIds The list of node IDs.
 * @param {boolean} expandNodes Whether to fetch each node.
 * @param {boolean} filterOnline Whether to filter the channel list for online nodes only.
 * @returns List of filtered nodes in the channel.
 */
const getChannelNodes = async function(networkId, expandNodes = false, filterOnline = false) {
    // get nodes in the channel
    let [_, nodeIds] = await rclient.getSetMembers(networkChannelKey(networkId));

    if (expandNodes) {
        let retNodes = [];

        for (let nodeId of nodeIds) {
            let [nodeObj, _] = await node.getNode(nodeId);

            // add node to return list if not filtering or if online
            if (!filterOnline || nodeObj.status == node.statuses.ONLINE) {
                retNodes.push(nodeObj);
            }
        }

        return retNodes;
    }
    else {
        return nodeIds;
    }
}

const getChannelFiles = async function(networkId) {
    const dirName = `${process.env.CHANNELS_DIR}/${networkId}/files`;
    return fs.readdirSync(dirName);
}

module.exports = {
    newChannelObj: newChannelObj,
    getChannelNodes: getChannelNodes,
    getChannelFiles: getChannelFiles,
};
