FROM node:10.19.0

RUN apt-get update

CMD ["echo", "Hello, world!"]

COPY ./etc/client/client.sh /etc/client/client.sh
RUN chmod +x /etc/client/client.sh
