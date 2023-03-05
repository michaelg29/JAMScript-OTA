#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

show_usage() {
    cat << EOF
Registers the current device with the JAMScript Over-the-Air system.

ijamreg --pubkey=pubkey --nodeid=node_uuid --regkey=regkey
Makes an HTTPS request to the OTA system to register a device. You must
have created a device entry for your user in the OTA portal by visiting
your dashboard and clicking 'Create node.' The OTA portal will provide
you with the SSH public key, the node ID, and the registration key for
this command.

If you do not provide the --nodeid or --regkey options, those values will
be read from the files "nodeid" and "regkey", respectively.

Use the --insecure option to tell curl to not check the HTTPS
certificates when making the request.

Usage: ijamreg --pubkey=pubkey [--nodeid=node_uuid] [--regkey=regkey]
                        [--insecure]

EOF
}

# Initialize variables
nodeid=`[ -r nodeid ] && cat nodeid`
regkey=`[ -r regkey ] && cat regkey`
pubkey=
ip=`hostname -I`
#curl_opt="--write-out %{http_code}\n -X POST"
curl_opt="-X POST"
url=https://ota.jamscript.com

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
        --pubkey)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                pubkey=$2
                shift
            else
                die 'ERROR: "--pubkey" requires a non-empty option argument.'
            fi
            ;;
        --pubkey=?*)
            pubkey=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --pubkey=)            # Handle the case of an empty
            die 'ERROR: "--pubkey" requires a non-empty option argument.'
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
        --url)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                url=$2
                shift
            else
                die 'ERROR: "--url" requires a non-empty option argument.'
            fi
            ;;
        --url=?*)
            url=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --url=)            # Handle the case of an empty
            die 'ERROR: "--url" requires a non-empty option argument.'
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

if [ -z pubkey ]
then
    die 'ERROR: Did not receive a public key.'
fi

# Save the public key
echo ${pubkey} >> ~/.ssh/authorized_keys

# Make the web request
curl ${curl_opt} ${url}/nodes/${nodeid}/register \
    -H "Accept: text/plain" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "regKey=${regkey}&sshUser=${USER}&ip=${ip}" > regkey

res=`cat regkey`
if [ "Invalid registration key." = "$res" ]
then
    die "Invalid registration key. Please re-register the node manually."
elif [ "Invalid SSH connection." = "$res" ]
then
    die "Server could not SSH into your device."
else
    echo "Saving node id..."
    echo ${nodeid} > nodeid
    echo "Node registered and new registration key stored."
fi
