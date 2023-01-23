## Setting up
### Create `.env` file
```
REDIS_USER=username
REDIS_PASSWORD=password
REDIS_MASTERPWD=masterpwd
```

* `REDIS_USER` and `REDIS_PASSWORD` are the credentials for an account that you can login with.
* `REDIS_MASTERPWD` is the master password for the redis CLI. Through `docker-compose.yml`, this gets forwarded to the environment variable `REDISCLI_AUTH`, which will automatically be used when starting `redis-cli`.

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
