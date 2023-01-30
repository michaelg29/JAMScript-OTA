var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var path = require('path');
var createError = require('http-errors');

var redis = require('redis');
var rclient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_MASTERPWD
});

var app = express();

// middleware
app.use(logger('dev'));
app.use(express.text({
    type: 'text/*'
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

// index redirect
app.get("/", (req, res) => {
    res.render('index', {
        name: 'admin'
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

app.post("/query", (req, res) => {
    let query = req.body.split(' ');
    let queryArgs = query.slice(1);

    rclient.send_command(query[0], queryArgs, (err, reply) => {
        processRedisResponse(res, err, reply);
    });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
