const errors = require('./httperror');

function getIp(req) {
    let addr = req.socket.remoteAddress || req.ip;
    if (!addr) {
        errors.error(400, "Could not get source IP address.");
    }
    addr = addr.substring(addr.lastIndexOf(':') + 1);
    return addr;
}

function validateBody(req, bodyFields) {
    if (!req.body) {
        errors.error(400, "Missing request body");
    }

    let missingFields = [];

    for (var field of bodyFields) {
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
