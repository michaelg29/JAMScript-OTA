#!/bin/bash

blinks=50

if [ $# -gt 0 ]
then
    blinks=$1
fi

for (( ; blinks > 0; blinks-- ))
do
    echo 1 | sudo dd status=none of=/sys/class/leds/led0/brightness
    sleep 0.1
    echo 0 | sudo dd status=none of=/sys/class/leds/led0/brightness
    sleep 0.1
done
