## TODO
* ijam tools download for nodes (jamrun)
    * automate on register call
    * store version on node, request a new one if updated
    * determine what files are needed
* node program loading

## Setting up
### Create `.env` file
Make a copy of `.env.example` and rename it to `.env`.

* `REDIS_MASTERPWD` is the master password for the redis CLI. Through `docker-compose.yml`, this gets forwarded to the environment variable `REDISCLI_AUTH`, which will automatically be used when starting `redis-cli`.
* `PORTAL_HTTPS_PKEY_PATH` and `PORTAL_HTTPS_CERT_PATH`: see [here](#optional-generate-a-certificate-if-using-https)
* `PORTAL_ADMIN_USERNAME`, `PORTAL_ADMIN_EMAIL`, and `PORTAL_ADMIN_PASSWORD` are the credentials and account information for an administrator user on the portal.

### Generate the RSA certificates
For node registration, the server must have a public and private key pair. To do so, go to your certificate directory (like `ota-portal/bin`). Generate a key and certificate with the command shown below.
```
openssl genrsa -out key_rsa.pem 4096
openssl rsa -in key_rsa.pem -pubout -out cert_rsa.pem
```

Then update the `.env` file to point to these key and certificate files in the fields `RSA_PKEY_PATH` and `RSA_CERT_PATH`, respectively. The paths are relative to `ota-portal/bin`.

### Optional: generate a certificate if using HTTPS
Navigate to the `ota-portal/bin` directory in a command prompt and generate a key using OpenSSL with the comand shown below. In the options, you can leave everything as default, but you must enter a hostname for the `Common Name`. For example, you can use `localhost` if no custom URL is set, or if you map a different URL like `ota.jamscript.com` to `localhost` on your machine (i.e. in your hosts file), you should enter that URL.
```
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
```

Then update the `.env` file to point to these key and certificate files in the fields `PORTAL_HTTPS_PKEY_PATH` and `PORTAL_HTTPS_CERT_PATH`, respectively. The paths are relative to `ota-portal/bin`.

## Running
### One-time startup command
```
cd path/to/repository/JAMScript-OTA

# build the Docker image
docker build -t ijam-master .

# build and start the containers
docker compose up --build
```

### Subsequent startups
```
cd path/to/repository/JAMScript-OTA
docker compose up
```
Running this command will startup the Docker container and only the Redis database.

### Starting the web portal
```
docker exec -it ijam-master /bin/bash

# inside the container
cd JAMOTA/ota-portal/bin
./www
```
Running these commands starts the web server to be accessible in your browser. The configuration from the .env file determines the listening port (`PORTAL_PORT`), the protocol (`PORTAL_PROTOCOL`), and the HTTPS certificate and key files (`PORTAL_HTTPS_CERT_PATH` and `PORTAL_HTTPS_PKEY_PATH`), if using [HTTPS](#optional-generate-a-certificate-if-using-https).

### Starting the other servers
```
docker exec -it ijam-master /bin/bash

# inside the container
cd JAMOTA/ota-portal/bin
./cert_server&
./reg_server&
./state_server
```
Running these commands will start the certificate and registration servers in the background, and the state server in the foreground. You can run this configuration to have all three running in one container bash session. If you want to view the three outputs separately, you must open three different bash sessions (run `docker exec ...` thrice) then you can start the servers in the foreground in each separate session.

### Accessing the Redis client
```
# open a terminal in the Redis container
docker exec -it ijam-master /bin/bash

# inside the container
redis-cli

# inside the Redis CLI, connect to docker redis, replace with environment variables set in .env [here](#create-env-file)
connect ijam-redis ${REDIS_PORT}

# inside the Redis CLI, replace with environment variables set in .env [here](#create-env-file)
auth ${REDIS_USER} ${REDIS_PASSWORD}
```
