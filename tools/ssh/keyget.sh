#!/bin/bash

if [ -f ${SSH_ROOT}/id_rsa_${1}.pub ]
then
    cat ${SSH_ROOT}/id_rsa_${1}.pub
else
    exit 1
fi
