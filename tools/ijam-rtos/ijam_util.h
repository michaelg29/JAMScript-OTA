
#ifndef __IJAM_UTIL_H
#define __IJAM_UTIL_H

#include "ijam.h"

extern int NODE_ARCH;

/**
 * Close a socket and reset the variable.
 * @param sock      The pointer to the socket variable.
 */
void closeSock(int *sock);

/**
 * Print a UUID in standard format (i.e. 4ccbc31d-58aa-4b32-8c51-db075b08ec9f).
 * @param uuid      The UUID to print.
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
 * @param ip        The IP address of the listener.
 * @param port      The port of the listener.
 * @returns         The file descriptor (fd) for the created socket, -1 if not created.
 */
int connectToListener(const char *ip, short port);

/**
 * Create a TCP listener.
 * @param port_str  The port of the listener as a string.
 * @returns         The file descriptor (fd) for the created socket, -1 if not created.
 */
int createListenerSocket(const char *port_str);

/**
 * Encrypt a message using AES-256-CBC.
 * @param plaintext The plaintext message with the IV as the first 16 bytes.
 * @param len       The length of the message plus 16 bytes for the IV.
 * @param maxInLen  The allocated size of the buffer containing the input message.
 * @param enc       The output buffer for the encrypted message and the IV as the first 16 bytes.
 * @param maxOutLen The maximum length of the output buffer.
 * @param key       The 32-byte key to use for encryption.
 * @returns         The size of the encrypted message.
 */
int aes_encrypt(unsigned char *plaintext, int len, int maxInLen, unsigned char *enc, int maxOutLen, unsigned char *key);

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

/**
 * Save the node information for this node.
 * @param node_info The node information structure.
 * @returns         The number of bytes saved.
 */
int save_node_info(node_info_t *node_info);

/**
 * Read the stored registration information on the node.
 * @param node_info The structure to read data into.
 * @returns         The number of bytes read.
 */
int read_node_info(node_info_t *node_info);

/**
 * Clear the existing saved program.
 * @returns         Whether the program was cleared.
 */
bool clear_jxe();

/**
 * Write the received program starting at an offset.
 * @param buffer    The buffer to write into the file.
 * @param outCursor The location to start writing at.
 * @param size      The number of bytes to write.
 * @returns         The number of bytes written.
 */
int save_jxe(unsigned char *buffer, int outCursor, int size);

/**
 * Receive user keyboard input.
 * @param buffer    The buffer to write to.
 * @param maxSize   The maximum number of characters to accept.
 * @returns         The number of characters entered.
*/
int get_console_input(unsigned char *buffer, int maxSize);

#endif // __IJAM_UTIL_H
