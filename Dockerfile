FROM ubuntu

ENV JAMOTA_ROOT=/home/admin/JAMOTA

RUN apt-get update && \
    apt install -y -q wget \
    sudo \
    redis-server

RUN useradd -m admin && echo "admin:admin" | chpasswd && adduser admin sudo
RUN echo "admin ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers
USER admin
WORKDIR /home/admin
RUN sudo apt-get install -y -q nodejs

CMD ["echo", "Hello, world!"]

COPY ./start.sh ${JAMOTA_ROOT}/start.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/start.sh

COPY ./ota-portal/ota-portal.sh ${JAMOTA_ROOT}/ota-portal/ota-portal.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/start.sh

COPY ./redis/redis.sh ${JAMOTA_ROOT}/redis/redis.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/redis/redis.sh
