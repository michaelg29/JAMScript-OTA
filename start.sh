#!/bin/bash

cd ${JAMOTA_ROOT}

# Generate zip file for tools download
#./tools/ziptools.sh

# Redis server startup
echo "Starting Redis server"
./redis/redis.sh
