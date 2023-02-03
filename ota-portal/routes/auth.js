var express = require('express');
var router = express.Router();
var errors = require('../httperror');

var rclient = require('../redis-client');

function encryptToken(token) {
    var b = Buffer.from(JSON.stringify(token));

    return b.toString("base64");
}

function decryptToken(token) {
    var b = Buffer.from(token, "base64");

    return JSON.parse(b.toString());
}

router.use(async function(req, res, next) {
    if (req.url == '/login') {
        next();
        return;
    }

    let httperror = undefined;

    try {
        if (!req.cookies['jamota-token']) {
            errors.error(401, "Missing token.");
        }

        // decrypt token
        const token = req.cookies['jamota-token'];

        // parse token and ensure has required fields
        const tokenUser = decryptToken(token);
        if (!tokenUser || !tokenUser.curSession || !tokenUser.username) {
            errors.error(401, "Invalid token.");
        }

        [err, userEntry] = await rclient('hgetall', [`user:${tokenUser.username}`]);

        req.user = {
            id: userEntry.id,
            username: tokenUser.username,
            curSession: tokenUser.curSession,
            name: userEntry.name
        }
    } catch (error) {
        httperror = error;
    }

    if (!httperror) {
        next();
    }
    else {
        res.clearCookie("jamota-token");

        if (req.method === "GET") {
            res.redirect("/login");
        } else {
            next(errors.createHttpError(httperror));
        }
    }
});

router.get("/login", function(req, res, next) {
    if (req.user) {
        res.redirect("/");
    }
    else {
        res.send(
            '<form action="/login" method="POST">'
            + '<h2>Login</h2>'
            + '<p><input name="username"></p>'
            + '<p><input type="password" name="password"></p>'
            + '<p><input type="submit" value="Login"></p>'
            + '<p style="color: red;"></p>'
            + '</form>'
        );
    }
});

router.post("/login", async function(req, res, next) {
    if (req.user) {
        res.sendStatus(200);
        return;
    }

    let httperror = undefined;

    try {
        if (!req.body || !req.body.username || !req.body.password) {
            errors.error(400, 'Invalid input.');
        }

        const reqUsr = req.body.username;
        const reqPwd = req.body.password;
        
        [err, reply] = await rclient("keys", [`user:${reqUsr}`]);
        if (!reply || reply.length === 0) {
            errors.error(404, `User not found.`);
        }

        [err, reply] = await rclient("hget", [`user:${reqUsr}`, "password"]);
        if (!reply || reply !== reqPwd) {
            errors.error(403, 'Incorrect password.');
        }

        // generate session token
        const curSession = "abcd";
        const curSessionExpiry = Date.now() + 30000;

        [err, reply] = await rclient("hset", [`user:${reqUsr}`, "curSession", curSession, "curSessionExpiry", curSessionExpiry]);

        const session = {
            "username": reqUsr,
            "curSession": curSession
        };
        res.cookie("jamota-token", encryptToken(session));
        res.cookie("jamota-token-expiry", curSessionExpiry);
    } catch (error) {
        httperror = error;
    }

    if (!httperror) {
        res.redirect("/");
    }
    else {
        next(errors.createHttpError(httperror));
    }
});

module.exports = router;
