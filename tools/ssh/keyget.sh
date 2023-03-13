#!/bin/bash

if [ -f ~/.ssh/id_rsa_${1}.pub ]
then
    cat ~/.ssh/id_rsa_${1}.pub
else
    exit 1
fi
