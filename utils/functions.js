const { randomBytes, randomUUID } = require('crypto')

function createApp(name) {
    return {
        name,
        appId: randomUUID(),
        passKey: createPassKey()
    };

}

function createPassKey() {
    return randomBytes(32).toString("hex");
}


function pick(obj, ...props) {
    return props.reduce(function (result, prop) {
        result[prop] = obj[prop];
        return result;
    }, {});
}

module.exports = {createApp}