#!/bin/bash

if [ -f ${SSH_ROOT}/id_rsa.pub ]
then
    cat ${SSH_ROOT}/id_rsa.pub
else
    exit 1
fi
