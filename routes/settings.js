var express = require('express');
var router = express.Router();

var clientFactory = require('../utils/redis_client_factory').clientFactory;
var SettingsService = require('../services/settings_service')
const { header, body, validationResult, matchedData, checkSchema } = require('express-validator');
const { createApp } = require('../utils/functions')
const { validateSettingDefinition, validateSettingMetadata } = require('../validations')

const MASTER_KEY = 'xpto';

async function registerApp(client, { name, appId, passKey }) {
    await client.sadd("settings_apps", appId);
    await client.hset(`settings:${appId}`, "name", name, "passKey", passKey);
}

async function authApp(appId, passKey) {
    var client = clientFactory();
    const appPassKey = await client.hget(`settings:${appId}`, 'passKey');
    return appPassKey === passKey;
}

const checkAppIdHeader = () =>
    header('x-appid')
        .notEmpty()
        .withMessage("Missing X-AppID");

const checkAppPassKeyHeader = () =>
    header('x-passkey')
        .notEmpty()
        .withMessage("Missing X-PassKey");

router.use(checkAppIdHeader(), checkAppPassKeyHeader(), function (req, res, next) {
    const result = validationResult(req);
    if (!result.isEmpty()) {
        return res.send({ errors: result.array() });
    }

    const data = matchedData(req);
    const { 'x-appid': appId, 'x-passkey': passKey } = data
    req.authenticating_app = { appId, passKey }

    next();
});

// app authetication middleware
router.use(async function (req, res, next) {
    if (req.url === '/apps' || req.url === '/apps/2169fc31-2e76-4389-a813-8c3b507734d0') {
        //skip
        return next();
    }

    const { appId, passKey } = req.authenticating_app
    delete  req.authenticating_app;

    if (await authApp(appId, passKey)) {
        console.log("App successfuly autheticated");
        req.setting_app = { appId }
        next()
    }
    else {
        res.send(401, "App did not authaticate properly");
    }
})

const checkMasterKeyHeader = () => header('x-masterkey')
    .notEmpty()
    .withMessage("Missing X-MasterKey")
    .equals(MASTER_KEY);

const checkAppName = () => body('name')
    .notEmpty().withMessage('Should not be empty.')
    .isLength({ min: 1, max: 64 }).withMessage("Length should be between 1 and 64 characters.");

router.post("/apps", checkMasterKeyHeader(), checkAppName(),
    async function (req, res, next) {

        const result = validationResult(req);
        if (result.isEmpty()) {
            const data = matchedData(req);
            let name = data.name
            var client = clientFactory();

            const newApp = createApp(name)
            registerApp(client, { name, ...newApp })
            return res.send({ name, ...newApp })
        }

        res.send({ errors: result.array() });
    }
);

router.get('/apps', async function (req, res, next) {
    var client = clientFactory();
    const result = await client.smembers('settings_apps');
    res.send(result);
});

router.get('/apps/:appId', async function (req, res, next) {
    var client = clientFactory();
    const result = await client.hgetall(`settings:${req.params.appId}`);
    res.send(result);

});

const getAppResource = async (req) => {
    var client = clientFactory();

    const appId = req.headers['x-appid'];

    const app = await client.hgetall(`settings:${appId}`);

    return { appId, ...app };
}

router.post('/', validateSettingMetadata(), async function (req, res, next) {

    const validationRes = validationResult(req);
    if (validationRes.isEmpty()) {
        const data = matchedData(req);

        let unwrap = ({ private, defaultValue }) => ({ private, defaultValue });

        const settingsService = new SettingsService(req.setting_app, data.subject);
        const result = await settingsService.addMetaData(data.key, unwrap(data));

        return res.send("ok");
    }

    return res.send({ errors: validationRes.array() });
});

/**
 * List all app subjects
 */
router.get('/subjects', async function (req, res, next) {
    const service = new SettingsService(req.setting_app)
    const result = await service.listAllSubjects()

    res.send(result);
});

/**
 * List all subject existent setting keys
 */
router.get('/subjects/:subject/keys', async function (req, res, next) {
    const service = new SettingsService(req.setting_app, req.params.subject)
    const result = await service.getAllExistentSettingKeys()

    res.send(result);
});

/**
 * Show metada about a specific setting key
 */
router.get('/subjects/:subject/:key/meta', async function (req, res, next) {
    const { subject, key } = req.params;

    const service = new SettingsService(req.setting_app, subject)
    const result = await service.getKeyMetaData(key)

    res.send(result);
});


router.post('/define', validateSettingDefinition(), async function (req, res, next) {
    // TODO: Check metadata if exist before create. if not create default metadata

    const validationRes = validationResult(req);
    if (validationRes.isEmpty()) {
        const { subject_type, subject_scope, key, value } = matchedData(req);
        const service = new SettingsService(req.setting_app, subject_type, subject_scope);
        const result = await service.setSettingValue(key, value);
        const setting = await service.getSettingValue(key);

        return res.send(setting);
    }

    return res.send({ errors: validationRes.array() });
});

router.get('/:subject_type/:subject_scope', async function (req, res, next) {
    const { subject_type, subject_scope } = req.params;
    // TODO: Check metadata if exist before create. if not create default metadata
    const service = new SettingsService(req.setting_app, subject_type, subject_scope);
    const result = await service.getAllSettings()

    res.send(result);
});

module.exports = router;