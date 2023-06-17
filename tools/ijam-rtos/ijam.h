
#ifndef __IJAM_H
#define __IJAM_H

#define IJAM_DEBUG 1 // comment out to silence most printf statements

/** Magic value to send to the certificate server for validation. */
#define CERT_REQ_MAGIC 0x8c124d3f

/** Listener addresses and ports. */
#define OTA_IP "127.0.0.1"
#define OTA_CERT_PORT 8444
#define OTA_REG_PORT 8445

/** Boolean. */
typedef char bool;
#define false (bool)0
#define true !false

/** UUID structure (16 bytes). */
#define UUID_SIZE 16
typedef struct {
    unsigned char bytes[UUID_SIZE];
} uuid_t;

/** Node types. */
typedef enum {
    device = 0b001,
    fog =    0b010,
    cloud =  0b100,
} node_type_t;

/** Standard length of the network registration key. */
#define REG_KEY_LEN 32
#define NODE_KEY_LEN 32 // aes-256-cbc

/** Node registration request structure. */
typedef struct {
    int magic;                          // Random generated magic number.
    uuid_t nodeId;                      // The node uuid.
    uuid_t networkId;                   // The network uuid.
    char networkRegKey[REG_KEY_LEN];    // The registration key for the network.
    char nodeKey[NODE_KEY_LEN];         // The node encryption key.
    node_type_t nodeType;               // The node type.
    unsigned int checksum;              // Checksum to validate persisted data.
} register_request_t;
#define REGISTER_REQUEST_T_SIZE (int)sizeof(register_request_t)

#endif // __IJAM_H
