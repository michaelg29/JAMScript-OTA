
#include <stdlib.h>
#include <stdio.h>
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

#include <sys/socket.h>
#include <arpa/inet.h>
#include <string.h>
#include <unistd.h>
#include <time.h>

#include "ijam.h"
#include "ijam_util.h"

#define CERT_REQ_MAGIC 0x8c124d3f
#define BUF_SIZE 1024
#define KEY_SIZE 800

#define NETWORK_ID "42906910de7b452d94b8fe6d572c0f48"
#define NETWORK_REG_KEY "a76ca6bab2f5c570d6eaccb05857aa0775f9cdd65cf9e8efedf717df41f4f2fe"
#define NODE_TYPE device

int sock;
struct sockaddr_in echoServAddr;
unsigned short certServerPort = 8444;
unsigned short regServerPort = 8445;
char *servIP = "127.0.0.1";
static unsigned char buffer[BUF_SIZE];
static unsigned char err[BUF_SIZE];
static unsigned char key[KEY_SIZE + 1];

/** Kill the program. */
void closeMsg(const char *msg) {
    if (msg) {
        printf("%s\n", msg);
    }
    if (sock) {
        close(sock);
    }
    exit(0);
}

void kill() {
    closeMsg(NULL);
}

/**
 * Encrypt message using RSA. The public encryption key
 * should already be in `key`. The output encrypted
 * message will be written to `buffer`.
 */
int encrypt(unsigned char *msg, int msg_len) {
    // initialize context
    RSA *rsa = NULL;
    BIO *keyBio = NULL;
    keyBio = BIO_new_mem_buf(key, -1);
    rsa = PEM_read_bio_RSA_PUBKEY(keyBio, &rsa, NULL, NULL);

    // encrypt
    int res = 0;
    if (rsa) {
        res = RSA_public_encrypt((int)msg_len, msg, buffer, rsa, RSA_PKCS1_OAEP_PADDING);
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
    if ((sock = connectToListener(servIP, certServerPort)) < 0) {
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
    if ((sock = connectToListener(servIP, regServerPort)) < 0) {
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
    unsigned char buf[REGISTER_REQUEST_T_SIZE];
    memcpy(buf, &node, REGISTER_REQUEST_T_SIZE);
    printf("Sending (%ld): ", REGISTER_REQUEST_T_SIZE);
    for (int i = 0; i < REGISTER_REQUEST_T_SIZE; ++i) {
        printf("%02x", buf[i] & 0xff);
    }
    printf("\n");
    int encLen = encrypt(buf, REGISTER_REQUEST_T_SIZE);
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

    printf("\n");
    for (int i = 0; i < recvBytes; ++i) {
        printf("%02x", buffer[i] & 0xff);
    }
    printf("\n");

    // read status
    short status = *((short*)buffer);
    printf("Status: %d\n", status);
    if (status != 200) {
        printf("Error: %s\n", buffer + 2);
        kill();
    }

    // decrypt
    printf("Decrypted %d bytes.\n", aes_decrypt(buffer + 2, recvBytes - 2, buf, REGISTER_REQUEST_T_SIZE, node.nodeKey));
    for (int i = 0; i < recvBytes - 2; ++i) {
        printf("%02x", buf[i] & 0xff);
    }

    // check magic
    int retMagic = *((int*)(buf + 16));
    printf("Magic: expected %08x, received %08x\n", node.magic, retMagic);
    if (retMagic != node.magic) {
        closeMsg("Mismatched magic.");
    }

    // save UUID
    uuid_t uuid = *((uuid_t*)(buf + 16 + 4));
    printUUID(uuid);

    // close
    closeMsg("Connection closed.");
}
