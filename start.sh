#!/bin/sh

usage() {
    echo "Usage: ./start.sh [-r start|bg|none] [-p start|bg|none]"
    echo "  -r start mode for Redis server"
    echo "  -p start mode for portal web server"
    echo ""
    echo "Start modes:"
    echo "  start: start and wait for completion"
    echo "  bg:    start in background"
    echo "  none:  do not start"
}

cd ${JAMOTA_ROOT}

./tools/ziptools.sh

redis_opt=
portal_opt=

# get start mode
while getopts ":r:p:" o; do
    case "${o}" in
        r)
            redis_opt=${OPTARG}
            ;;
        p)
            portal_opt=${OPTARG}
            ;;
        ?)
            ;;
        *)
            echo "${o}----${OPTARG}"
            usage
            ;;
    esac
done

num_fg=0
if [ "start" = "$redis_opt" ]
then
    echo "Starting Redis server"
    ./redis/redis.sh
    num_fg+=1
elif [ "bg" = "$redis_opt" ]
then
    echo "Starting Redis server in background"
    ./redis/redis.sh &
fi

if [ "start" = "$portal_opt" ]
then
    echo "Starting portal"
    ./ota-portal/ota-portal.sh
    num_fg+=1
elif [ "bg" = "$portal_opt" ]
then
    echo "Starting portal in background"
    ./ota-portal/ota-portal.sh &
fi

if [ 0 -eq $num_fg ]
then
    echo "Did not start any foreground processes"
    usage
fi
