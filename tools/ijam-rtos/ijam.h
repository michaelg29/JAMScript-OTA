
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
#define REG_KEY_LEN 20

/** Node registration request structure. */
typedef struct {
    int magic;
    uuid_t nodeId;
    uuid_t networkId;
    char networkRegKey[REG_KEY_LEN];
    node_type_t nodeType;
} register_request_t;
#define REGISTER_REQUEST_T_SIZE sizeof(register_request_t)
