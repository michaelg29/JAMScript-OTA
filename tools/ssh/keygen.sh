#!/bin/bash

if [ -f ~/.ssh/id_rsa_${1}.pub ]
then
    rm -rf ~/.ssh/id_rsa_${1}.pub
fi
if [ -f ~/.ssh/id_rsa_${1} ]
then
    rm -rf ~/.ssh/id_rsa_${1}
fi

#   ssh-keygen [-q] [-b bits] [-C comment] [-f output_keyfile] [-m format]
#               [-t dsa | ecdsa | ecdsa-sk | ed25519 | ed25519-sk | rsa]
#               [-N new_passphrase] [-O option] [-w provider]
ssh-keygen -b 4096 -t rsa -f ~/.ssh/id_rsa_${1} -P "" > /dev/null
cat ~/.ssh/id_rsa_${1}.pub