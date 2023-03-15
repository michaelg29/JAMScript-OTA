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

--sshuser is the user to access the node (i.e. pi).
--sshdst is the node IP address (i.e. raspberrypi.local).

Usage: ijamdownload --sshuser=sshuser --sshdst=sshdst --nodeid=nodeid
            --pubkey=pubkey --regkey=regkey [--url=url] [--insecure]

Options:
    sshuser:    The user to SSH into the node with.
    sshdst:     The IP address of the node to SSH into relative to your device.
    nodeid:     The GUID of the node provided by the OTA portal.
    pubkey:     The OTA controller's public key provided by the OTA poral.
    regkey:     Registration key for your network.
    url:        Accessible URL of the OTA portal. 
                    Defaults to https://ota.jamscript.com.
    insecure:   Whether to verify the OTA portal's HTTPS certificate.
                    Defaults to false.

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
        --sshuser=?*)
            sshuser=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --sshuser=)            # Handle the case of an empty
            die "ERROR: "--sshuser" requires a non-empty option argument."
            ;;
        --sshdst=?*)
            sshdst=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --sshdst=)            # Handle the case of an empty
            die "ERROR: "--sshdst" requires a non-empty option argument."
            ;;
        --nodeid=?*)
            nodeid=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --nodeid=)            # Handle the case of an empty
            die "ERROR: "--nodeid" requires a non-empty option argument."
            ;;
        --pubkey=?*)
            pubkey=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --pubkey=)            # Handle the case of an empty
            die "ERROR: "--pubkey" requires a non-empty option argument."
            ;;
        --regkey=?*)
            regkey=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --regkey=)            # Handle the case of an empty
            die "ERROR: "--regkey" requires a non-empty option argument."
            ;;
        --url=?*)
            url=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --url=)            # Handle the case of an empty
            die "ERROR: "--url" requires a non-empty option argument."
            ;;
        --insecure)
            insecure="true"
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

if ! [ -v sshuser ]
then
    echo -n "Enter the username for the SSH device: "
    read sshuser
fi
if [ -z sshuser ]
then
    die "ERROR: No SSH user provided."
fi

if ! [ -v sshdst ]
then
    echo -n "Enter the accessible IP address of SSH device: "
    read sshdst
fi
if [ -z sshdst ]
then
    die "ERROR: No SSH target provided."
fi

if [ -v nodeid ]
then
    regopt="--nodeid='${nodeid}' ${regopt}"
else
    die "ERROR: No node id provided."
fi

if [ -v pubkey ]
then
    regopt="--pubkey='${pubkey}' ${regopt}"
else
    die "ERROR: No SSH public key provided."
fi

if [ -v regkey ]
then
    regopt="--regkey='${regkey}' ${regopt}"
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

# Copy SSH tool scripts
#res=(scp -i ${ssh_id} -rp ijam ${sshuser}@${sshdst}:~/ > /dev/null 2>&1)
(scp -rp ijam ${sshuser}@${sshdst}:~/)
if [ $? -ne 0 ]
then
    die "ERROR: Could not copy tool scripts to ${sshuser}@${sshdst}"
fi

# run the register script on the node
ssh ${sshuser}@${sshdst} -o "StrictHostKeyChecking=no" "cd ./ijam && ./ijamreg.sh ${regopt}"

echo "Done."
