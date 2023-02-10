const express = require('express');
const router = express.Router();
const errors = require('../utils/httperror');
const rclient = require('../utils/redis-client');

const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = !!process.env.PORTAL_TOKEN_ENC_KEY
    ? Buffer.from(process.env.PORTAL_TOKEN_ENC_KEY)
    : crypto.randomBytes(16);
const iv = !!process.env.PORTAL_TOKEN_ENC_IV
    ? Buffer.from(process.env.PORTAL_TOKEN_ENC_IV)
    : crypto.randomBytes(8);

const tokenCookieName = "jamota-token";
const tokenExpiryCookieName = "jamota-token-expiry";

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

async function refreshToken(username, userKey) {
    // generate session token
    const curSession = base64url.encode(crypto.randomBytes(16));
    const curSessionExpiry = Date.now() + 30 * 60000;

    // update session token in DB
    [err, reply] = await rclient.setObj(userKey, {
        curSession: curSession,
        curSessionExpiry: curSessionExpiry
    });

    // return encrypted token
    const session = {
        "username": username,
        "curSession": curSession
    };

    return {
        token: encryptToken(session),
        expiry: curSessionExpiry
    };
}

async function logout(req, res) {
    if (req.user) {
        res.clearCookie(tokenCookieName);
        res.clearCookie(tokenExpiryCookieName);

        const userKey = "user:" + req.user.username;

        [err, reply] = await rclient.setObj(userKey, {
            curSession: "",
            curSessionExpiry: 0
        });
    }
}

// access token decoder
router.use(errors.asyncWrap(async function(req, res, next) {
    if (req.url === "/login" || req.url === "/createAccount") {
        next();
        return;
    }

    const token = req.headers.authorization || req.cookies[tokenCookieName];
    if (!token) {
        errors.error(401, "", "login");
    }

    // decrypt and parse parse token and ensure has required fields
    const tokenUser = decryptToken(token);
    if (!tokenUser || !tokenUser.curSession || !tokenUser.username) {
        errors.error(401, "Invalid session", "login");
    }

    // validate current session
    const userKey = "user:" + tokenUser.username;
    [err, userEntry] = await rclient.getObj(userKey);
    if (tokenUser.curSession !== userEntry.curSession) {
        errors.error(401, "Invalid session", "login");
    }
    else if (userEntry.curSessionExpiry < Date.now()) {
        errors.error(401, "Session expired", "login");
    }

    // set user object in web server
    req.user = {
        id: userEntry.id,
        username: tokenUser.username,
        curSession: tokenUser.curSession,
        name: userEntry.name
    }

    next();
}));

router.post("/refreshToken", async function(req, res, next) {
    if (req.user) {
        const userKey = "user:" + req.user.username;

        const token = await refreshToken(req.user.username, userKey);

        res.cookie(tokenCookieName, token.token);
        res.cookie(tokenExpiryCookieName, token.expiry);

        res.status(200).send(token);
    } else {
        next(errors.errorObj(401, "Not authorized to refresh an access token."));
    }
});

// registration form
router.get("/createAccount", function(req, res, next) {
    res.render("createAccount");
});

// create account request
router.post("/createAccount", errors.asyncWrap(async function(req, res, next) {
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

    res.redirect("/login");
}));

// login form
router.get("/login", function(req, res, next) {
    if (req.user) {
        res.redirect("/");
    }
    else {
        res.render("login");
    }
});

// login request
router.post("/login", errors.asyncWrap(async function(req, res, next) {
    if (req.user) {
        res.sendStatus(200);
        return;
    }

    if (!req.body || !req.body.username || !req.body.password) {
        errors.error(400, 'Invalid input.');
    }

    const userKey = "user:" + req.body.username;

    [err, reply] = await rclient.execute("keys", [userKey]);
    if (!reply || reply.length === 0) {
        errors.error(404, "User not found.", "login");
    }

    // generate password hash
    [err, reply] = await rclient.getObj(userKey);
    if (reply.curSession && reply.curSessionExpiry > Date.now()) {
        errors.error(400, "User already logged in.", "login");
    }

    const passHash = crypto
        .createHmac("sha512", reply.passSalt)
        .update(req.body.password)
        .digest("hex");

    if (!reply || passHash !== reply.passHash) {
        errors.error(403, "Incorrect password.", "login");
    }

    // generate session token
    const newToken = await refreshToken(req.body.username, userKey);
    res.cookie(tokenCookieName, newToken.token);
    res.cookie(tokenExpiryCookieName, newToken.expiry);

    res.redirect("/");
}));

// logout
router.all("/logout", async function(req, res, next) {
    logout(req, res);
    res.redirect("/login");
});

module.exports = router;
