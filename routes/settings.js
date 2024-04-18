var express = require('express');
var router = express.Router();

var clientFactory = require('../utils/redis_client_factory').clientFactory;
var SettingsService = require('../services/settings_service')
const { header, body, validationResult, matchedData, checkSchema } = require('express-validator');
const { createApp } = require('../utils/functions')

const MASTER_KEY = 'xpto';

async function registerApp(client, { name, appId, passKey }) {
    await client.sadd("settings_apps", appId);
    await client.hset(`settings:${appId}`, "name", name, "passKey", passKey);
}

async function authApp(client, { appId, passKey }) {
    const appPassKey = await client.hget(`settings:${appId}`, 'passKey');
    return appPassKey === passKey;
}


// app authetication middleware
router.use(async function (req, res, next) {
    console.log(req)
    if(req.url === '/apps' || req.url === '/apps/2169fc31-2e76-4389-a813-8c3b507734d0') {
        //skip
        return next();
    }

    var client = clientFactory();
    const appId = req.headers['x-appid'];
    const passKey = req.headers['x-passkey'];

    if (await authApp(client, { appId, passKey })) {
        console.log("App successfuly autheticated");
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

const validateSettingSchema = () => checkSchema({
    subject: {
        notEmpty: { errorMessage: "Subject is required" },
        isLength: {
            options: { min: 4, max: 32 },
            errorMessage: "Subject lenght is incorrect"
        },
    },
    key: {
        notEmpty: { errorMessage: "Key is required" }
    },
    defaultValue: {
        notEmpty: { errorMessage: "DefaultValue is required" }
    },
    private: {
        isBoolean: { errorMessage: "Private should be boolean" }
    }
});

const getAppResource = async (req) => {
    var client = clientFactory();

    const appId = req.headers['x-appid'];

    const app = await client.hgetall(`settings:${appId}`);

    return {appId, ...app};
}

router.post('/', validateSettingSchema(), async function (req, res, next) {

    const validationRes = validationResult(req);
    if (validationRes.isEmpty()) {
        const data = matchedData(req);

        const app = await getAppResource(req);

        let unwrap = ({private, defaultValue}) => ({private, defaultValue});
    
        const settingsService = new SettingsService(app, data.subject);
        const result = await settingsService.addMetaData(data.key, unwrap(data));
    
        return res.send("ok");
    }

    return res.send({ errors: validationRes.array() });
});

/**
 * List all app subjects
 */
router.get('/subjects', async function (req, res, next) {
    const appId = req.headers['x-appid'];

    const service = new SettingsService({ appId })
    const result = await service.listAllSubjects()

    res.send(result);
});

/**
 * List all subject existent setting keys
 */
router.get('/subjects/:subject/keys', async function (req, res, next) {
    const appId = req.headers['x-appid'];
    const subject = req.params.subject;

    const service = new SettingsService({ appId }, subject)
    const result = await service.getAllExistentSettingKeys()

    res.send(result);
});

/**
 * Show metada about a specific setting key
 */
router.get('/subjects/:subject/:key/meta', async function (req, res, next) {
    const appId = req.headers['x-appid'];
    const subject = req.params.subject;
    const key = req.params.key;

    const service = new SettingsService({ appId }, subject)
    const result = await service.getKeyMetaData(key)

    res.send(result);
});

router.post('/define', async function (req, res, next) {
    const appId = req.headers['x-appid'];
    const subject_type = req.body.subject_type;
    const subject_scope = req.body.subject_scope;
    const value = req.body.value
    const key = req.body.key;

    // TODO: Check metadata if exist before create. if not create default metadata

    const service = new SettingsService({ appId }, subject_type, subject_scope);
    const result = await service.setSettingValue(key, value);

    const setting = await service.getSettingValue(key);

    res.send(setting);
});

router.get('/:subject_type/:subject_scope', async function (req, res, next) {
    const appId = req.headers['x-appid'];
    const subject_type = req.params.subject_type;
    const subject_scope = req.params.subject_scope;


    // TODO: Check metadata if exist before create. if not create default metadata

    const service = new SettingsService({ appId }, subject_type, subject_scope);
    const result = await service.getAllSettings()

    res.send(result);
});

module.exports = router;