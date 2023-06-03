
#include "ijam_util.h"

#include <sys/socket.h>
#include <arpa/inet.h>
#include <string.h>
#include <unistd.h>

#include <openssl/aes.h>
#include <stdio.h>

void printUUID(uuid_t uuid) {
    for (int i = 0; i < UUID_SIZE; ++i) {
        printf("%02X", uuid.bytes[i]);
        if (i == 3 || i == 5 || i == 7 || i == 9) {
            printf("-");
        }
    }
    printf("\n");
}

void parseHex(char *hexStr, int numBytes, unsigned char *bytes) {
    int strIdx = 0;
    int bytesIdx = 0;

    bool byteStarted = false;
    unsigned char byte = 0x00;
    int strLen = numBytes << 1;
    while (strIdx < strLen) {
        char halfByte = hexStr[strIdx++];
        if (halfByte >= 'A' && halfByte <= 'F') {
            // capital letter
            halfByte = halfByte - 'A' + 10;
        }
        else if (halfByte >= 'a' && halfByte <= 'f') {
            // lowercase letter
            halfByte = halfByte - 'a' + 10;
        }
        else if (halfByte >= '0' && halfByte <= '9') {
            // number
            halfByte = halfByte - '0';
        }
        else {
            // ignore others
            continue;
        }

        if (byteStarted) {
            bytes[bytesIdx++] = (byte << 4) | (halfByte & 0x0F);
            byte = 0x00;
            byteStarted = false;
        }
        else {
            byte = halfByte & 0x0F;
            byteStarted = true;
        }
    }
}

int connectToListener(const char *ip, short port) {
    // create socket
    int sock;
    if ((sock = socket(PF_INET, SOCK_STREAM, IPPROTO_TCP)) < 0)
    {
        return -1;
    }

    // construct address
    struct sockaddr_in servAddr;
    memset(&servAddr, 0, sizeof(servAddr));
    servAddr.sin_family = AF_INET;
    servAddr.sin_addr.s_addr = inet_addr(ip);
    servAddr.sin_port = htons(port);

    // connect
    if (connect(sock, (struct sockaddr *)&servAddr, sizeof(servAddr)) < 0)
    {
        return -1;
    }

    return sock;
}

/**
 * Encrypt with AES-256-CBC.
 * @param in The input bytes, with the first 16 bytes being the IV.
 * @param len The length of the input data with the IV.
 * @param out The output buffer.
 * @param maxOutLen The allocated length of the output buffer.
 * @param iv The initialization vector.
 * @param key The encryption key (32 bytes).
 * @return The length of the encrypted message.
 */
int aes_encrypt(unsigned char *in, int len, unsigned char *out, int maxOutLen, unsigned char *key) {
    AES_KEY aesKey;

    if (len <= 16) return 0;

    // initialize key structure
    if (AES_set_encrypt_key(key, 256, &aesKey)) {
        return -1;
    }

    printf("\nIV:\n");
    for (int i = 0; i < 16; ++i) {
        printf("%02x", in[i] & 0xff);
    }

    printf("\nPlaintext:\n");
    for (int i = 16; i < len; ++i) {
        printf("%02x", in[i] & 0xff);
    }

    AES_cbc_encrypt(in, out, (size_t)len, &aesKey, in, AES_ENCRYPT);

    printf("\nCiphertext:\n");
    for (int i = 0; i < len; ++i) {
        printf("%02x", out[i] & 0xff);
    }

    printf("\n");

    return len;
}

/**
 * Decrypt with AES-256-CBC.
 * @param in The encrypted bytes, with the first 16 bytes being the IV.
 * @param len The length of the encrypted data with the IV.
 * @param out The output buffer.
 * @param maxOutLen The allocated length of the output buffer.
 * @param iv The initialization vector.
 * @param key The encryption key (32 bytes).
 * @return The length of the decrypted message.
 */
int aes_decrypt(unsigned char *in, int len, unsigned char *out, int maxOutLen, unsigned char *key) {
    AES_KEY aesKey;

    if (!len) return 0;

    // initialize key structure
    if (AES_set_decrypt_key(key, 256, &aesKey)) {
        return -1;
    }

    printf("\nIV:\n");
    for (int i = 0; i < 16; ++i) {
        printf("%02x", in[i] & 0xff);
    }

    printf("\nCiphertext:\n");
    for (int i = 16; i < len; ++i) {
        printf("%02x", in[i] & 0xff);
    }

    AES_cbc_encrypt(in, out, (size_t)len, &aesKey, in, AES_DECRYPT);

    printf("\nPlaintext:\n");
    for (int i = 0; i < len; ++i) {
        printf("%02x", out[i] & 0xff);
    }

    printf("\n");

    return len;
}
