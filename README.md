## Setting up
### Create `.env` file
Make a copy of `.env.example` and rename it to `.env`.

* `REDIS_MODE` and `PORTAL_MODE` determine which processes start on `docker compose up`.
    * If set to `start`, the life of that cycle will determine the life of the container.
    * If set to `bg`, the process will run in the background and will terminate when the container terminates. Beware, if both processes are set to `bg`, then the container will shutdown immediately.
    * If set to `none`, the process will not be start. This can be used for the web portal when testing out the server. One can make changes, then restart the webserver through the `ota-portal.sh` script.
    * In general, one program should be set to `bg` or `none`, and the other should be set to `start`. If developing the web server, set `REDIS_MODE` to `start` so it is always alive, and `PORTAL_MODE` to `none`. You can then run the `ota-portal.sh` script to start the server.
* `REDIS_MASTERPWD` is the master password for the redis CLI. Through `docker-compose.yml`, this gets forwarded to the environment variable `REDISCLI_AUTH`, which will automatically be used when starting `redis-cli`.
* `PORTAL_HTTPS_PKEY_PATH` and `PORTAL_HTTPS_CERT_PATH`: see [here](#optional-generate-a-certificate-if-using-https)
* `PORTAL_ADMIN_USERNAME`, `PORTAL_ADMIN_EMAIL`, and `PORTAL_ADMIN_PASSWORD` are the credentials and account information for an administrator user on the portal.

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
