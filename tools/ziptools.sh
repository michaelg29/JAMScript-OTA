#!/bin/bash

cd ${JAMOTA_ROOT}/ota-portal/public
rm -rf jamota-tools.zip
cd ${JAMOTA_ROOT}/tools
zip -r ../ota-portal/public/jamota-tools.zip ijamdownload.sh ijam-rtos
