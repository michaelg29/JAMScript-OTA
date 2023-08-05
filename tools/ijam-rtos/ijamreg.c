/**
 * Registration program for JAMScript nodes.
 */

/** Standard includes. */
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#include <time.h>

/** OpenSSL includes. */
#include <openssl/ossl_typ.h>
#include <openssl/rsa.h>
#include <openssl/bio.h>
#include <openssl/err.h>
#include <openssl/evp.h>
#include <openssl/x509.h>
#include <openssl/pem.h>
#include <openssl/bn.h>
#include <openssl/aes.h>

/** Socket includes. */
#include <sys/socket.h>
#include <arpa/inet.h>

/** IJAM includes. */
#include "ijam.h"
#include "ijam_util.h"

#define BUF_SIZE 1024
#define KEY_SIZE 800

int sock;

static unsigned char buffer[BUF_SIZE];
static unsigned char err[BUF_SIZE];
static unsigned char key[KEY_SIZE + 1];

//#define USE_DEFAULT_NET_CREDENTIALS
#define DEF_NETWORK_ID "network"
#define DEF_NETWORK_ID_LEN strlen(DEF_NETWORK_ID)
#define DEF_NETWORK_PHRASE "asdf"
#define DEF_NETWORK_PHRASE_LEN strlen(DEF_NETWORK_PHRASE)
#define DEF_NODE_TYPE 'd'

/** Kill the program with a message. */
void closeMsg(const char *msg) {
    if (msg) {
        printf("%s\n", msg);
    }
    if (sock) {
        closeSock(&sock);
    }
    exit(0);
}

/** Kill the program. */
void kill() {
    closeMsg(NULL);
}

/**
 * Encrypt message using RSA. The public encryption key
 * should already be in `key`. The output encrypted
 * message will be written to `out`.
 */
int rsa_encrypt(unsigned char *msg, int msg_len, unsigned char *out) {
    // initialize context
    RSA *rsa = NULL;
    BIO *keyBio = NULL;
    keyBio = BIO_new_mem_buf(key, -1);
    rsa = PEM_read_bio_RSA_PUBKEY(keyBio, &rsa, NULL, NULL);

    // encrypt
    int res = 0;
    if (rsa) {
        res = RSA_public_encrypt((int)msg_len, msg, out, rsa, RSA_PKCS1_OAEP_PADDING);
    }

    // print error
    ERR_load_crypto_strings();
    ERR_error_string(ERR_get_error(), err);
    fprintf(stderr, "Error: %s\n", err);
    return res;
}

/** Send `buffer` to the socket. */
int sendBuffer(int n) {
    if (send(sock, buffer, n, 0) != n) {
        printf("Could not send %d bytes.\n", n);
        kill();
    }
    return n;
}

/** Recieve data in `buffer`. */
int receiveBuffer() {
    int bytesRecv = recv(sock, buffer, BUF_SIZE - 1, 0);
    buffer[bytesRecv] = 0;
    printf("Recevied %d\n", bytesRecv);
    return bytesRecv;
}

