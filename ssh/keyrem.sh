#!/bin/bash

if [ -f ~/.ssh/id_rsa_${1}.pub ]
then
    rm -rf ~/.ssh/id_rsa_${1}.pub
fi
if [ -f ~/.ssh/id_rsa_${1} ]
then
    rm -rf ~/.ssh/id_rsa_${1}
fi
