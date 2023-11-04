#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

show_usage() {
    cat << EOF
Makes an HTTPS request to the OTA system to register a device. You must
have created a network entry for your user in the OTA portal by visiting
your dashboard and clicking 'Create network.' The OTA portal will provide
you with the network ID and registration key for this command.

You must have copied the server's provided SSH public key to this node.
This is programmed in to the "ijamdownload.sh" script that calls this
script in the command "ssh-copy-id".

If you do not provide the --regkey options, that value will
be read from the file "regkey".

Use the --insecure option to tell curl to not check the HTTPS
certificates when making the request.

Usage: ijamdownload --nodeName=nodeName --nodeType=nodeType
            --networkId=networkId --regKey=regKey [--url=url]
            [--insecure]

Options:
    nodeName:   The name of the node.
    nodeType:   The type of the node (device, fog, or cloud).
    networkId:  The network ID.
    regKey:     Registration key for your network.
    url:        Accessible URL of the OTA portal. 
                    Defaults to https://ota.jamscript.com.
    insecure:   Whether to not verify the OTA portal's HTTPS certificate.
                    Defaults to false (i.e. will verify).

Usage: ijamreg [--regkey=regkey] [--insecure]

EOF
}

# Initialize variables
ip=`hostname -I`
nodeName="My device"
nodeType="device"
regKey=`[ -r regKey ] && cat regKey`

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
        --nodeName=?*)
            nodeName=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --nodeName=)            # Handle the case of an empty
            die "ERROR: --nodeName requires a non-empty option argument."
            ;;
        --nodeType=?*)
            nodeType=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --nodeType=)            # Handle the case of an empty
            die "ERROR: --nodeType requires a non-empty option argument."
            ;;
        --networkId=?*)
            networkId=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --networkId=)            # Handle the case of an empty
            die "ERROR: --networkId requires a non-empty option argument."
            ;;
        --regKey=?*)
            regKey=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --regKey=)            # Handle the case of an empty
            die "ERROR: --regKey requires a non-empty option argument."
            ;;
        --url=?*)
            url=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --url=)            # Handle the case of an empty
            die "ERROR: --url requires a non-empty option argument."
            ;;
        --insecure)           # Takes an option argument; ensure it has been specified.
            curl_opt="-k ${curl_opt}"
            ;;
        --)              # End of all options.
            shift
            break
            ;;
        -?*)
            printf "WARN: Unknown option (ignored): %s\n" "$1" >&2
            ;;
        *)               # Default case: No more options, so break out of the loop.
            break
    esac

    shift
done

# Construct request body
form="ip=${ip}"

# Node ID
if [ -r nodeId ]
then
    nodeId=`cat nodeId`
else
    nodeId=`uuid`
fi
form="nodeId=${nodeId}&${form}"

# Node name
if [ -v nodeName ]
then
    form="name=${nodeName}&${form}"
else
    die "ERROR: No node name provided."
fi

# Node type
if [[ "$nodeType" =~ ^(device|fog|cloud)$ ]]
then
    form="type=${nodeType}&${form}"
else
    die "ERROR: Invalid node type."
fi

# Network ID
if [ -v networkId ]
then
    form="networkId=${networkId}&${form}"
else
    die "ERROR: No network ID provided."
fi

# Network registration key
if [ -v regKey ]
then
    form="regKey=${regKey}&${form}"
else
    die "ERROR: No registration key provided."
fi

# SSH user
form="sshUser=${USER}&${form}"

# Encryption key
encKey=`for (( i=0; i<32; i++)); do printf "%x" $(($RANDOM % 256)); done;`
form="encKey=${encKey}&${form}"

# Make the web request
echo "${curl_opt} ${url}/nodes"
echo "${form}"
curl ${curl_opt} ${url}/nodes \
    -H "Accept: text/plain" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "${form}" > regRes

# Validate output
res=`cat regRes`
if [ "Network not found." = "$res" ]
then
    die "Could not find network."
elif [ "Invalid registration key." = "$res" ]
then
    die "Invalid registration key. Please check your network's key."
elif [ "Invalid SSH connection." = "$res" ]
then
    die "Server could not SSH into your device."
else
    echo ${nodeId} > nodeId
    echo ${regKey} > regKey
    echo "Node registered and saved node id."
fi