int main(int argc, char *argv[]) {
    // ===============================
    // === Retrieve RSA public key ===
    // ===============================

    // connect to certificate server
    if ((sock = connectToListener(OTA_IP, OTA_CERT_PORT)) < 0) {
        closeMsg("Could not connect to certificate server.");
    }

    // send hello
    ((int*)buffer)[0] = CERT_REQ_MAGIC;
    sendBuffer(4);

    // receive certificate (expecting 800 bytes)
    int recvBytes = receiveBuffer();
    if (recvBytes < KEY_SIZE) {
       closeMsg("Incorrect key response.");
    }
    memcpy(key, buffer, KEY_SIZE);
    key[KEY_SIZE] = 0;

    closeSock(&sock);

    // =====================
    // === Register node ===
    // =====================

    // connect to registration server
    if ((sock = connectToListener(OTA_IP, OTA_REG_PORT)) < 0) {
        closeMsg("Could not connect to registration server");
    }

    srand(time(0));

    // try to read existing node information
    node_info_t node;
    register_request_t reg_req;
    int bytes_read = read_node_info(&node);
    if (!bytes_read) {
        // initialize node information
        memset(reg_req.nodeId.bytes, 0, UUID_SIZE);
        reg_req.nodeType = DEVICE;
    }
    else {
        // copy existing node information
        memcpy(reg_req.nodeId.bytes, node.nodeId.bytes, UUID_SIZE);
        reg_req.nodeType = node.nodeType;
    }

    reg_req.nodeArch = NODE_ARCH;

    // set network credentials
#ifdef USE_DEFAULT_NET_CREDENTIALS
    memcpy(reg_req.networkId, DEF_NETWORK_ID, DEF_NETWORK_ID_LEN);
    memcpy(reg_req.networkPhrase, DEF_NETWORK_PHRASE, DEF_NETWORK_PHRASE_LEN);
    reg_req.nodeType = DEF_NODE_TYPE;
#else
    printf("Network ID> ");
    get_console_input(reg_req.networkId, MAX_NET_ID_LEN);
    printf("Network passphrase> ");
    get_console_input(reg_req.networkPhrase, MAX_NET_PHRASE_LEN);
    printf("Node type (d|f|c)> ");
    get_console_input((unsigned char*)&reg_req.nodeType, 4);
#endif
    
    // set node type
    switch ((char)reg_req.nodeType) {
        case 'c': reg_req.nodeType = CLOUD; break;
        case 'f': reg_req.nodeType = FOG; break;
        default:  reg_req.nodeType = DEVICE; break;
    }

    // generate random node key
    for (int i = 0; i < NODE_KEY_LEN; ++i) {
        reg_req.nodeKey[i] = rand() & 0xFF;
    }

    // encrypt and send
    unsigned char node_buf[REGISTER_REQUEST_T_SIZE];
    memcpy(node_buf, &reg_req, REGISTER_REQUEST_T_SIZE);
    printf("Sending (%d): ", REGISTER_REQUEST_T_SIZE);
    for (int i = 0; i < REGISTER_REQUEST_T_SIZE; ++i) {
        printf("%02x", node_buf[i] & 0xff);
    }
    printf("\n");
    int encLen = rsa_encrypt(node_buf, REGISTER_REQUEST_T_SIZE, buffer);
    sendBuffer(encLen);

    // receive encrypted buffer
    recvBytes = receiveBuffer();
    closeSock(&sock);

    // ========================
    // === Process response ===
    // ========================

    if (!recvBytes) {
        closeMsg("Nothing received\n");
    }

#ifdef IJAM_DEBUG
    printf("\n");
    for (int i = 0; i < recvBytes; ++i) {
        printf("%02x", buffer[i] & 0xff);
    }
    printf("\n");
#endif

    int cursor = 0;

    // read status
    short status = *((short*)buffer + cursor);
    cursor += 2;
    printf("Status: %d\n", status);
    if (status != 200) {
        printf("Error: %s\n", buffer + cursor);
        kill();
    }

    // decrypt
    unsigned char *dec = err; // re-name error buffer
    int decBytes = aes_decrypt(buffer + cursor, recvBytes - cursor, dec, BUF_SIZE, reg_req.nodeKey);
    printf("Decrypted %d bytes.\n", decBytes);
    for (int i = 0; i < decBytes; ++i) {
        printf("%02x", dec[i] & 0xff);
    }
    printf("\n");

    // save node information
    memcpy(node.nodeId.bytes, dec + 16, UUID_SIZE); // skip IV
    memcpy(node.networkId, reg_req.networkId, MAX_NET_ID_LEN);
    memcpy(node.nodeKey, reg_req.nodeKey, NODE_KEY_LEN);
    node.nodeType = reg_req.nodeType;
    printUUID(node.nodeId);
    save_node_info(&node);

    // close
    closeMsg("Connection closed.");
}
