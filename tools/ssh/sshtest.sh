#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

# Initialize variables
nodeid=
sshUser=
ip=
data="hello"

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

ssh_id="~/.ssh/id_rsa_${nodeid}"

# Copy SSH tool scripts
(scp -i ${ssh_id} -rp ijam ${sshUser}@${ip}:~/ > /dev/null 2>&1)

if [ 0 -eq $? ]
then
    # Try to create file with data and read data
    ssh ${sshUser}@${ip} -i ${ssh_id} "echo ${data} > ./ota-test && cat ./ota-test && rm -rf ./ota-test && ./ijam/blink.sh 5"
else
    die "Could not copy tool scripts"
fi
