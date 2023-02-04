const express = require('express');
const router = express.Router();
const errors = require('../httperror');

const rclient = require('../redis-client');

const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = !!process.env.PORTAL_TOKEN_ENC_KEY
    ? Buffer.from(process.env.PORTAL_TOKEN_ENC_KEY)
    : crypto.randomBytes(16);
const iv = !!process.env.PORTAL_TOKEN_ENC_IV
    ? Buffer.from(process.env.PORTAL_TOKEN_ENC_IV)
    : crypto.randomBytes(8);

const base64url = require('base64url').default;

function encryptToken(token) {
    // get buffer of string
    var b = Buffer.from(JSON.stringify(token));

    // encrypt buffer
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(b), cipher.final()]);

    // encode buffer to base64
    return base64url.encode(encrypted);
}

function decryptToken(token) {
    // decode buffer from base64
    var b = base64url.toBuffer(token);

    // decrypt buffer
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(b), decipher.final()]);

    // get object from string
    return JSON.parse(decrypted.toString());
}

// access token decoder
router.use(async function(req, res, next) {
    if (req.url === "/login" || req.url === "/createAccount") {
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
            next(httperror);
        }
    }
});

// registration form
router.get("/createAccount", function(req, res, next) {
    res.clearCookie("jamota-token");

    res.send(
        '<form action="/createAccount" method="POST">'
        + '<h2>Create Account</h2>'
        + '<p>Name: <input name="name"></p>'
        + '<p>Email: <input name="email"></p>'
        + '<p>Username: <input name="username"></p>'
        + '<p>Password: <input type="password" name="password"></p>'
        + '<p><input type="submit" value="Create account"></p>'
        + '<p style="color: red;"></p>'
        + '</form>'
    );
});

// create account request
router.post("/createAccount", async function(req, res, next) {
    res.clearCookie("jamota-token");
    let httperror = undefined;

    try {
        if (!req.body || !req.body.email || !req.body.username || !req.body.password || !req.body.name) {
            errors.error(400, "Invalid input.");
        }

        const userKey = "user:" + req.body.username;
        
        // check if user exists
        [err, reply] = await rclient("keys", [userKey]);
        if (reply && reply.length !== 0) {
            errors.error(400, `Username exists.`);
        }

        // create user entry
        [err, reply] = await rclient("hset", [userKey, "email", req.body.email, "password", req.body.password, "name", req.body.name, "type", "user", "curSession", "", "curSessionExpiry", 0]);
        if (err) {
            errors.error(500, "Error creating user");
        }
    } catch(error) {
        httperror = error;
    }

    if (!httperror) {
        res.redirect("/login");
    }
    else {
        next(httperror);
    }
});

// login form
router.get("/login", function(req, res, next) {
    if (req.user) {
        res.redirect("/");
    }
    else {
        res.send(
            '<form action="/login" method="POST">'
            + '<h2>Login</h2>'
            + '<p>Username: <input name="username"></p>'
            + '<p>Password: <input type="password" name="password"></p>'
            + '<p><input type="submit" value="Login"></p>'
            + '<p style="color: red;"></p>'
            + '</form>'
        );
    }
});

// login request
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

        const userKey = "user:" + req.body.username;
        
        [err, reply] = await rclient("keys", [userKey]);
        if (!reply || reply.length === 0) {
            errors.error(404, `User not found.`);
        }

        [err, reply] = await rclient("hget", [userKey, "password"]);
        if (!reply || reply !== req.body.password) {
            errors.error(403, 'Incorrect password.');
        }

        // generate session token
        const curSession = base64url.encode(crypto.randomBytes(16));
        const curSessionExpiry = Date.now() + 30000;

        // update session token in DB
        [err, reply] = await rclient("hset", [userKey, "curSession", curSession, "curSessionExpiry", curSessionExpiry]);

        // return encrypted token
        const session = {
            "username": req.body.username,
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
        next(httperror);
    }
});

// logout
router.all("/logout", async function(req, res, next) {
    res.clearCookie("jamota-token");
    res.clearCookie("jamota-token-expiry");

    if (req.user) {
        res.clearCookie("jamota-token");
        res.clearCookie("jamota-token-expiry");

        const userKey = "user:" + req.user.username;

        [err, reply] = await rclient("hset", [userKey, "curSession", "", "curSessionExpiry", 0]);
    }

    res.redirect("/login");
});

module.exports = router;
