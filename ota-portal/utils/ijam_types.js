
const keys = require("./keys");

const node_types = {
    DEVICE: "device",
    FOG: "fog",
    CLOUD: "cloud"
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
 * @param {Buffer} bytes The bytes representing the UUID.
 * @param {string} delimeter The delimeter to insert into the UUID.
 */
const readUUID = function(bytes, delimeter = '-') {
    let uuidStr = bytes.toString("hex");

    return uuidStr.substring(0, 8) + delimeter +
        uuidStr.substring(8, 12) + delimeter +
        uuidStr.substring(12, 16) + delimeter +
        uuidStr.substring(16, 20) + delimeter +
        uuidStr.substring(20);
};

/**
 * Parse a registration request.
 * @param {Buffer} buf Decrypted request buffer.
 * @returns The request.
 */
const parseRegisterRequest = function(buf) {
    // length = magic (int) + nodeId (uuid) + networkId (uuid) + networkRegKey + node type (int)
    let regReqLen = 4 + 16 + 16 + keys.regKeyLen + 4;
    if (buf.byteLength != regReqLen) {
        return "Invalid length";
    }

    // read nodeId
    let cursor = 4;
    let nodeId = readUUID(buf.subarray(cursor, cursor + 16));

    // read networkId
    cursor += 16;
    let networkId = readUUID(buf.subarray(cursor, cursor + 16));

    // read networkRegKey
    cursor += 16
    let networkRegKey = buf.subarray(cursor, cursor + keys.regKeyLen);
    if (!keys.validateKeyBuf(networkRegKey)) {
        return "Invalid key.";
    }

    // read node type
    let nodeTypeInt = buf.readInt32LE(regReqLen - 4);
    let nodeType;
    switch(nodeTypeInt) {
        case 0b100:
            nodeType = node_types.CLOUD;
            break;
        case 0b010:
            nodeType = node_types.FOG;
            break;
        default: // case 0b001
            nodeType = node_types.DEVICE;
            break;
    }

    return {
        magic: buf.readInt32LE(0),
        nodeId: nodeId,
        networkId: networkId,
        key: networkRegKey.toString("hex"),
        nodeType: nodeType,
    };
};

module.exports = {
    node: {
        types: node_types
    },
    emptyUUID: emptyUUID,
    createUUID: createUUID,
    readUUID: readUUID,
    parseRegisterRequest: parseRegisterRequest,
};