---
layout: page
title: Node State Server
permalink: /ota-portal/state-server/
---

**Run on** | control center
**Program type** | listener
**Communicates with** | [Online Program](../tools/ijam-online.md)
**Description** |  Server to allow nodes to transition their states.

## Flow description
The registration server accepts state transition requests from nodes, encrypted using the AES encryption key for each specific node.
1. Receive request. Determine the node ID and decrypt the request body as per [the Node encryption protocol](../node.md#requests-from-the-node-to-the-server).
1. Parse request as per [the schema](#decrypted-request-body), and determine the requested state.
1. Update the state of the node in the database. If the update failed or the transition was not valid, return an error.
1. Return success as status 200 as per [the Node encryption protocol](../node.md#responses-from-the-server-to-the-node).

![Sequence diagram](../media/drawio/ijam-state-server.svg)

## Schema description

### Decrypted request body

**Length**: 4 bytes

#### Fields

Bytes | Name | Description
-|-|-
[3:0]<br/><br/><br/><br/> | nodeStatus<br/><br/><br/><br/> | The number representing the new node state.<br/>4: OFFLINE<br/>8: LOADING<br/>16: ONLINE<br/>64: REVOKED
