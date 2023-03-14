#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

# Initialize variables
nodeid=
sshuser=
sshdst=
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
        --sshuser)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                sshuser=$2
                shift
            else
                die 'ERROR: "--sshuser" requires a non-empty option argument.'
            fi
            ;;
        --sshdst)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                sshdst=$2
                shift
            else
                die 'ERROR: "--sshdst" requires a non-empty option argument.'
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

ssh_id="${SSH_ROOT}/id_rsa_${nodeid}"

dst_dir="${sshuser}@${sshdst}:~/"

# Copy SSH tool scripts
(scp -i ${ssh_id} -o "StrictHostKeyChecking=no" -rp ${JAMOTA_ROOT}/tools/ijam ${dst_dir} > /dev/null 2>&1)

if [ 0 -eq $? ]
then
    # Try to create file with data and read data
    ssh ${sshuser}@${sshdst} -i ${ssh_id} -o "StrictHostKeyChecking=no" "echo ${data} > ./ota-test && cat ./ota-test && rm -rf ./ota-test && ./ijam/blink.sh 50"
else
    die "Could not copy tool scripts"
fi
