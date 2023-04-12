# keygen
openssl genrsa -out key_rsa.pem 4096
openssl rsa -in key_rsa.pem -pubout -out cert_rsa.pem

# decrypt
./rsa_server
