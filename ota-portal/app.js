const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
const errors = require("./utils/httperror");

// middleware and router includes
const auth = require("./routes/auth");
const nodeListRouter = require("./routes/nodeList");
const nodeRouter = require("./routes/nodes");
const networksRouter = require("./routes/networks");
const networkChannelsRouter = require("./routes/networkChannels");
const networkRegistrationsRouter = require("./routes/networkRegistrations");

// create application
var app = express();

// basic middleware
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

// authorization middleware
app.use(auth);

// index redirect
app.get("/", (req, res) => {
    res.render('index', {
        name: req.user.name
    });
});

// register middleware
app.use("/nodes", nodeRouter);
app.use("/nodes", nodeListRouter);
app.use("/networks", networksRouter);
app.use("/networks", networkChannelsRouter);
app.use("/networks", networkRegistrationsRouter);

// not found handler
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

    // set status code
    err.statusCode = err.statusCode || 500;
    res.status(err.statusCode);

    // wrap content in specific content type
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
