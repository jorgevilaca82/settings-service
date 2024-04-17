var express = require('express');
var router = express.Router();

var clientFactory = require('../utils/redis_client_factory').clientFactory;
var SettingsService = require('../services/settings_service')
var Subject = require('../models/subject')
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

router.post("/apps", async function (req, res, next) {
    let name = req.body.name
    const masterKey = req.headers['x-masterkey'];
    if (masterKey === MASTER_KEY) {
        var client = clientFactory();

        const newApp = createApp(name)
        registerApp(client, { name, ...newApp })
        res.send({ name, ...newApp })
    }
    else {
        res.send(403, 'Forbidden')
    }
});

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


router.post('/', async function (req, res, next) {
    var client = clientFactory();

    const subject_type = req.body.subject
    const key = req.body.key
    const defaultValue = req.body.defaultValue
    const private = req.body.private

    const appId = req.headers['x-appid'];

    const app = await client.hgetall(`settings:${appId}`);

    const settingsService = new SettingsService({ appId, ...app }, subject_type);
    const result = await settingsService.addMetaData(key, { defaultValue, private });
    console.log(result);

    res.send("ok");
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

router.post('/define', async function(req, res, next) {
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