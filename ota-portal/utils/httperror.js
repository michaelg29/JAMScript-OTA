
function errorObj(statusCode, message, extendedCode) {
    return {
        statusCode: statusCode,
        message: message,
        extendedCode: extendedCode
    };
}

function error(statusCode, message, extendedCode) {
    throw errorObj(statusCode, message, extendedCode);
}

module.exports = {
    errorObj: errorObj,
    error: error
}
