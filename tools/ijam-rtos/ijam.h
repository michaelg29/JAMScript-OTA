
#ifndef __IJAM_H
#define __IJAM_H

#define IJAM_DEBUG 1 // comment out to silence most printf statements

#define STR_IMPL_(x) #x      //stringify argument
#define STR(x) STR_IMPL_(x)  //indirection to expand argument macros

/** Magic value to send to the certificate server for validation. */
#define CERT_REQ_MAGIC 0x8c124d3f

/** Listener addresses and ports. */
#define OTA_IP "127.0.0.1"
#define OTA_CERT_PORT 8444
#define OTA_REG_PORT 8445
#define OTA_STAT_PORT 8446

#define OTA_ONLINE_PORT 8440

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
    DEVICE = 0b001,
    FOG =    0b010,
    CLOUD =  0b100,
} node_type_e;

/** Node statuses. */
typedef enum {
    ONLINE  = 0b001,
    LOADING = 0b010,
    OFFLINE = 0b100,
} node_status_e;

/** Maximum length of the network ID and registration key. */
#define MAX_NET_ID_LEN 16
#define MAX_NET_PHRASE_LEN 16

/** Length of the node encryption key. */
#define NODE_KEY_LEN 32 // aes-256-cbc

/** Node information structure. */
typedef struct {
    uuid_t nodeId;                      // The node uuid.
    char networkId[MAX_NET_ID_LEN];     // The network uuid.
    char nodeKey[NODE_KEY_LEN];         // The node encryption key.
    node_type_e nodeType;               // The node type.
    node_status_e nodeStatus;           // The last recorded status.
    unsigned int checksum;              // Checksum to validate persisted data.
} node_info_t;
#define NODE_INFO_T_SIZE (int)sizeof(node_info_t)

/** Node registration request structure. */
typedef struct {
    uuid_t nodeId;                          // The node uuid.
    char networkId[MAX_NET_ID_LEN];         // The network uuid.
    char networkPhrase[MAX_NET_PHRASE_LEN]; // The passphrase for the network.
    char nodeKey[NODE_KEY_LEN];             // The node encryption key.
    node_type_e nodeType;                   // The node type.
} register_request_t;
#define REGISTER_REQUEST_T_SIZE (int)sizeof(register_request_t)

/** Node status change request. */
typedef struct {
    node_status_e nodeStatus;
} status_request_t;
#define STATUS_REQUEST_T_SIZE (int)sizeof(status_request_t)

#endif // __IJAM_H
