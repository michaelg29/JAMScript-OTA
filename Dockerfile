FROM ubuntu

ENV JAMOTA_ROOT=/home/admin/JAMOTA

RUN apt-get update && \
    apt install -y -q wget \
    sudo \
    redis-server \
    ssh

RUN useradd -m admin && echo "admin:admin" | chpasswd && adduser admin sudo
RUN echo "admin ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers
USER admin
WORKDIR /home/admin
RUN sudo apt-get install -y -q nodejs

CMD ["echo", "Hello, world!"]

# startup script setup
COPY ./start.sh ${JAMOTA_ROOT}/start.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/start.sh

# portal script setup
COPY ./ota-portal/ota-portal.sh ${JAMOTA_ROOT}/ota-portal/ota-portal.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/ota-portal/ota-portal.sh

# redis script setup
COPY ./redis/redis.sh ${JAMOTA_ROOT}/redis/redis.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/redis/redis.sh

# ssh script setup
COPY ./ssh/keygen.sh ${JAMOTA_ROOT}/ssh/keygen.sh
COPY ./ssh/keyget.sh ${JAMOTA_ROOT}/ssh/keyget.sh
COPY ./ssh/keyrem.sh ${JAMOTA_ROOT}/ssh/keyrem.sh
COPY ./ssh/keyrem.sh ${JAMOTA_ROOT}/ssh/sshtest.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/ssh/*
RUN mkdir /home/admin/.ssh
