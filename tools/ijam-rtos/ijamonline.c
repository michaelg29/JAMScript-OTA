/**
 * Main program for JAMScript nodes.
 */

/** Standard includes. */
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <time.h>

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

int clientSock;
int servSock;

register_request_t node;
static unsigned char buffer[BUF_SIZE];
static unsigned char buffer2[BUF_SIZE];
static unsigned char err[BUF_SIZE];

/** Kill the program with a message. */
void closeMsg(const char *msg) {
    if (msg) {
        printf("%s\n", msg);
    }
    if (clientSock > 0) {
        close(clientSock);
    }
    if (servSock > 0) {
        close(servSock);
    }
    exit(0);
}

/** Kill the program. */
void kill() {
    closeMsg(NULL);
}

/** Send `buffer` to the socket. */
int sendBuffer(int sock, int n) {
    if (send(sock, buffer, n, 0) != n) {
        printf("Could not send %d bytes.\n", n);
        kill();
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
    int decSize = 1;
    buffer2[16] = status & 0xff;

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
        kill();
    }

    // close connection
    closeSock(&clientSock);
}

int main(int argc, char *argv[]) {
    // try to read existing node information
    int bytes_read = read_reg_info(&node);
    if (!bytes_read) {
        closeMsg("Node information not saved.");
    }

    // ===========================
    // === Send online request ===
    // ===========================

    updateStatus(online);

    // ======================
    // === Start listener ===
    // ======================

    // ============================
    // === Send offline request ===
    // ============================

    updateStatus(offline);

    // close
    closeMsg("Connection closed.");
}
