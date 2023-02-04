const redis = require('redis');
const rclient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_MASTERPWD
});

async function execute(command, args) {
    var p = new Promise((resolve, reject) => {
        rclient.send_command(command, args, function(err, res) {
            resolve([err, res]);
        });
    });
    return p;
}

async function setObj(key, obj) {
    const args = [key];

    Object.keys(obj).forEach((attr) => {
        args.push(attr);
        args.push(obj[attr]);
    });

    return await execute("hset", args);
}

async function getObj(key) {
    return await execute("hgetall", [key]);
}

module.exports = {
    execute: execute,
    setObj: setObj,
    getObj: getObj,
};
