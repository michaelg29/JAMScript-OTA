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
#include <openssl/rsa.h>
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
#include "node_params.h"

#define BUF_SIZE 1024
#define KEY_SIZE 800

int sock;
struct sockaddr_in echoServAddr;

static unsigned char buffer[BUF_SIZE];
static unsigned char err[BUF_SIZE];
static unsigned char key[KEY_SIZE + 1];

/** Kill the program with a message. */
void closeMsg(const char *msg) {
    if (msg) {
        printf("%s\n", msg);
    }
    if (sock) {
        close(sock);
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
    for (int i = 0; i < n; ++i) {
        printf("%02x", buffer[i] & 0xff);
    }
    if (send(sock, buffer, n, 0) != n) {
        printf("Could not send %d bytes.\n", n);
        kill();
    }
    printf("\n");
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
        closeMsg("Could not connect to certificate server");
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

    close(sock);

    // =====================
    // === Register node ===
    // =====================

    // connect to registration server
    if ((sock = connectToListener(OTA_IP, OTA_REG_PORT)) < 0) {
        closeMsg("Could not connect to registration server");
    }

    // generate encryption IV
    srand(time(0));
    int encIV = rand();

    // construct request
    register_request_t node;
    node.magic = encIV;
    memset(node.nodeId.bytes, 0, UUID_SIZE);
    parseHex(NETWORK_ID, UUID_SIZE, node.networkId.bytes);
    parseHex(NETWORK_REG_KEY, REG_KEY_LEN, node.networkRegKey);
    node.nodeType = NODE_TYPE;

    // generate random node key
    for (int i = 0; i < NODE_KEY_LEN; ++i) {
        node.nodeKey[i] = rand() & 0xFF;
    }

    // encrypt and send
    unsigned char node_buf[REGISTER_REQUEST_T_SIZE];
    memcpy(node_buf, &node, REGISTER_REQUEST_T_SIZE);
    printf("Sending (%ld): ", REGISTER_REQUEST_T_SIZE);
    for (int i = 0; i < REGISTER_REQUEST_T_SIZE; ++i) {
        printf("%02x", node_buf[i] & 0xff);
    }
    printf("\n");
    int encLen = rsa_encrypt(node_buf, REGISTER_REQUEST_T_SIZE, buffer);
    sendBuffer(encLen);

    // receive encrypted buffer
    recvBytes = receiveBuffer();
    close(sock);

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
    int decBytes = aes_decrypt(buffer + cursor, recvBytes - cursor, dec, BUF_SIZE, node.nodeKey);
    printf("Decrypted %d bytes.\n", decBytes);
    for (int i = 0; i < decBytes; ++i) {
        printf("%02x", dec[i] & 0xff);
    }

    // check magic
    cursor = 16; // skip IV
    int retMagic = *((int*)(dec + cursor));
    cursor += 4;
    printf("Magic: expected %08x, received %08x\n", node.magic, retMagic);
    if (retMagic != node.magic) {
        closeMsg("Mismatched magic.");
    }

    // save UUID
    uuid_t uuid = *((uuid_t*)(dec + cursor));
    cursor += 16;
    printUUID(uuid);

    // close
    closeMsg("Connection closed.");
}
