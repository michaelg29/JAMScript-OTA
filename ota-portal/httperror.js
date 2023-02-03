var createError = require('http-errors');

function error(statusCode, message, extendedCode) {
    console.log(message);
    throw {
        statusCode: statusCode,
        message: message,
        extendedCode: extendedCode
    }
}

function createHttpError(errorObj) {
    return createError<errorObj.statusCode>(errorObj.message);
}

module.exports = {
    error: error,
    createHttpError: createHttpError
}
