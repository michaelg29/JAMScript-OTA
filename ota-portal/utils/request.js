const errors = require('./httperror');

/**
 * Get the IP address of the requesting client.
 * @param {object} req The request.
 * @returns The IP address of the client
 */
function getIp(req) {
    if (!!process.env.SSH_IP_IN_FORM) {
        // IP address manually passed in the request body
        if (req && req.body && req.body.ip) {
            addr = req.body.ip;
        }
    }
    else {
        // get address from socket
        let addr = req.socket.remoteAddress || req.ip;

        // only slice address if exists
        addr = !addr ? undefined : addr.substring(addr.lastIndexOf(':') + 1);
    }

    if (!addr) {
        errors.error(400, "Could not get source IP address.");
    }
    return addr;
}

/**
 * Validate that a request has the required fields.
 * @param {object} req The request.
 * @param {string[]} bodyFields List of fields required in the body.
 * @returns The body of the request.
 */
function validateBody(req, bodyFields) {
    if (!req.body) {
        errors.error(400, "Missing request body");
    }

    let missingFields = [];

    for (var field of bodyFields) {
        // determine if field is optional
        if (field.endsWith('?') || field.startsWith('?')) {
            continue;
        }

        // try and find required field
        let obj = req.body;
        for (var item of field.split(".")) {
            obj = obj[item];
            if (!obj) {
                missingFields.push(field);
                break;
            }
        }
    }

    if (missingFields.length) {
        errors.error(400, `Missing fields: ${missingFields.join(", ")}.`);
    }

    return req.body;
}

module.exports = {
    validateBody: validateBody,
    getIp: getIp
}
