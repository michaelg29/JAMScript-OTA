/**
 * Main program for JAMScript nodes.
 */

/** Standard includes. */
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <time.h>
#include <signal.h>

/** OpenSSL includes. */
#include <openssl/ossl_typ.h>
#include <openssl/bio.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <openssl/bn.h>
#include <openssl/aes.h>

/** Socket includes. */
#include <sys/socket.h>
#include <arpa/inet.h>

/** IJAM includes. */
#include "ijam.h"
#include "ijam_util.h"

/** Sockets and addresses. */
int clientSock;
int servSock;
int connectedClientSock;
struct sockaddr_in serv_addr;
struct sockaddr_in client_addr;
socklen_t addr_size;

/** Node state. */
#define MAX_INVALID_MSG_COUNTER 16
bool stayOnline;
int invalidMsgCounter;
int fileSize, fileCursor;
node_info_t node;

/** Message buffers. */
#define BUF_SIZE 1024
int recvBytes, decBytes;
static unsigned char buffer[BUF_SIZE];
static unsigned char buffer2[BUF_SIZE];
static unsigned char err[BUF_SIZE];
int *int_buf;

/** Kill the program with a message. */
void closeMsg(const char *msg) {
    if (msg) {
        printf("%s\n", msg);
    }
    closeSock(&clientSock);
    closeSock(&connectedClientSock);
    closeSock(&servSock);
    exit(0);
}

/** Send `buffer` to the socket. */
int sendBuffer(int sock, int n) {
    if (send(sock, buffer, n, 0) != n) {
        printf("Could not send %d bytes.\n", n);
        closeMsg(NULL);
    }
    return n;
}

/** Recieve data in `buffer`. */
int receiveBuffer(int sock) {
    int bytesRecv = recv(sock, buffer, BUF_SIZE - 1, 0);
    buffer[bytesRecv] = 0;
    printf("Recevied %d\n", bytesRecv);
    return bytesRecv;
}

/** Update a node status with the state server. */
void updateStatus(node_status_e status) {
    if (node.nodeStatus == status) {
        printf("Node already at this status. No transition needed.\n");
        return;
    }

    // connect to status server
    if ((clientSock = connectToListener(OTA_IP, OTA_STAT_PORT)) < 0) {
        closeMsg("Could not connect to status server.");
    }

    // construct request
    memcpy(buffer, node.nodeId.bytes, UUID_SIZE);

    // generate random IV
    srand(time(0));
    for (int i = 0; i < 16; ++i) {
        buffer2[i] = rand() & 0xFF; // put random byte in IV for encryption
        buffer[i + UUID_SIZE] = buffer2[i]; // put random byte to send to server
    }

    // construct message
    status_request_t req;
    req.nodeStatus = status;
    memcpy(buffer2 + 16, &req, STATUS_REQUEST_T_SIZE);

    // encrypt and send
    int encBytes = aes_encrypt(buffer2, 16 + STATUS_REQUEST_T_SIZE, BUF_SIZE, buffer + UUID_SIZE, BUF_SIZE - UUID_SIZE - 16, node.nodeKey);
    printf("\nCiphertext:\n");
    for (int i = 0; i < UUID_SIZE + encBytes; ++i) {
        printf("%02x", buffer[i] & 0xff);
    }
    printf("\n");
    sendBuffer(clientSock, encBytes + UUID_SIZE);

    // validate response
    int recvBytes = receiveBuffer(clientSock);
    int cursor = 0;

    // read status
    short retStatus = *((short*)buffer + cursor);
    cursor += 2;
    printf("Status: %d\n", retStatus);
    if (retStatus != 200) {
        printf("Error: %s\n", buffer + cursor);
        closeMsg(NULL);
    }

    // close connection
    closeSock(&clientSock);

    // update local state
    node.nodeStatus = status;
}

/** Reply with a 2-byte request status code. */
void sendStatus(int sock, short status) {
    printf("Sending status %d.\n", status);
    ((short*)buffer)[0] = status;
    sendBuffer(sock, (int)sizeof(short));
}

/** Ctrl+C handler. */
static void sigIntHandler(int sig) {
    updateStatus(N_STATUS_OFFLINE);
    closeMsg("Interrupted.");
}

