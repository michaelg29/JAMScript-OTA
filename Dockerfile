FROM ubuntu

ENV JAMOTA_ROOT=/home/admin/JAMOTA

RUN apt-get update && \
    apt install -y -q wget \
    gcc \
    libssl-dev \
    make \
    redis-server \
    ssh \
    sudo \
    zip

RUN useradd -m admin && echo "admin:admin" | chpasswd && adduser admin sudo
RUN echo "admin ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers
USER admin
WORKDIR /home/admin
RUN sudo apt-get install -y -q nodejs

CMD ["echo", "Hello, world!"]

# startup script setup
COPY ./start.sh ${JAMOTA_ROOT}/start.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/start.sh

# redis script setup
COPY ./redis/redis.sh ${JAMOTA_ROOT}/redis/redis.sh
RUN sudo chmod +x ${JAMOTA_ROOT}/redis/redis.sh
