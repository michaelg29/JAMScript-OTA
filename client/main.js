const redis = require('redis');

const client = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_MASTERPWD
});

client.on('error', err => {
    console.log('Error ' + err);
});

client.send_command('incr', ['ctr']);

client.send_command('keys', ['*'], (err, reply) => {
    if (err) throw err;
    console.log(reply);
});