/** Main function. */
int main(int argc, char *argv[]) {

    // ===============
    // === Startup ===
    // ===============

    // bind handler to send offline when program ends
    if (signal(SIGINT, sigIntHandler) == SIG_ERR) {
        closeMsg("Error! Could not bind the signal handlers\n");
    }

    // try to read existing node information
    int bytes_read = read_node_info(&node);
    if (!bytes_read) {
        closeMsg("Node information not saved.");
    }

    // initial state
    stayOnline = true;
    invalidMsgCounter = 0;

    // ===========================
    // === Send online request ===
    // ===========================

    updateStatus(N_STATUS_OFFLINE);
    updateStatus(N_STATUS_ONLINE);

    // ======================
    // === Start listener ===
    // ======================

    if ((servSock = createListenerSocket(STR(OTA_ONLINE_PORT))) < 0) {
        closeMsg("Could not create listener socket.\n");
    }

    // =================
    // === Main loop ===
    // =================

    while (stayOnline) {
        printf("Listening on port %d for a connection.\n", OTA_ONLINE_PORT);

        if ((connectedClientSock = accept(servSock, (struct sockaddr *)&client_addr, &addr_size)) < 0) {
            closeMsg("Could not accept a connection.\n");
        }

        printf("Connection accepted from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));

        // ===========================
        // === Data reception loop ===
        // ===========================

        while (true) {
#define SEND_STATUS(status) sendStatus(connectedClientSock, status); continue;
            // receive encrypted buffer
            recvBytes = receiveBuffer(connectedClientSock);
            if (!recvBytes) {
                break;
            }

            printf("\n\n\nReceived %d bytes.\n", recvBytes);

            // decrypt request
            decBytes = aes_decrypt(buffer, recvBytes, buffer2, BUF_SIZE, node.nodeKey);
            int cursor = 16; // skip IV
            printf("Decrypted %d bytes.\n", decBytes);

            // handle subsequent invalid transfers
            if (!decBytes) {
                invalidMsgCounter++;
                if (invalidMsgCounter >= MAX_INVALID_MSG_COUNTER) {
                    sendStatus(connectedClientSock, 302);
                    break;
                }

                // send error
                printf("Invalid message %d.", invalidMsgCounter);
                SEND_STATUS(400);
            }
            else {
                invalidMsgCounter = 0;
            }

            // read request as integers
            int_buf = (int*)(buffer2 + cursor);

            // current state logic
            if (node.nodeStatus == N_STATUS_LOADING) {
                printf("Received %d bytes, writing to file at %d.\n", decBytes, fileCursor);
                if (fileCursor >= fileSize || int_buf[0] == 0) {
                    // received all data
                    printf("Received all bytes.\n");
                    SEND_STATUS(200);
                    updateStatus(N_STATUS_ONLINE);
                    break;
                }
                else {
                    // write bytes into file
                    int n = save_jxe(buffer2 + cursor, fileCursor, decBytes - cursor);
                    if (n) {
                        fileCursor += n;
                        printf("Wrote %d bytes, cursor at %d.\n", n, fileCursor);
                        SEND_STATUS(200);
                    }
                    else {
                        printf("Could not write.");
                        SEND_STATUS(500);
                    }
                }

                continue;
            }

            // get requested status
            request_type_e reqStatus = (request_type_e)int_buf[0];
            bool doLoad = reqStatus == R_TYPE_FILE || reqStatus == R_TYPE_CMD;
            printf("reqStatus %d\n", reqStatus);

            // next state logic
            if (reqStatus == R_TYPE_PING) {
                // health check
                printf("Ping\n\n");
            }
            else if (doLoad && node.nodeStatus != N_STATUS_LOADING) {
                // initialize loading state machine
                fileSize = int_buf[1];
                fileCursor = 0;
                clear_jxe();

                // register new status with control center
                updateStatus(N_STATUS_LOADING);

                printf("Prepared to load program of size %d\n", fileSize);
            }
            else if (reqStatus == R_TYPE_REVOKE) {
                // server requested
                stayOnline = false;
                node.nodeStatus = N_STATUS_REVOKED;
                printf("Revoke\n");
            }
            else {
                printf("Bad request\n");
                SEND_STATUS(400);
            }

            SEND_STATUS(200);
        }
#undef SEND_STATUS
        closeSock(&connectedClientSock);
    }

    // =========================
    // === Voluntary cleanup ===
    // =========================
    if (node.nodeStatus == N_STATUS_ONLINE) {
        updateStatus(N_STATUS_OFFLINE);
    }

    // ========================
    // === Required cleanup ===
    // ========================
    closeMsg("Connection closed.");
    save_node_info(&node);
}
