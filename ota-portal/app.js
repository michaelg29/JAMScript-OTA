const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const errors = require("./utils/httperror");

const auth = require("./routes/auth");
const nodesRouter = require("./routes/nodes");
const nodeAuthRouter = require("./routes/nodeAuth");
const nodeUnauthRouter = require("./routes/nodeUnauth");
const networksRouter = require("./routes/networks");

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

// unauthorized requests
app.use("/nodes", nodeUnauthRouter);

// authorization
app.use(auth);

// index redirect
app.get("/", (req, res) => {
    res.render('index', {
        name: req.user.name
    });
});

app.use("/nodes", nodesRouter);
app.use("/nodes", nodeAuthRouter);
app.use("/networks", networksRouter);

app.use(function (req, res, next) {
    next(errors.errorObj(404, "Not found."));
});

// error handler
app.use(function (err, req, res, next) {
    const isDevelopment = req.app.get("env") === "development";
    if (isDevelopment) {
        console.log(err);
    }
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = isDevelopment ? err : {};

    err.statusCode = err.statusCode || 500;
    res.status(err.statusCode);

    const returnType = req.headers.accept;
    if (returnType === "application/json") {
        res.send({
            statusCode: err.statusCode,
            message: err.message,
            error: isDevelopment ? err : {}
        });
    }
    else if (returnType.includes("html")) {
        var route = "error";
        if (err.renderHTML && typeof err.renderHTML === "string") {
            route = err.renderHTML;
        }

        // render the error page
        res.render(route);
    }
    else {
        res.send(err.message + "\n");
    }
});

module.exports = app;
