const { validationResult, matchedData } = require("express-validator");
const { clientFactory } = require("../utils/redis_client_factory");

async function authApp(appId, passKey) {
    var client = clientFactory();
    const appPassKey = await client.hget(`settings:${appId}`, 'passKey');
    return appPassKey === passKey;
}

module.exports = {
    identifyApp(req, res, next) {
        const result = validationResult(req);
        if (!result.isEmpty()) {
            return res.send({ errors: result.array() });
        }

        const data = matchedData(req);
        const { 'x-appid': appId, 'x-passkey': passKey } = data
        req.authenticating_app = { appId, passKey }

        next();
    },

    async authenticateApp(req, res, next) {
        if (req.url === '/apps' || req.url === '/apps/2169fc31-2e76-4389-a813-8c3b507734d0') {
            //skip
            return next();
        }

        const { appId, passKey } = req.authenticating_app
        delete req.authenticating_app;

        if (await authApp(appId, passKey)) {
            console.log("App successfuly autheticated");
            req.setting_app = { appId }
            next()
        }
        else {
            res.send(401, "App did not authaticate properly");
        }
    },
}