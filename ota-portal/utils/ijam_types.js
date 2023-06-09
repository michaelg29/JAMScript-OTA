
const keys = require("./keys");

const nodeKeyLen = 32; // AES-256-CBC

// Node types
const node_type_e = {
    DEVICE: "device",
    FOG: "fog",
    CLOUD: "cloud"
};

// Node statuses
const node_status_e = {
    CREATED: "created",
    OFFLINE: "offline",
    LOADING: "loading",
    ONLINE: "online",
    EXPIRED: "expired",
    REVOKED: "revoked",
};

const emptyUUID = "00000000-0000-0000-0000-000000000000";

/**
 * Generate a random UUID.
 * @param {string} delimeter The delimeter to insert into the UUID.
 * @returns The UUID.
 */
const createUUID = function(delimeter = '-') {
    return `xxxxxxxx${delimeter}xxxx${delimeter}4xxx${delimeter}yxxx${delimeter}xxxxxxxxxxxx`.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
};

/**
 * Read a UUID from bytes.
 * @param {Buffer} bytes     The bytes containing the UUID.
 * @param {number} offset    The start location of the UUID.
 * @param {string} delimeter The delimeter to insert into the UUID.
 */
const readUUID = function(bytes, offset = 0, delimeter = '-') {
    return bytes.subarray(offset + 0, offset + 4).toString("hex") + delimeter +
        bytes.subarray(offset + 4, offset + 6).toString("hex") + delimeter +
        bytes.subarray(offset + 6, offset + 8).toString("hex") + delimeter +
        bytes.subarray(offset + 8, offset + 10).toString("hex") + delimeter +
        bytes.subarray(offset + 10, offset + 16).toString("hex");
};

/**
 * Parse a registration request.
 * @param {Buffer} buf Decrypted request buffer.
 * @returns The request.
 */
const parseRegisterRequest = function(buf) {
    // length = nodeId (uuid) + networkId (uuid) + networkRegKey + nodeKey + node type (int) + checksum (int)
    let regReqLen = 16 + 16 + keys.regKeyLen + nodeKeyLen + 4 + 4;
    if (buf.byteLength != regReqLen) {
        console.log(buf.byteLength, regReqLen);
        throw "Invalid length";
    }

    let cursor = 0;

    // read nodeId
    let nodeId = readUUID(buf, cursor);
    cursor += 16;

    // read networkId
    let networkId = readUUID(buf, cursor);
    cursor += 16

    // read networkRegKey
    let networkRegKey = buf.subarray(cursor, cursor + keys.regKeyLen);
    cursor += keys.regKeyLen;
    if (!keys.validateKeyBuf(networkRegKey)) {
        throw "Invalid key.";
    }

    let nodeKey = buf.subarray(cursor, cursor + nodeKeyLen);
    cursor += nodeKeyLen;

    // read node type
    let nodeTypeInt = buf.readInt32LE(cursor);
    let nodeType;
    switch(nodeTypeInt) {
        case 0b100:
            nodeType = node_type_e.CLOUD;
            break;
        case 0b010:
            nodeType = node_type_e.FOG;
            break;
        default: // case 0b001
            nodeType = node_type_e.DEVICE;
            break;
    }

    return {
        nodeId: nodeId,
        networkId: networkId,
        networkRegKey: networkRegKey.toString("hex"),
        nodeKey: nodeKey,
        nodeType: nodeType,
    };
};

/**
 * Parse a status request.
 * @param {Buffer} buf Decrypted request buffer.
 * @returns The request.
 */
const parseNodeStatusRequest = function(buf) {
    let nodeStatusInt = buf.readInt32LE(0);
    let nodeStatus;
    switch (nodeStatusInt) {
        case 0b100:
            nodeStatus = node_status_e.OFFLINE;
            break;
        case 0b010:
            nodeStatus = node_status_e.LOADING;
            break;
        default: // case 0b001
            nodeStatus = node_status_e.ONLINE;
            break;
    }

    return {
        nodeStatus: nodeStatus,
    };
}

module.exports = {
    node: {
        types: node_type_e,
        statuses: node_status_e,
    },
    emptyUUID: emptyUUID,
    createUUID: createUUID,
    readUUID: readUUID,
    parseRegisterRequest: parseRegisterRequest,
    parseNodeStatusRequest: parseNodeStatusRequest,
};
