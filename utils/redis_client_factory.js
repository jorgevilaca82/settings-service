const Redis = require("ioredis");

let redisClient

function clientFactory() {
    if (typeof client === 'undefined') {
        var redisConfig = { port: 6379, host: "localhost" }
        redisClient = new Redis(redisConfig)
    }
    return redisClient
}

module.exports = { clientFactory }