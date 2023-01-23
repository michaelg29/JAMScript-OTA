#!/bin/sh

# master password
requirepass_arg=
if [ -n ${REDISCLI_AUTH} ]
then
    requirepass_arg=" --requirepass ${REDISCLI_AUTH}"
fi

# optional account
user_arg=
if [ -n ${REDIS_USER} ]
then
    user_arg=" --user ${REDIS_USER} +@all ~* on \">${REDIS_PASSWORD}\""
fi

# optional hostname
host_arg=
if [ -n ${REDIS_HOST} ]
then
    host_arg=" --bind ${REDIS_HOST} -::1"
fi

# start redis
eval redis-server --include /etc/redis/redis.conf \
    --port ${REDIS_PORT} \
    ${host_arg} \
    ${requirepass_arg}${user_arg}
