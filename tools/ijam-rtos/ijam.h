
#ifndef __IJAM_H
#define __IJAM_H

#define IJAM_DEBUG 1 // comment out to silence most printf statements

#define STR_IMPL_(x) #x      // stringify argument
#define STR(x) STR_IMPL_(x)  // indirection to expand argument macros

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

/** Node architectures. */
typedef enum {
    N_ARCH_NONE       = 0b000001,
    N_ARCH_X86_UBUNTU = 0b000010,
    N_ARCH_RPI_LINUX  = 0b000100,
    N_ARCH_WSL        = 0b001000,
    N_ARCH_MACOS      = 0b010000,
    N_ARCH_ESP32      = 0b100000,
} node_arch_e;

/** Node statuses. */
typedef enum {
    N_STATUS_NONE    = 0b0000001,
    N_STATUS_CREATED = 0b0000010,
    N_STATUS_OFFLINE = 0b0000100,
    N_STATUS_LOADING = 0b0001000,
    N_STATUS_ONLINE  = 0b0010000,
    N_STATUS_EXPIRED = 0b0100000,
    N_STATUS_REVOKED = 0b1000000,
} node_status_e;

/** Node types. */
typedef enum {
    N_TYPE_NONE    = 0b0001,
    N_TYPE_DEVICE  = 0b0010,
    N_TYPE_FOG     = 0b0100,
    N_TYPE_CLOUD   = 0b1000,
} node_type_e;

/** Request types. */
typedef enum {
    R_TYPE_NONE   = 0b00001,
    R_TYPE_PING   = 0b00010,
    R_TYPE_FILE   = 0b00100,
    R_TYPE_CMD    = 0b01000,
    R_TYPE_REVOKE = 0b10000,
} request_type_e;

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
    node_arch_e nodeArch;                   // The node architecture.
} register_request_t;
#define REGISTER_REQUEST_T_SIZE (int)sizeof(register_request_t)

/** Node status change request. */
typedef struct {
    node_status_e nodeStatus;
} status_request_t;
#define STATUS_REQUEST_T_SIZE (int)sizeof(status_request_t)

#endif // __IJAM_H
