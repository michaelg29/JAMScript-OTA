const express = require('express');
const router = express.Router();
const errors = require('../utils/httperror');

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

        [err, userEntry] = await rclient.getObj("user:" + tokenUser.username);
        if (tokenUser.curSession !== userEntry.curSession) {
            errors.error(401, "Invalid token.");
        }
        else if (userEntry.curSessionExpiry < Date.now()) {
            errors.error(401, "Session expired");
        }

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

        res.redirect("/login");
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
        [err, reply] = await rclient.execute("keys", [userKey]);
        if (reply && reply.length !== 0) {
            errors.error(400, `Username exists.`);
        }

        // generate password hash
        const passSalt = crypto.randomBytes(16).toString("hex");
        const passHash = crypto
            .createHmac("sha512", passSalt)
            .update(req.body.password)
            .digest("hex");

        // create user entry
        [err, reply] = await rclient.setObj(userKey, {
            email: req.body.email,
            passHash: passHash,
            passSalt: passSalt,
            name: req.body.name,
            type: "user",
            curSession: "",
            curSessionExpiry: 0
        });
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
        
        [err, reply] = await rclient.execute("keys", [userKey]);
        if (!reply || reply.length === 0) {
            errors.error(404, `User not found.`);
        }

        // generate password hash
        [err, reply] = await rclient.getObj(userKey);
        const passHash = crypto
            .createHmac("sha512", reply.passSalt)
            .update(req.body.password)
            .digest("hex");

        if (!reply || passHash !== reply.passHash) {
            errors.error(403, 'Incorrect password.');
        }

        if (reply.curSession && reply.curSessionExpiry > Date.now()) {
            errors.error(400, "User already logged in.");
        }

        // generate session token
        const curSession = base64url.encode(crypto.randomBytes(16));
        const curSessionExpiry = Date.now() + 30000;

        // update session token in DB
        [err, reply] = await rclient.setObj(userKey, {
            curSession: curSession,
            curSessionExpiry: curSessionExpiry
        });

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
    if (req.user) {
        res.clearCookie("jamota-token");
        res.clearCookie("jamota-token-expiry");

        const userKey = "user:" + req.user.username;

        [err, reply] = await rclient.setObj(userKey, {
            curSession: "",
            curSessionExpiry: 0
        });
    }

    res.redirect("/login");
});

module.exports = router;
