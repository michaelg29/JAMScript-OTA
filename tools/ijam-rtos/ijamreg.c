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

#include <sys/socket.h>
#include <arpa/inet.h>
#include <string.h>
#include <unistd.h>

#include "ijam.h"

#define CERT_REQ_MAGIC 0x3f4d128c
#define BUF_SIZE 1024
#define KEY_SIZE 800

int sock;
struct sockaddr_in echoServAddr;
unsigned short echoServPort = 8444;
char *servIP = "127.0.0.1";
static unsigned char buffer[BUF_SIZE];
static unsigned char err[BUF_SIZE];
static unsigned char key[KEY_SIZE + 1];

/** Kill the program. */
void closeMsg(char *message)
{
    printf("%s\n", message);
    exit(0);
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
    if (send(sock, buffer, n, 0) != n) {
        closeMsg("Could not send buffer\n");
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
    char *echoString = "Hello, world!";

    // create socket
    if ((sock = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP)) < 0)
    {
        closeMsg("socket() failed");
    }

    // construct address
    memset(&echoServAddr, 0, sizeof(echoServAddr));
    echoServAddr.sin_family = AF_INET;
    echoServAddr.sin_addr.s_addr = inet_addr(servIP);
    echoServAddr.sin_port = htons(echoServPort);

    // connect
    if (connect(sock, (struct sockaddr *)&echoServAddr, sizeof(echoServAddr)) < 0)
    {
        closeMsg("connect() failed");
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
    printf("%d\n%s\n", recvBytes, buffer);
    key[KEY_SIZE] = 0;

    // send encrypted message (512 bytes)
    register_request_t node = {
        1234,
        {{ 0xfa, 0x9e, 0x7d, 0x38, 0x6c, 0xf1, 0x41, 0x8f, 0x85, 0x91, 0xa0, 0x8a, 0x57, 0x9c, 0xd8, 0x8d }},
        {{ 0xc2, 0x50, 0x1f, 0x96, 0x18, 0x6c, 0x4a, 0x9e, 0x99, 0xb0, 0x59, 0xc7, 0xe3, 0x31, 0x82, 0x0d }},
        { 0x4a, 0xc8, 0xd3, 0x9b, 0x6a, 0x24, 0x1c, 0xcb, 0x48, 0xb8, 0x7f, 0xfa, 0xd0, 0xf4, 0xf6, 0xf8, 0xf4, 0xf6, 0x23, 0xf2 },
        device
    };
    unsigned char buf[REGISTER_REQUEST_T_SIZE];
    memcpy(buf, &node, REGISTER_REQUEST_T_SIZE);
    printf("Sending: ");
    for (int i = 0; i < REGISTER_REQUEST_T_SIZE; ++i) {
        printf("%02x", buf[i] & 0xff);
    }
    printf("\n");
    int encLen = encrypt(buf, REGISTER_REQUEST_T_SIZE);
    sendBuffer(encLen);

    // receive UUID
    recvBytes = receiveBuffer();
    if (recvBytes < UUID_SIZE) {
        closeMsg("Incorrect GUID response.");
    }
    uuid_t *uuid = (uuid_t*)buffer;
    for (int i = 0; i < UUID_SIZE; ++i) {
        printf("%02X", uuid->bytes[i]);
        if (i == 3 || i == 5 || i == 7 || i == 9) {
            printf("-");
        }
    }
    printf("\n");

    closeMsg("Connection closed");

    // close
    printf("\n");
    close(sock);
}
