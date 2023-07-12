---
layout: page
title: Jxe Loader Program
permalink: /ota-portal/jxe-loader/
---

**Run on** | control center
**Program type** | client
**Communicates with** | [IJAM Online Server](../tools/ijam-online.md)
**Description** | Program to send new JAMScript executable files to online nodes.

## Usage
```
./jxe_loader <NODE_UUID> <BLOCK_SIZE>
```

## Flow description
The JXE loader program sends jxe files to nodes to be run on the node. Construct all outgoing messages to the node as per [the Node Encryption Protocol](../node.md#requests-from-the-server-to-the-node). All incoming messages from the node are to be parsed as per [the Node Encryption Protocol](../node.md#responses-from-the-node-to-the-server).
1. Determine the node to send the program to as per the node ID in the command line arguments.
1. Determine the program to load by fetching the property `runningProgram` in the database for the node.
1. Construct a program metadata packet as per [the schema](#program-metadata), and send it to the node. Wait for a 200 response.
1. Read the Jxe file in blocks of size specified by the command line argument. Send each block in a packet as per [the schema](#program-block), and send it to the node. Wait for a 200 response. If a 400 response is received, re-send the packet. If three (3) 400 responses are received, terminate the program.

![Sequence diagram](../media/drawio/ijam-jxe-loader.svg)

## Schema description
### Program metadata
### Program block
