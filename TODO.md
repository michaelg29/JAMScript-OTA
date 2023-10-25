## To test/validate
* node detect if not registered
    * keep registered field in node_info_t: persisted struct will not be valid if not registered
* node must transition to online after done loading
    * keep track of current state so no redundant transitions
* ijamreg: node HW type - AMD x86 ubuntu, wsl, macos, raspberry-pi linux, esp-32
* documentation
    * schema for requests in a table
* ijamonline: accepts status changes, not just program load requests
    * server notifies if revoked

## Bugs
1. node list filtering does not work

## Features
1. documentation
    * flow for ijam_online, jxe_loader
1. jxe_loader
    * website form to trigger jxe_loader
    * configurable block size - send to node
    * configurable protocol (set on website) - AES params, handshake
1. node programs
    * ijamcancel (device-initiated revocation)
    * ijamonline - accept command (jamkill, jamrun, delete existing file)
        * execute for selected nodes or all online nodes on network
        * through website, user executes jamkill to stop current running JAMScript program
        * through website, user uploads new .jxe file
        * through website, user executes jamrun to start new file
        * update jxe_loader to match website data
1. website
    * robust UI
    * auto-refresh page data (pull/push)

## Backlog
1. users share network
1. node program loading version control
    * version control
    * revert to previous version if program corrupted
    * control center compiles to jxe for specific node type
1. improvement of network passcode storage (Diffie-Hellman)