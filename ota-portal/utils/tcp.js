
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
 * Send a registration response to the client.
 * @param {net.Socket} sock The client socket.
 * @param {number} status   The HTTP status of the response.
 * @param {Buffer[]} data   The data.
 * @returns The number of bytes sent to the client.
 */
const sendResponse = function(sock, status, ...data) {
    let finalLength = 2;
    for (let buf of data) {
        finalLength += buf.byteLength;
    }

    let array = new Uint8Array(finalLength);

    // write status as little endian
    array[0] = (status >> 0) & 0xff;
    array[1] = (status >> 8) & 0xff;

    // copy data
    let cursor = 2;
    for (let buf of data) {
        console.log(cursor, buf.toString("hex"));
        buf.copy(array, cursor);
        cursor += buf.byteLength;
    }

    // return
    console.log("Sending", array.length, "bytes");
    sock.write(array, "utf-8");
}

module.exports = {
    startServer: startServer,
    sendResponse: sendResponse,
};
