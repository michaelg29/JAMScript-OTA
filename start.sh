#!/bin/sh

cd ${JAMOTA_ROOT}

#./tools/ziptools.sh

echo "Starting Redis server"
./redis/redis.sh
