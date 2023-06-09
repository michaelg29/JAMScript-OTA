#!/bin/sh

# master password
requirepass_arg=
if [ -n ${REDISCLI_AUTH} ]
then
    requirepass_arg=" --requirepass ${REDISCLI_AUTH}"
fi

# optional hostname
host_arg=
if [ -n ${REDIS_HOST} ]
then
    host_arg=" --bind ${REDIS_HOST}"
fi

# create data directory if does not exist
mkdir -p -- ${JAMOTA_ROOT}/redis/data

# start redis
eval redis-server --include ${JAMOTA_ROOT}/redis/redis.conf \
    --port ${REDIS_PORT} \
    --dir ${JAMOTA_ROOT}/redis/data${host_arg}${requirepass_arg}
