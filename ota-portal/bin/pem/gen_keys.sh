#!/bin/bash

# Generate HTTPS key pair
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes

# Generate RSA key pair
openssl genrsa -out key_rsa.pem 4096
openssl rsa -in key_rsa.pem -pubout -out cert_rsa.pem
