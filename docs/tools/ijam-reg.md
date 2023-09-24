---
layout: page
title: Registration Client
permalink: /tools/ijam-reg/
---

**Run on** | nodes
**Program type** | client
**Communicates with** | [Certificate Server](../ota-portal/cert-server.md), [Registration Server](../ota-portal/reg-server.md)
**Description** | Program for nodes to request for registration with the control center.

## Flow description
The registration client constructs the registration request, then sends it to the server. It gets the created node's ID and saves it locally.
1. Connect to the [certificate server](../ota-portal/cert-server.md). Send a 4-byte packet containing the certificate magic number.
1. Read the response from the certificate server as the public encryption certificate.
1. Generate the registration request.
    1. If there is valid persisted node information, use the stored node ID.
    1. Prompt the user for the network ID and network registration key.
    1. Randomly generate a 32-byte key to be used for AES encryption.
1. Using the public certificate, encrypt the registration request.
1. Connect to the [registration server](../ota-portal/reg-server.md). Send the encrypted packet.
1. Get the response from the server. Read the first two bytes as the status. If the status is not 200, print the error that follows.
1. Otherwise, use the generated node encryption key and decrypt the packet as per the [node encryption protocol](../node.md#responses-from-the-server-to-the-node). Save the 16 byte node ID in local non-volatile storage.

![Sequence diagram](../media/drawio/ijam-ijam-reg.svg)

## Schema description

See the [certificate server](../ota-portal/cert-server.md#schema-description) and the [registration server](../ota-portal/reg-server.md#schema-description) schema.
