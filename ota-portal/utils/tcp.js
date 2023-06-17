
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

module.exports = {
    startServer: startServer
};
