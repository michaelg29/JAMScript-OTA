#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

# Initialize variables
nodeid=
sshUser=
ip=

# Parse parameters
while :; do
    case $1 in
        --nodeid)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                nodeid=$2
                shift
            else
                die 'ERROR: "--nodeid" requires a non-empty option argument.'
            fi
            ;;
        --sshUser)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                sshUser=$2
                shift
            else
                die 'ERROR: "--sshUser" requires a non-empty option argument.'
            fi
            ;;
        --ip)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                ip=$2
                shift
            else
                die 'ERROR: "--ip" requires a non-empty option argument.'
            fi
            ;;
        --)              # End of all options.
            shift
            break
            ;;
        *)               # Default case: No more options, so break out of the loop.
            break
    esac

    shift
done

# Run blink script on device
ssh ${sshUser}@${ip} -i ${SSH_ROOT}/id_rsa_${nodeid} "./ijam/blink.sh"
