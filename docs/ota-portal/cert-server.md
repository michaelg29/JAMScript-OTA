---
layout: page
title: Certificate Server
permalink: /ota-portal/cert-server/
---

# Certificate Server
### Run on: control center
### Program type: listener
### Communicates with: [Register Program](../tools/ijam-reg.md)
### Description: Server to grant the RSA public certificate to nodes.

## Flow description
The certificate server accepts requests from a node client for the public certificate used in RSA encryption.
1) Receive request. Ensure only 4 bytes were sent then read the bytes as a hex string.
1) If the hex string matches the magic value, return the public key stored in `$RSA_CERT_PATH`. Otherwise terminate the socket without an error message.

## Schema description
