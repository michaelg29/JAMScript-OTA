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

int main(int argc, char *argv[]) {
    // try to read existing node information
    register_request_t node;
    int bytes_read = read_reg_info(&node);
    if (!bytes_read) {
        closeMsg("Node information not saved.");
    }
    
    // ===========================
    // === Send online request ===
    // ===========================

    // connect to status server
    if ((clientSock = connectToListener(OTA_IP, OTA_STAT_PORT)) < 0) {
        closeMsg("Could not connect to status server.");
    }

    // send request
    memcpy(buffer, node.nodeId.bytes, UUID_SIZE);

    // generate random IV
    srand(time(0));
    printf("\nIV:\n");
    for (int i = 0; i < 16; ++i) {
        buffer2[i] = rand() & 0xFF; // put random byte in IV for encryption
        buffer[i + UUID_SIZE] = buffer2[i]; // put random byte to send to server
        printf("%02x", buffer2[i] & 0xff);
    }
    printf("\n");

    // construct message
    const char *helloStr = "Hello, servers bro!";
    int decSize = strlen(helloStr) + 1;
    memcpy(buffer2 + 16, helloStr, decSize);

    // encrypt and send
    int encBytes = aes_encrypt(buffer2, 16 + decSize, BUF_SIZE, buffer + UUID_SIZE, BUF_SIZE - UUID_SIZE - 16, node.nodeKey);
    printf("%d %d\n", encBytes, decSize);
    printf("\nCiphertext:\n");
    for (int i = 0; i < UUID_SIZE + encBytes; ++i) {
        printf("%02x", buffer[i] & 0xff);
    }
    printf("\n");
    sendBuffer(clientSock, encBytes + UUID_SIZE);

    // close connection
    closeSock(&clientSock);

    // ======================
    // === Start listener ===
    // ======================

    // ============================
    // === Send offline request ===
    // ============================

    // close
    closeMsg("Connection closed.");
}
