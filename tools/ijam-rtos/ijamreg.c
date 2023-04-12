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

#define CERT_REQ_MAGIC 0x3f4d128c
#define BUF_SIZE 1024
#define KEY_SIZE 800
#define GUID_SIZE 16

int sock;
struct sockaddr_in echoServAddr;
unsigned short echoServPort = 8444;
char *servIP = "127.0.0.1";
static unsigned char buffer[BUF_SIZE];
static unsigned char err[BUF_SIZE];
static unsigned char key[KEY_SIZE + 1];

/** UUID structure (16 bytes). */
#define UUID_SIZE 16
typedef struct uuid {
    unsigned char bytes[UUID_SIZE];
} uuid_t;

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
    int encLen = encrypt(echoString, strlen(echoString));
    sendBuffer(encLen);

    // receive UUID
    recvBytes = receiveBuffer();
    if (recvBytes < GUID_SIZE) {
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
