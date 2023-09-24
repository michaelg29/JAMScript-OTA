## To test/validate
* node detect if not registered
    * keep registered field in node_info_t: persisted struct will not be valid if not registered
* node must transition to online after done loading
    * keep track of current state so no redundant transitions
* ijamreg: node HW type - AMD x86 ubuntu, wsl, macos, raspberry-pi linux, esp-32
* documentation
    * schema for requests in a table

## Bugs
1. node list filtering does not work

## Features
1. documentation
    * flow for ijam_online, jxe_loader
1. jxe_loader
    * configurable block size - send to node
    * configurable protocol (set on website) - AES params, handshake
1. node programs
    * ijamreg
        * passphrase - Diffie-Hellman (textbook)
            1. website generates private b, calculates n^b, sends to user
            2. user generates private a, calculates n^b^a, sends to server, who stores
            3. user issues challenge (ijamreg) by sending n^a, 
    * online: accepts status changes, not just program load requests
        * server notifies if revoked
    * ijamcancel (device-initiated revocation)
1. website
    * robust UI
    * auto-refresh page data (pull/push)

## Backlog
1. users share network
1. node program loading version control
    * version control
    * revert to previous version if program corrupted
    * control center compiles to jxe for specific node type