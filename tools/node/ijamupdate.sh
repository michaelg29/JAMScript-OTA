#!/bin/bash

die() {
    printf '%s\n' "$1" >&2
    exit 1
}

show_usage() {
    cat << EOF
Downloads the updated tools and libraries
EOF
}
