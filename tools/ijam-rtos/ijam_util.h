
#ifndef __IJAM_UTIL_H
#define __IJAM_UTIL_H

#include "ijam.h"

/**
 * Print a UUID in standard format (i.e. 4ccbc31d-58aa-4b32-8c51-db075b08ec9f).
 * @param uuid The UUID to print.
 */
void printUUID(uuid_t uuid);

/**
 * Parse a hex string into bytes.
 * @param hexStr    The string of hexadecimal digits.
 * @param numBytes  The expected number of bytes to read, or size of `bytes`.
 * @param bytes     The buffer to write the parsed bytes to.
 */
void parseHex(char *hexStr, int numBytes, unsigned char *bytes);

/**
 * Connect to a TCP listener.
 * @param ip    The IP address of the listener.
 * @param port  The port of the listener.
 * @returns     The file descriptor (fd) for the created socket, -1 if not created.
 */
int connectToListener(const char *ip, short port);

/**
 * Encrypt a message using AES-256-CBC.
 * @param plaintext The plaintext message with the IV as the first 16 bytes.
 * @param len       The length of the message plus 16 bytes for the IV.
 * @param enc       The output buffer for the encrypted message and the IV as the first 16 bytes.
 * @param maxOutLen The maximum length of the output buffer.
 * @param key       The 32-byte key to use for encryption.
 * @returns         The size of the encrypted message.
 */
int aes_encrypt(unsigned char *plaintext, int len, unsigned char *enc, int maxOutLen, unsigned char *key);

/**
 * Decrypt a message using AES-256-CBC.
 * @param enc       The encrypted data with the IV as the first 16 bytes.
 * @param len       The length of the encrypted data plus 16 bytes for the IV.
 * @param dec       The output buffer for the decrypted message and the IV as the first 16 bytes.
 * @param maxOutLen The maximum length of the output buffer.
 * @param key       The 32-byte key to use for encryption.
 * @returns         The size of the decrypted message.
 */
int aes_decrypt(unsigned char *enc, int len, unsigned char *dec, int maxOutLen, unsigned char *key);

#endif // __IJAM_UTIL_H
