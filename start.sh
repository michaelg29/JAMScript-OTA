#!/bin/sh

cd ${JAMOTA_ROOT}

# start Redis server
echo "Starting Redis server"
./redis/redis.sh &

# start OTA portal
echo "Starting web application"
./ota-portal/ota-portal.sh
