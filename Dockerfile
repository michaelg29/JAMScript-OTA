FROM node:10.19.0

RUN apt-get update

CMD ["echo", "Hello, world!"]

COPY ./ota-portal/ota-portal.sh /etc/ota-portal/ota-portal.sh
RUN chmod +x /etc/ota-portal/ota-portal.sh
