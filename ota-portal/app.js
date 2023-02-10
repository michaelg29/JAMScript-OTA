const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const path = require('path');
const errors = require('./utils/httperror');

const auth = require('./routes/auth');
const nodeRouter = require('./routes/node');

const rclient = require('./utils/redis-client');

var app = express();

// middleware
app.use(logger('dev'));
app.use(express.text({
    type: "text/*"
}));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// authorization
app.use(auth);

// index redirect
app.get("/", (req, res) => {
    res.render('index', {
        name: req.user.name
    });
});

function processRedisResponse(httpRes, err, redisReply) {
    if (err) {
        httpRes.status(400).send(err);
        return;
    }
    console.log(redisReply);

    httpRes.type('text');
    httpRes.send(typeof redisReply === 'number' ? 'OK' : redisReply);
}

app.post("/query", async (req, res) => {
    let query = req.body.split(' ');
    let queryArgs = query.slice(1);

    [err, reply] = await rclient.execute(query[0], queryArgs);
    processRedisResponse(res, err, reply);
});

app.use("/node", nodeRouter);

app.use(function (req, res, next) {
    next(errors.errorPage(404, "Not found."));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    err.statusCode = err.statusCode || 500;
    res.status(err.statusCode);

    if (!!err.renderHTML) {
        var route = "error";
        if (typeof err.renderHTML === "string") {
            route = err.renderHTML;
        }

        // render the error page
        res.render(route);
    }
    else {
        res.send({
            statusCode: err.statusCode,
            message: err.message,
            extendedCode: err.extendedCode
        });
    }
});

module.exports = app;
