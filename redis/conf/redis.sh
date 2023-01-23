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

# start redis
eval redis-server --include /etc/redis/redis.conf${requirepass_arg}${user_arg}
