#!/bin/bash

if [ -f ${SSH_ROOT}/id_rsa_${1}.pub ]
then
    rm -rf ${SSH_ROOT}/id_rsa_${1}.pub
fi
if [ -f ${SSH_ROOT}/id_rsa_${1} ]
then
    rm -rf ${SSH_ROOT}/id_rsa_${1}
fi
