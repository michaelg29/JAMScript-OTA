// create error object
function errorObj(statusCode, message, page = undefined) {
    return {
        statusCode: statusCode,
        message: message,
        renderHTML: page || "error"
    };
}

// throw error as object
function error(statusCode, message, page = undefined) {
    throw errorObj(statusCode, message, page);
}

function asyncWrap(fn) {
    return function(req, res, next) {
        return Promise
            .resolve(fn(req, res, next))
            .catch(next);
    }
}

module.exports = {
    errorObj: errorObj,
    error: error,
    asyncWrap: asyncWrap
}
