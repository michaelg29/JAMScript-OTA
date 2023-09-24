
#include "ijam_util.h"

/** Standard includes. */
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

/** OpenSSL includes. */
#include <openssl/aes.h>

/** Socket includes. */
#include <sys/types.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netdb.h>

int NODE_ARCH = N_ARCH_WSL;

void closeSock(int *sock) {
    if (sock && *sock) {
        close(*sock);
        *sock = 0;
    }
}

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

int createListenerSocket(short port, const char *port_str) {
    int serv_sock;
    struct addrinfo hints, *servinfo, *p;

    memset(&hints, 0, sizeof(hints));
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;
    hints.ai_flags = AI_PASSIVE;

    // get possible bind points
    if (getaddrinfo(NULL, port_str, &hints, &servinfo) != 0) {
        printf("getaddrinfo error");
        return -1;
    }

    // try and bind to each result
    for (p = servinfo; p != NULL; p = p->ai_next) {
        // create socket
        if ((serv_sock = socket(p->ai_family, p->ai_socktype, p->ai_protocol)) == -1) {
            printf("socket error\n");
            continue;
        }

        // setsockopt
        int optval;
        if (setsockopt(serv_sock, SOL_SOCKET, SO_REUSEADDR, &optval, sizeof(optval)) != 0) {
            printf("setsockopt error\n");
            return -1;
        }

        // bind
        if (bind(serv_sock, p->ai_addr, p->ai_addrlen) == -1) {
            close(serv_sock);
            printf("server bind error\n");
            continue;
        }

        break;
    }

    printf("%d\n", serv_sock);

    if (listen(serv_sock, 10) == -1) {
        close(serv_sock);
        printf("listen error");
        return -1;
    }

    return serv_sock;
}

int aes_encrypt(unsigned char *plaintext, int len, int maxInLen, unsigned char *enc, int maxOutLen, unsigned char *key) {
    // pad length to allow for a complete final block
    int paddedLength = len + 2; // plaintext, checksum (1 byte), padding (>= 1 byte)
    paddedLength += paddedLength % 16 ? 16 - (paddedLength % 16) : 0;

    // validate input and output sizes
    if (len <= 0 || paddedLength > maxOutLen || paddedLength > maxInLen) return 0;

    // add padding
    int padding = paddedLength - len - 1;
    if (len < paddedLength) {
        memset(plaintext + len + 1, padding, padding);
    }

    // compute checksum
    plaintext[len] = 0;
    for (int i = 16; i < len; ++i) {
        plaintext[len] ^= plaintext[i];
    }

    // initialize key structure
    AES_KEY aesKey;
    if (AES_set_encrypt_key(key, 256, &aesKey)) {
        return -1;
    }

#ifdef IJAM_DEBUG
    printf("\nIV:\n");
    for (int i = 0; i < 16; ++i) {
        printf("%02x", plaintext[i] & 0xff);
    }

    printf("\nPlaintext:\n");
    for (int i = 16; i < paddedLength; ++i) {
        printf("%02x", plaintext[i] & 0xff);
    }
#endif

    // encrypt
    AES_cbc_encrypt(plaintext, enc, (size_t)paddedLength, &aesKey, plaintext, AES_ENCRYPT);

#ifdef IJAM_DEBUG
    printf("\nCiphertext:\n");
    for (int i = 0; i < len; ++i) {
        printf("%02x", enc[i] & 0xff);
    }
    printf("\n");
#endif

    return paddedLength;
}

int aes_decrypt(unsigned char *enc, int len, unsigned char *dec, int maxOutLen, unsigned char *key) {
    // validate input length
    if (len <= 0 || len % 16 || len > maxOutLen) return 0;

    // initialize key structure
    AES_KEY aesKey;
    if (AES_set_decrypt_key(key, 256, &aesKey)) {
        return -1;
    }

#ifdef IJAM_DEBUG
    printf("\nIV:\n");
    for (int i = 0; i < 16; ++i) {
        printf("%02x", enc[i] & 0xff);
    }

    printf("\nCiphertext:\n");
    for (int i = 16; i < len; ++i) {
        printf("%02x", enc[i] & 0xff);
    }
    printf("\n");
#endif

    AES_cbc_encrypt(enc, dec, (size_t)len, &aesKey, enc, AES_DECRYPT);

    // account for padding
    int checksumIdx = len - dec[len - 1] - 1;
    unsigned char expectedChecksum = dec[checksumIdx];
    printf("%02x padding => checksum at idx %d (value of %02x)", dec[len - 1], checksumIdx, expectedChecksum);

#ifdef IJAM_DEBUG
    printf("\nPlaintext:\n");
    for (int i = 0; i < len; ++i) {
        printf("%02x", dec[i] & 0xff);
    }
    printf("\n");
#endif

    // compute checksum
    unsigned char actualChecksum = 0;
    for (int i = 16; i < checksumIdx; ++i) {
        actualChecksum ^= dec[i];
    }
    if (actualChecksum != expectedChecksum) {
        return 0;
    }

    return checksumIdx;
}

unsigned int calc_checksum(node_info_t *node_info) {
    unsigned int *buf = (int*)node_info;
    unsigned int checksum = 0;
    for (int i = 0; i < (NODE_INFO_T_SIZE >> 2) - 1; ++i) {
        checksum ^= buf[i];
    }
    return checksum;
}

int save_node_info(node_info_t *node_info) {
    int n = 0;
    FILE *fp = fopen(".env", "wb");
    if (fp) {
        node_info->checksum = calc_checksum(node_info);

        n = fwrite(node_info, 1, NODE_INFO_T_SIZE, fp);

        fclose(fp);
    }

    return n;
}

int read_node_info(node_info_t *node_info) {
    int n = 0;
    FILE *fp = fopen(".env", "rb");
    if (fp) {
        n = fread(node_info, 1, NODE_INFO_T_SIZE, fp);

        // If data not read or checksum not valid, clear memory
        if (!(n == NODE_INFO_T_SIZE &&
            calc_checksum(node_info) == node_info->checksum)) {
            n = 0;
            memset(node_info, 0, NODE_INFO_T_SIZE);
        }

        fclose(fp);
    }

    return n;
}

bool clear_jxe() {
    FILE *fp = fopen("prog.jxe.bkp", "wb");
    if (fp) {
        fclose(fp);
        return true;
    }

    return false;
}

int save_jxe(unsigned char *buffer, int outCursor, int size) {
    int n = 0;
    FILE *fp = fopen("prog.jxe.bkp", "ab");
    if (fp) {
        fseek(fp, outCursor, SEEK_SET);
        n = fwrite(buffer, (size_t)1, (size_t)size, fp);
        fclose(fp);
    }

    return n;
}

int get_console_input(unsigned char *buffer, int maxSize) {
    int curInputSize = 0;

    fgets(buffer, maxSize, stdin);
    for (int i = 0; i < maxSize; ++i) {
        if (buffer[i] < 32 || buffer[i] > 126) {
            buffer[i] = 0;
            curInputSize = i;
            break;
        }
    }

    return curInputSize;
}
