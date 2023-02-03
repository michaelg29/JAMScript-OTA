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

module.exports = execute;
