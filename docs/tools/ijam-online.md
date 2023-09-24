---
layout: page
title: Status Client
permalink: /tools/ijam-online/
---

**Run on** | nodes
**Program type** | client and listener
**Communicates with** | [State Server](../ota-portal/state-server.md), [Jxe Loader Program](../ota-portal/jxe-loader.md)
**Description** | Program for nodes to request to go online then listen for program updates.

## Flow description

![Sequence diagram](../media/drawio/ijam-online-flow.svg)

## Schema description

See the [state server](../ota-portal/state-server.md#schema-description) schema.

### Decrypted request body

**Length**: 4+ bytes

#### Fields

Bytes | Name | Description
-|-|-
[3:0]<br/><br/><br/> | nodeStatus<br/><br/><br/> | The number representing the new node state.<br/>8: [LOADING](#fields-for-loading-request)<br/>64: [REVOKED](#fields-for-revoked-request)
[...:4] | ... | ...

#### Fields for `LOADING` request

Bytes | Name | Description
-|-|-
[3:0] | nodeStatus | 8: LOADING
[7:4] | fileSize | The length of the file to be uploaded to the node.

#### Fields for `REVOKED` request

Bytes | Name | Description
-|-|-
[3:0] | nodeStatus | 64: REVOKED
