
#ifndef IJAM_UTIL_H
#define IJAM_UTIL_H

#include "ijam.h"

void printUUID(uuid_t uuid);
void parseHex(char *hexStr, int numBytes, unsigned char *bytes);

int connectToListener(const char *ip, short port);

int aes_encrypt(unsigned char *in, int len, unsigned char *out, int maxOutLen, unsigned char *key);
int aes_decrypt(unsigned char *in, int len, unsigned char *out, int maxOutLen, unsigned char *key);

#endif // IJAM_UTIL_H
