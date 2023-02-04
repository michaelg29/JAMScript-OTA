var createError = require('http-errors');

function error(statusCode, message, extendedCode) {
    throw {
        statusCode: statusCode,
        message: message,
        extendedCode: extendedCode
    }
}

module.exports = {
    error: error
}
