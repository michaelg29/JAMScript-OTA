var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var path = require('path');
var createError = require('http-errors');

var auth = require('./routes/auth');
var deviceRouter = require('./routes/device');

var rclient = require('./redis-client');

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

    [err, reply] = await rclient(query[0], queryArgs);
    processRedisResponse(res, err, reply);
});

app.use("/device", deviceRouter);

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
