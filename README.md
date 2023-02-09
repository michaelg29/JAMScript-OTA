## Setting up
### Create `.env` file
Make a copy of `.env.example` and rename it to `.env`.

* `REDIS_USER` and `REDIS_PASSWORD` are the credentials for an account that you can login with.
* `REDIS_MASTERPWD` is the master password for the redis CLI. Through `docker-compose.yml`, this gets forwarded to the environment variable `REDISCLI_AUTH`, which will automatically be used when starting `redis-cli`.

### Optional: generate a certificate if using HTTPS
Navigate to the `ota-portal/bin` directory in a command prompt and generate a key using OpenSSL. In the options, you can leave everything as default, but you must enter a hostname for the `Common Name`. For example, you can use `localhost` if no custom URL is set, or if you map a different URL like `jamota.jamscript.com` to `localhost` on your machine (i.e. in your hosts file), you should enter that URL.
```
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
```

Then update the `.env` file to point to these certificate and key files in the fields `PORTAL_HTTPS_CERT_PATH` and `PORTAL_HTTPS_PKEY_PATH`, respectively.

## Running
### One-time startup command
```
# build the Docker image
docker build -t ijam-master .

# build and start the containers
docker compose up --build
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

# inside the Redis CLI, connect to docker redis, replace with environment variables set in .env [here](#create-env-file)
connect ijam-redis ${REDIS_PORT}

# inside the Redis CLI, replace with environment variables set in .env [here](#create-env-file)
auth ${REDIS_USER} ${REDIS_PASSWORD}
```
