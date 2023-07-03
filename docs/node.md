---
layout: page
title: Node Description
permalink: /node/
---

## Node encryption protocol
### Requests from the node to the server
The node must include its ID with the packet so that the server knows which key to use for decryption. The message is constructed as follows:
1. Node UUID (16 bytes)
1. Encryption IV (16 bytes)
1. Encrypted data (`(N // 16 + 1. * 16` bytes)

The data is encrypted as per [the AES encryption format](#aes-encryption-format) using the node's locally persisted encryption key.

### Responses from the node to the server
When the server initiates a transaction, the server knows which node ID it is communicating with, so the node ID need not be included. Hence, the message is constructed as follows:
1. Status code (2 bytes)
1. Encryption IV (16 bytes)
1. Encrypted data (`(N // 16 + 1. * 16` bytes)

The data is encrypted as per [the AES encryption format](#aes-encryption-format) using the node's locally persisted encryption key. If no data is to be encrypted, omit the encryption IV and data portions.

### Requests from the server to the node
The server need not include the ID with the packet, as the node already knows the encryption key to use. The message is constructed as follows:
1. Encryption IV (16 bytes)
1. Encrypted data (`(N // 16 + 1. * 16` bytes)

The data is encrypted as per [the AES encryption format](#aes-encryption-format) using the encryption key stored in the database for the destination node.

### Responses from the server to the node
The server need not include the ID with the packet, as the node already knows the encryption key to use. The message is constructed as follows:
1. Status code (2 bytes)
1. Encryption IV (16 bytes)
1. Encrypted data (`(N // 16 + 1. * 16` bytes)

The data is encrypted as per [the AES encryption format](#aes-encryption-format) using the encryption key stored in the database for the destination node. If no data is to be encrypted, omit the encryption IV and data portions.

### AES encryption format
The encrypted data is constructed by encrypting a data packet which is formatted as follows:
1. Data (N bytes)
1. Checksum (1 byte), computed by XORing the N data bytes together
1. Padding (`P = (16 - ((N + 1) % 16))` bytes), each byte is written with the value `P`.
