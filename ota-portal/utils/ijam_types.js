const passphrases = require("./network_passphrase");

const nodeKeyLen = 32; // AES-256-CBC
const maxNetworkIdLength = 16;

// Node architectures
const node_arch_e = {
    NONE: "none",
    X86_UBUNTU: "x86_ubuntu",
    RPI_LINUX: "rpi_linux",
    WSL: "wsl",
    MACOS: "macos",
    ESP32: "esp_32",
};

// Node statuses
const node_status_e = {
    NONE: "none",
    CREATED: "created",
    OFFLINE: "offline",
    LOADING: "loading",
    ONLINE: "online",
    EXPIRED: "expired",
    REVOKED: "revoked",
};

// Node types
const node_type_e = {
    NONE: "none",
    DEVICE: "device",
    FOG: "fog",
    CLOUD: "cloud",
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
 * Read a UTF-8 string from a buffer which is terminated by the end of the buffer
 * or the zero terminator character.
 * @param {Buffer} buf      The buffer to read from.
 * @param {number} offset   The index to start reading from.
 * @returns The UTF-8 string.
 */
const getZeroTerminatedString = function(buf, offset = 0, maxLen = 0) {
    let end = buf.indexOf("\x00", offset);
    if (end == -1) end = buf.byteLength;
    if (maxLen != 0 && (end - offset) > maxLen) {
        end -= (end - offset) - maxLen;
    }
    return buf.toString("utf-8", offset, end);
};

/**
 * Encode an enum value using one-hot encoding.
 * @param {object} vals_e   The enum to encode from.
 * @param {string} val      The enum value to encode.
 * @returns                 The encoded number, 0 if not found.
 */
const oneHotEncoding = function(vals_e, val) {
    let encoded = 1;
    for (let e_val in vals_e) {
        if (e_val == val) {
            return encoded;
        }

        encoded <<= 1;
    }

    return 0;
}

/**
 * Decode a one-hot number by matching the index of the one to a dictionary.
 * @param {number} num      One-hot number to decode.
 * @param {number} n_bits   The number of bits to search through.
 * @param {object} vals_e   The enum type to decode to.
 * @param {string} def      The value to return if the encoding was incorrect.
 * @returns                 The decoded value.
 */
const decodeOneHotNumber = function(num, vals_e, def) {
    let ret = undefined;
    let one_idx = 0;
    let mask = 1;
    let n_bits = Object.values(vals_e).length;
    for (let e_val in vals_e) {
        if (one_idx >= n_bits) {
            break;
        }
        if ((num & mask) > 0) {
            if (!!ret) {
                return def;
            }
            ret = e_val;
        }

        one_idx++;
        mask <<= 1;
    }

    return ret || def;
};

/**
 * Parse a registration request.
 * @param {Buffer} buf Decrypted request buffer.
 * @returns The request.
 */
const parseRegisterRequest = function(buf) {
    // length = nodeId (uuid) + networkId (uuid) + networkRegKey + nodeKey + node type (int) + node arch (int)
    let regReqLen = 16 + maxNetworkIdLength + passphrases.maxPassphraseLength + nodeKeyLen + 4 + 4;
    if (buf.byteLength != regReqLen) {
        console.log("Received", buf.byteLength, "bytes, expected", regReqLen, "bytes");
        throw "Invalid length";
    }

    let cursor = 0;

    // read nodeId
    let nodeId = readUUID(buf, cursor);
    cursor += 16;

    // read networkId
    let networkId = getZeroTerminatedString(buf, cursor, maxNetworkIdLength);
    cursor += maxNetworkIdLength;

    // read networkRegKey
    let networkPassphrase = getZeroTerminatedString(buf, cursor, passphrases.maxPassphraseLength);
    cursor += passphrases.maxPassphraseLength;
    passphrases.validateNetworkPassphraseBuf(networkPassphrase);

    let nodeKey = buf.subarray(cursor, cursor + nodeKeyLen);
    cursor += nodeKeyLen;

    // read node type
    let nodeType = decodeOneHotNumber(buf.readInt32LE(cursor), node_type_e, node_type_e.NONE);
    if (nodeType == node_type_e.NONE) {
        throw "Invalid node type.";
    }
    cursor += 4;

    // read node architecture
    let nodeArch = decodeOneHotNumber(buf.readInt32LE(cursor), node_arch_e, node_arch_e.NONE);
    if (nodeType == node_arch_e.NONE) {
        throw "Invalid node architecture";
    }

    return {
        nodeId: nodeId,
        networkId: networkId,
        networkPassphrase: networkPassphrase,
        nodeKey: nodeKey,
        nodeType: nodeType,
        nodeArch: nodeArch,
    };
};

/**
 * Parse a status request.
 * @param {Buffer} buf Decrypted request buffer.
 * @returns The request.
 */
const parseNodeStatusRequest = function(buf) {
    let nodeStatus = decodeOneHotNumber(buf.readInt32LE(0), node_status_e, node_status_e.NONE);
    if (nodeStatus == node_status_e.NONE) {
        throw "Invalid node status.";
    }

    return {
        nodeStatus: nodeStatus,
    };
}

module.exports = {
    maxNetworkIdLength: maxNetworkIdLength,
    node: {
        architectures: node_arch_e,
        statuses: node_status_e,
        types: node_type_e,
    },
    emptyUUID: emptyUUID,
    createUUID: createUUID,
    readUUID: readUUID,
    parseRegisterRequest: parseRegisterRequest,
    parseNodeStatusRequest: parseNodeStatusRequest,
    oneHotEncoding: oneHotEncoding,
};
