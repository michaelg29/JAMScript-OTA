#!/bin/bash

IDIR="${BASH_SOURCE%/*}"
if [[ ! -d "$IDIR" ]]; then IDIR="$PWD"; fi
source "$IDIR/inc/misc_tools.sh"

show_usage() {
    cat << EOF
Registers the current device with the JAMScript Over-the-Air system.

ijamreg --nodeid=node_uuid --regkey=regkey
Makes an HTTPS request to the OTA system to register a device. You must
have created a device entry for your user in the OTA portal by visiting
your dashboard and clicking 'Create node.'

Use the --insecure option to tell curl to not check the certificates
when making the request.

Usage: ijamreg --nodeid=node_uuid --regkey=regkey
                        [--insecure]

EOF
}

# Initialize variables
devid=
regkey=
mac=
pubkey=
curl_opt=

# Parse parameters
while :; do
    case $1 in
        --help)
            show_usage
            exit
            ;;
        --nodeid)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                nodeid=$2
                shift
            else
                die 'ERROR: "--nodeid" requires a non-empty option argument.'
            fi
            ;;
        --nodeid=?*)
            nodeid=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --nodeid=)            # Handle the case of an empty
            die 'ERROR: "--nodeid" requires a non-empty option argument.'
            ;;
        --regkey)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                regkey=$2
                shift
            else
                die 'ERROR: "--regkey" requires a non-empty option argument.'
            fi
            ;;
        --regkey=?*)
            regkey=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --regkey=)            # Handle the case of an empty
            die 'ERROR: "--regkey" requires a non-empty option argument.'
            ;;
        --insecure)           # Takes an option argument; ensure it has been specified.
            curl_opt="-k ${curl_opt}"
            ;;
        --)              # End of all options.
            shift
            break
        ;;
        -?*)
            printf 'WARN: Unknown option (ignored): %s\n' "$1" >&2
            ;;
        *)               # Default case: No more options, so break out of the loop.
            break
    esac

    shift
done

# Get MAC address
mac="00:15:5d:56:bb:e8"

# Generate SSH keys
pubkey="pubKey_test"

# Make the web request
curl ${curl_opt}-X POST https://jamota.cs.mcgill.ca/ijam/register/${nodeid} \
    -H "Accept: text/plain" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "regKey=${regkey}&mac=${mac}&pubKey=${pubkey}"
