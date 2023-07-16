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

#define BUF_SIZE 1024
#define MAX_INVALID_MSG_COUNTER 16

int clientSock;
int servSock;
int connectedClientSock;

struct sockaddr_in serv_addr;
struct sockaddr_in client_addr;
socklen_t addr_size;

register_request_t node;
static unsigned char buffer[BUF_SIZE];
static unsigned char buffer2[BUF_SIZE];
static unsigned char err[BUF_SIZE];

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

void updateStatus(node_status_e status) {
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

    int decSize = STATUS_REQUEST_T_SIZE;
    memcpy(buffer2 + 16, &req, STATUS_REQUEST_T_SIZE);

    // encrypt and send
    int encBytes = aes_encrypt(buffer2, 16 + decSize, BUF_SIZE, buffer + UUID_SIZE, BUF_SIZE - UUID_SIZE - 16, node.nodeKey);
    printf("%d %d\n", encBytes, decSize);
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
}

void createListener(int port) {
    // create socket
    if ((servSock = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP)) < 0) {
        closeMsg("Could not create listener socket.");
    }

    printf("Server socket created.\n");

    // bind socket
    memset(&serv_addr, 0, sizeof(serv_addr));
    serv_addr.sin_family = PF_INET;
    serv_addr.sin_port = htons(port);
    serv_addr.sin_addr.s_addr = htonl(INADDR_ANY);
    addr_size = sizeof(serv_addr);
    if ((bind(servSock, (struct sockaddr *)&serv_addr, addr_size)) < 0) {
        closeMsg("Could not bind listener socket.");
    }

    printf("Server socket bound.\n");

    // listen on port
    if (listen(servSock, 10) == -1) {
        closeMsg("Could not start listener.");
    }

    printf("Server socket listening on port %d.", port);
}

void sendStatus(int sock, short status) {
    printf("Sending status %d.\n", status);
    ((short*)buffer)[0] = status;
    sendBuffer(sock, (int)sizeof(short));
}

static void sigIntHandler(int sig) {
    //updateStatus(offline);
    closeMsg("Interrupted.");
}

int main(int argc, char *argv[]) {
    int recvBytes, decBytes;

    if (signal(SIGINT, sigIntHandler) == SIG_ERR) {
        closeMsg("Error! Could not bind the signal handlers\n");
    }

    // try to read existing node information
    int bytes_read = read_reg_info(&node);
    if (!bytes_read) {
        closeMsg("Node information not saved.");
    }

    // ===========================
    // === Send online request ===
    // ===========================

    updateStatus(OFFLINE);
    updateStatus(ONLINE);

    // ======================
    // === Start listener ===
    // ======================

    if ((servSock = createListenerSocket(OTA_ONLINE_PORT, STR(OTA_ONLINE_PORT))) < 0) {
        closeMsg("Could not create listener socket.\n");
    }

    bool loading = false;
    int invalidMsgCounter = 0;
    int fileSize, fileCursor;

    while (true) {
        printf("Listening on port %d for a connection.\n", OTA_ONLINE_PORT);

        if ((connectedClientSock = accept(servSock, (struct sockaddr *)&client_addr, &addr_size)) < 0) {
            closeMsg("Could not accept a connection.\n");
        }

        printf("Connection accepted from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));

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

            if (!decBytes) {
                invalidMsgCounter++;
                if (invalidMsgCounter >= MAX_INVALID_MSG_COUNTER) {
                    sendStatus(connectedClientSock, 302);
                }

                // send error
                printf("Invalid message %d.", invalidMsgCounter);
                SEND_STATUS(400);
            }
            else {
                invalidMsgCounter = 0;
            }

            if (!loading) {
                // get file size
                fileSize = ((int*)(buffer2 + cursor))[0];
                fileCursor = 0;
                printf("Clearing JXE\n\n\n");
                clear_jxe();
                printf("Updating status to LOADING\n\n\n");
                updateStatus(LOADING);

                loading = true;
                printf("Prepared to load program of size %d\n", fileSize);
            }
            else {
                // write bytes into file
                printf("Received %d bytes, writing to file at %d.\n", decBytes, fileCursor);
                if (fileCursor >= fileSize || ((int*)(buffer2 + cursor))[0] == 0) {
                    printf("Received all bytes.\n");
                    SEND_STATUS(200);
                    break;
                }
                else {
                    int n = save_jxe(buffer2 + cursor, fileCursor, decBytes - cursor);
                    if (n) {
                        fileCursor += n;
                        printf("Wrote %d bytes, cursor at %d.\n", n, fileCursor);
                    }
                    else {
                        printf("Could not write.");
                        SEND_STATUS(500);
                    }
                }
            }

            SEND_STATUS(200);
        }

        closeSock(&connectedClientSock);
    }

    // ============================
    // === Send offline request ===
    // ============================

    updateStatus(OFFLINE);

    // close
    closeMsg("Connection closed.");
}
