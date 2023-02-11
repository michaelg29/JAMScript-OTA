#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

show_usage() {
    cat << EOF

Runs JAMScript instances in docker containers.
The docker version of the normal 'jam' commands

ijam help   - Prints this help.
ijam reg    - Register the current device with JAMOTA.

EOF
}

if [ -z $1 ] || [ $1 == "help" ]; then
    show_usage
    exit 0
fi

jcmd=$1
shift 1
params=$@


case $jcmd in
    reg)
        ijamreg $params
        ;;
esac
