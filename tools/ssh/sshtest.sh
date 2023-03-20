#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

# Initialize variables
sshUser=
sshDst=
data="hello"

# Parse parameters
while :; do
    case $1 in
        --sshUser)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                sshUser=$2
                shift
            else
                die 'ERROR: "--sshUser" requires a non-empty option argument.'
            fi
            ;;
        --sshDst)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                sshDst=$2
                shift
            else
                die 'ERROR: "--sshDst" requires a non-empty option argument.'
            fi
            ;;
        --data)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                data=$2
                shift
            else
                die 'ERROR: "--data" requires a non-empty option argument.'
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

# Copy SSH tool scripts
scp -o "StrictHostKeyChecking=no" -r ${JAMOTA_ROOT}/tools/ijam/ ${sshUser}@${sshDst}:~/

if [ 0 -eq $? ]
then
    # Try to create file with data and read data
    ssh ${sshUser}@${sshDst} -o "StrictHostKeyChecking=no" "echo ${data}"
else
    die "Could not copy tool scripts"
fi
