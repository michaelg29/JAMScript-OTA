
window.onload = getAuthorization;

async function getAuthorization() {
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

    return token;
}

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
                headers: request.getAllResponseHeaders().split("\r\n")
            });
        }
    })
}

async function dataRequest(method, endpoint, headers, body, contentType = "application/json", responseType = "json") {
    let token = getAuthorization();

    if (!headers) {
        headers = {}
    }

    // auto-fill header values
    if (!headers["authorization"]) {
        headers["authoriation"] = token;
    }
    if (!headers["Content-Type"]) {
        headers["Content-Type"] = contentType;
    }

    if (headers["Content-Type"] === "application/json" && typeof body === "object") {
        body = JSON.stringify(body);
    }

    return await sendRequest(method, endpoint, headers, body, responseType);
}

async function post(endpoint, headers, body, contentType = "application/json", responseType = "json") {
    return await dataRequest("POST", method, headers, body, contentType, responseType);
}

async function get(endpoint, headers, body, contentType = "application/json", responseType = "json") {
    return await dataRequest("GET", method, headers, body, contentType, responseType);
}
