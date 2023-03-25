#!/bin/bash

die() {
    printf "%s\n" "$1" >&2
    exit 1
}

show_usage() {
    cat << EOF
Download the script files onto your node so it can interact with the
JAMScript over-the-air system.

ijamdownload
Downloads the tools onto the node from the JAMScript site. You must have
an SSH-enabled node that is connected to the internet. The device will
make HTTPS requests to download updated versions of support scripts along
with the JAMScript library so it can run JAMScript programs.

You must have previously downloaded the ijam tools folder from the over-
the-air website and registered your node with an ID.

--sshUser is the user to access the node (i.e. pi).
--sshDst is the node IP address (i.e. raspberrypi.local).

Usage: ijamdownload --sshUser=sshUser --sshDst=sshDst --pubKey=pubKey
            --nodeName=nodeName --nodeType=nodeType --networkId=networkId 
            --regKey=regKey [--url=url] [--insecure] [--nocopy]

Options:
    sshUser:    The user to SSH into the node with.
    sshDst:     The IP address of the node to SSH into relative to your device.
    pubKey:     The OTA controller's public key provided by the OTA poral.
    nodeName:   The name of the node.
    nodeType:   The type of the node (device, fog, or cloud).
    networkId:  The network ID.
    regKey:     Registration key for your network.
    url:        Accessible URL of the OTA portal. 
                    Defaults to https://ota.jamscript.com.
    insecure:   Whether to not verify the OTA portal's HTTPS certificate.
                    Defaults to false (i.e. will verify).
    nocopy:     Whether to skip copying the tools files.

EOF
}

# Initialize variables
url="https://ota.jamscript.com"

# Parse parameters
while :; do
    case $1 in
        --help)
            show_usage
            exit
            ;;
        --sshUser=?*)
            sshUser=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --sshUser=)            # Handle the case of an empty
            die "ERROR: "--sshUser" requires a non-empty option argument."
            ;;
        --sshDst=?*)
            sshDst=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --sshDst=)            # Handle the case of an empty
            die "ERROR: "--sshDst" requires a non-empty option argument."
            ;;
        --pubKey=?*)
            pubKey=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --pubKey=)            # Handle the case of an empty
            die "ERROR: --pubKey requires a non-empty option argument."
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
        --insecure)
            insecure="true"
            ;;
        --nocopy)
            nocopy="true"
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

# construct registration options
regopt="--"

if ! [ -v sshUser ]
then
    echo -n "Enter the username for the SSH device: "
    read sshUser
fi
if [ -z sshUser ]
then
    die "ERROR: No SSH user provided."
fi

if ! [ -v sshDst ]
then
    echo -n "Enter the accessible IP address of SSH device: "
    read sshDst
fi
if [ -z sshDst ]
then
    die "ERROR: No SSH target provided."
fi

if [ -v pubKey ]
then
    # copy ssh keys
    echo "asdf" > id_rsa
    echo $pubKey > id_rsa.pub
    ssh-copy-id -i id_rsa ${sshUser}@${sshDst}
else
    die "ERROR: No SSH public key provided."
fi

if ! [ -v nodeName ]
then
    echo -n "Enter the node name: "
    read nodeName
fi
if [ -z nodeName ]
then
    die "ERROR: No node name provided."
fi

if ! [ -v nodeType ]
then
    echo -n "Enter the node type (device|fog|cloud): "
    read nodeType
fi
if [ -z nodeType ]
then
    die "ERROR: No node type provided."
fi

if [ -v networkId ]
then
    regopt="--networkId='${networkId}' ${regopt}"
else
    die "ERROR: No network ID provided."
fi

if [ -v regKey ]
then
    regopt="--regKey='${regKey}' ${regopt}"
else
    die "ERROR: No network registration key provided."
fi

if [ -v url ]
then
    regopt="--url='${url}' ${regopt}"
fi

if [ -v insecure ]
then
    regopt="--insecure ${regopt}"
fi

if ! [ -v nocopy ]
then
    # Copy SSH tool scripts
    (scp -r ijam/ ${sshUser}@${sshDst}:~/)
    if [ $? -ne 0 ]
    then
        die "ERROR: Could not copy tool scripts to ${sshUser}@${sshDst}"
    fi
fi

# run the register script on the node
ssh ${sshUser}@${sshDst} -o "StrictHostKeyChecking=no" "cd ./ijam && ./ijamreg.sh ${regopt}"

echo "Done."
