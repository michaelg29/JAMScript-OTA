
const crypto = require("crypto");
const net = require("net");

/**
 * Start a TCP listener socket.
 * @param {number} port The host port.
 * @param {(data: Buffer) => void} dataCallback Function to call when the server receives data.
 * @param {(sock: net.Socket, data: Buffer) => void} sockDataCallback Function to call when the server receives data.
 * @param {(sock: net.Socket) => void} sockConnectCallback Function to call when the client opens the connection.
 * @param {(sock: net.Socket)} sockCloseCallback Function to call when the client closes the connection.
 * @returns {net.Server} The server object.
 */
const startServer = function(port, dataCallback = undefined, sockDataCallback = undefined, sockConnectCallback = undefined, sockCloseCallback = undefined) {
    const server = net.createServer((sock) => {
        // Log when a client connnects.
        console.log(`${sock.remoteAddress}:${sock.remotePort} Connected`);
        if (sockConnectCallback) {
            sockConnectCallback(sock);
        }

        
        if (sockDataCallback) {
            sock.on("data", (data) => sockDataCallback(sock, data));
        }
        else if (dataCallback) {
            sock.on("data", dataCallback);
        }
        
        // Handle when client connection is closed
        sock.on("close", function() {
            if (sockCloseCallback) {
                sockCloseCallback(sock);
            }
            console.log(`${sock.remoteAddress}:${sock.remotePort} Connection closed`);
        });
        
        // Handle Client connection error.
        sock.on("error", function(error) {
            console.error(`${sock.remoteAddress}:${sock.remotePort} Connection Error ${error}`);
        });
    });
    
    server.listen(port, 16, () => {
        console.log("started", port);
    });

    return server;
};

/**
 * Start a TCP client socket.
 * @param {string} ip   The server IP to connect to.
 * @param {number} port The server port to connect to.
 * @param {() => void} startupFunction The function to call after connection.
 * @returns {net.Socket} The client object.
 */
const startClient = function(client, ip, port, startupFunction) {
    console.log("Attempting to connect to", ip, port);
    if (!client) {
        client = new net.Socket();
    }
    
    client.connect({
        host: ip,
        port: port,
    }, () => {
        console.log("Connection established.");
        startupFunction();
    });

    client.on("end", () => {
        console.log("Connection terminated.");
    })

    return client;
}

/**
 * Send a message to a socket.
 * @param {net.Socket} sock The client socket.
 * @param {number} status   The HTTP status of the response, undefined if a request.
 * @param {Buffer[]} data   The data.
 * @returns The number of bytes sent to the client.
 */
const sendMsg = function(sock, status, ...data) {
    let finalLength = !!status ? 2 : 0;
    for (let buf of data) {
        finalLength += buf.byteLength;
    }

    let array = new Uint8Array(finalLength);

    // write status as little endian
    let cursor = 0;
    if (!!status) {
        array[cursor] = (status >> 0) & 0xff;
        array[cursor + 1] = (status >> 8) & 0xff;
        cursor += 2;
    }

    // copy data
    for (let buf of data) {
        buf.copy(array, cursor);
        cursor += buf.byteLength;
    }

    // return
    console.log("Sending", array.length, "bytes");
    sock.write(array, "utf-8");
}

/**
 * Send an error message to a client.
 * @param {net.Socket} sock The client socket.
 * @param {object} error    Error object containing `statusCode` and `message`.
 */
const sendError = function(sock, error) {
    console.log("error", error);
    sendMsg(sock, error.statusCode || 500, Buffer.from(error.message || "Error"));
}

const aes_alg = "aes-256-cbc";

/**
 * Encrypt data then send a response to a socket using AES-256-CBC.
 * @param {net.Socket} sock The socket to transmit to.
 * @param {number} status   The HTTP status of the response.
 * @param {Buffer} key      The AES key.
 * @param {Buffer} data     The data.
 */
const encryptAndSend = function(sock, status, key, data) {
    // generate IV for encryption
    let ivBytes = crypto.randomBytes(16);

    // compute checksum
    let checksumBuf = Buffer.alloc(1);
    let checksum = 0;
    for (let i = 0; i < data.byteLength; ++i) {
        checksum ^= data.readUint8(i);
    }
    checksumBuf.writeUInt8(checksum, 0);

    // compute padding
    let paddedLength = data.byteLength + 2; // plaintext, checksum (1 byte), padding (>= 1 byte)
    paddedLength += paddedLength % 16 ? 16 - (paddedLength % 16) : 0;
    let padding = paddedLength - data.byteLength - 1;
    let paddingBuf = Buffer.alloc(padding);
    for (let i = 0; i < padding; ++i) {
        paddingBuf.writeUInt8(padding, i);
    }

    // encrypt the data
    console.log("Encrypting", data.byteLength, " bytes with checksum", checksumBuf.toString("hex"));
    let alg = crypto.createCipheriv(aes_alg, key, ivBytes);
    alg.setAutoPadding(false);
    let enc = alg.update(data, "utf-8", "hex");
    enc += alg.update(checksumBuf, "utf-8", "hex");
    enc += alg.update(paddingBuf, "utf-8", "hex");
    enc += alg.final("hex");

    sendMsg(sock, status, ivBytes, Buffer.from(enc, "hex"));
}

/**
 * Decrypt a received buffer using AES-256-CBC.
 * @param {Buffer} buf    The received data.
 * @param {Buffer} key    The AES key.
 * @param {number} cursor The starting offset of the encrypted data within the buffer.
 * @returns               The decrypted buffer without padding, undefined if invalid.
 */
const decryptMessage = function(buf, key, cursor = 0) {
    var ivBytes = buf.subarray(cursor, cursor + 16);
    cursor += 16;

    // decrypt buffer to hex string
    let alg = crypto.createDecipheriv(aes_alg, key, ivBytes);
    alg.setAutoPadding(false);
    let dec = alg.update(buf.subarray(cursor), "utf-8", "hex");
    dec += alg.final("hex");
    console.log("decrypted", dec);

    // calculate padding
    let decBuf = Buffer.from(dec, "hex");
    let padding = decBuf.readUInt8(decBuf.byteLength - 1);

    // verify checksum
    let plaintextLen = decBuf.byteLength - padding - 1;
    let expectedChecksum = decBuf.readUInt8(plaintextLen);
    let actualChecksum = 0;
    for (let i = 0; i < plaintextLen; ++i) {
        actualChecksum ^= decBuf.readUInt8(i);
    }
    if (actualChecksum != expectedChecksum) {
        return undefined;
    }

    return decBuf.subarray(0, plaintextLen);
}

module.exports = {
    startServer: startServer,
    startClient: startClient,
    sendMsg: sendMsg,
    sendError: sendError,
    encryptAndSend: encryptAndSend,
    decryptMessage: decryptMessage,
};
