#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

show_usage() {
    cat << EOF
Download the script files onto your node so it can interact with the
JAMScript over-the-air system.

ijamdownload --sshdst=sshdst --home=home
Downloads the tools onto the node from the JAMScript site. You must have
an SSH-enabled node that is connected to the internet. The device will
make HTTPS requests to download updated versions of support scripts along
with the JAMScript library so it can run JAMScript programs.

You must have previously downloaded the ijam update script (ijamupdate.sh)
from the OTA portal.

--sshdst is the node address (i.e. pi@raspberrypi.local).

--home is the home directory (i.e. /home/pi, you cannot use ~/ as SSH does
not recognize that).

Usage: ijamdownload --sshdst=sshdst --home=home

EOF
}

# Initialize variables
sshdst=
home=

# Parse parameters
while :; do
    case $1 in
        --help)
            show_usage
            exit
            ;;
        --sshdst)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                sshdst=$2
                shift
            else
                die 'ERROR: "--sshdst" requires a non-empty option argument.'
            fi
            ;;
        --sshdst=?*)
            sshdst=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --sshdst=)            # Handle the case of an empty
            die 'ERROR: "--sshdst" requires a non-empty option argument.'
            ;;
        --home)           # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                home=$2
                shift
            else
                die 'ERROR: "--home" requires a non-empty option argument.'
            fi
            ;;
        --home=?*)
            home=${1#*=}     # Delete everything up to "=" and assign the remainder.
            ;;
        --home=)            # Handle the case of an empty
            die 'ERROR: "--home" requires a non-empty option argument.'
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

if [ -z sshdst ]
then
    die 'ERROR: No ssh target provided.'
fi

if [ -z home ]
then
    die 'ERROR: No home directory provided.'
fi

# copy script to the node
scp ./ijamupdate.sh ${sshdst}:${home}/ijam/ijamupdate.sh

# run the script on the node
ssh ${sshdst}:${home} -o "StrictHostKeyChecking=no" "cd ${home}/ijam && ./ijamupdate.sh"
