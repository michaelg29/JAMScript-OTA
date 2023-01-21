## Setting up
### Create `.env` file
```
REDIS_USER=username
REDIS_PASSWORD=password
```

## Running
### One-time startup command
```
# build the Docker image
docker build -t ijam-master .

# build the containers
docker compose build

# start the containers
docker compose up
```
### Subsequent startups
```
# start the containers
docker compose up
```
### Accessing the Redis client
```
# open a terminal in the Redis container
docker exec -it ijam-redis /bin/bash

# inside the Redis container
redis-cli

# inside the Redis CLI, replace with environment variables set in .env [here](#create-env-file)
auth ${REDIS_USER} ${REDIS_PASSWORD}
```
