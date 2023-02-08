

async function refreshToken(accessToken) {
    // if expiry within a minute, refresh the token
    let refreshToken = await sendRequest("POST", "refreshToken", {
        "authorization": accessToken
    });

    if (refreshToken.status == 401) {
        window.location.href = "/login";
    }

    return refreshToken.data;
}

async function sendRequest(method, endpoint, headers, body = undefined, responseType = "json") {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open(method, endpoint);
        request.responseType = responseType;
        Object.keys(headers).forEach((name) => {
            request.setRequestHeader(name, headers[name]);
        });
        request.send(body);

        request.onload = () => {
            resolve({
                status: request.status,
                data: request.response,
                headers: request.getAllResponseHeaders()
            });
        }
    })
}

async function dataRequest(method, endpoint, headers, body, responseType) {
    var expiry;
    var token;

    for (let cookie of document.cookie.split("; ")) {
        var keyVal = cookie.split("=");
        if (keyVal[0] === "jamota-token-expiry") {
            expiry = Number.parseInt(keyVal[1]);
        }
        else if (keyVal[0] === "jamota-token") {
            token = keyVal[1];
        }
    }

    if (expiry < Date.now() + 60000) {
        // if expiry within a minute, refresh the token
        token = (await refreshToken(token)).token;
    }

    if (!headers) {
        headers = {
            authorization: token
        }
    }
    else if (!headers.authorization) {
        headers.authorization = token;
    }

    return await sendRequest(method, endpoint, headers, body, responseType);
}
