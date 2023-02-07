const errors = require('./httperror');

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
        errors.error(400, "Missing fields: " + missingFields.join(", "));
    }

    return true;
}

module.exports = {
    validateBody: validateBody,
    test: test
}
