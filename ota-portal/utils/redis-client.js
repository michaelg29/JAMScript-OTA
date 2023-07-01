const redis = require('redis');
const errors = require('./httperror');
const rclient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_MASTERPWD,
    no_ready_check: true,
    auth_pass: process.env.REDIS_MASTERPWD,
});

var createGUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}

async function execute(command, args) {
    return new Promise((resolve, reject) => {
        rclient.send_command(command, args, function(err, res) {
            resolve([err, res]);
        });
    });
}

/** Set an object in the database. */
async function setObj(key, obj) {
    const args = [key];

    Object.keys(obj).forEach((attr) => {
        args.push(attr);
        args.push(obj[attr]);
    });

    return await execute("hset", args);
}

/** Set an object in the database or throw an error. */
async function setObjOrThrow(key, obj) {
    let [err, redisRes] = await setObj(key, obj);
    if (err) {
        errors.error(500, err);
    }
    return redisRes;
}

async function getObj(key) {
    return await execute("hgetall", [key]);
}

async function del(key) {
    return await execute("del", [key]);
}

async function addToSet(key, item) {
    return await execute("sadd", [key, item]);
}

async function isInSet(key, item) {
    return await execute("sismember", [key, item]);
}

async function getSetMembers(key) {
    return await execute("smembers", [key]);
}

async function removeFromSet(key, item) {
    return await execute("srem", [key, item]);
}

module.exports = {
    createGUID: createGUID,
    execute: execute,
    setObj: setObj,
    setObjOrThrow: setObjOrThrow,
    getObj: getObj,
    del: del,
    addToSet: addToSet,
    isInSet: isInSet,
    getSetMembers: getSetMembers,
    removeFromSet: removeFromSet,
};
