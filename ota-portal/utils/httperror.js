// generate error object to send as JSON
function errorObj(statusCode, message) {
    return {
        statusCode: statusCode,
        message: message,
    };
}

// generate error object to send in an HTML file
function errorPage(statusCode, message, page = undefined) {
    return {
        statusCode: statusCode,
        message: message,
        renderHTML: page || true
    }
}

// throw an error object
function error(statusCode, message) {
    throw errorObj(statusCode, message);
}

// throw an error object to render in an HTML file
function renderError(statusCode, message, page = undefined) {
    throw errorPage(statusCode, message, page);
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
    errorPage: errorPage,
    error: error,
    renderError: renderError,
    asyncWrap: asyncWrap
}
