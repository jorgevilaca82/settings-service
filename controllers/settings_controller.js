const { validationResult, matchedData } = require("express-validator");
const SettingsService = require("../services/settings_service");
const { clientFactory } = require("../utils/redis_client_factory");
const { createApp } = require("../utils/functions");

async function registerApp(client, { name, appId, passKey }) {
    await client.sadd("settings_apps", appId);
    await client.hset(`settings:${appId}`, "name", name, "passKey", passKey);
}

module.exports = {
    async listAllApps(req, res) {
        var client = clientFactory();
        const result = await client.smembers('settings_apps');
        res.send(result);
    },

    async getAppDetails(req, res, next) {
        var client = clientFactory();
        const result = await client.hgetall(`settings:${req.params.appId}`);
        res.send(result);
    },

    async registerNewApp(req, res, next) {
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
    },

    async createNEwSettingMetadata(req, res, next) {

        const validationRes = validationResult(req);
        if (validationRes.isEmpty()) {
            const data = matchedData(req);
            let unwrap = ({ private, defaultValue }) => ({ private, defaultValue });
            const settingsService = new SettingsService(req.setting_app, data.subject);
            const result = await settingsService.addMetaData(data.key, unwrap(data));

            return res.send("ok");
        }

        return res.send({ errors: validationRes.array() });
    },

    async listAllAppSubjects(req, res, next) {
        const service = new SettingsService(req.setting_app)
        const result = await service.listAllSubjects()

        res.send(result);
    },

    async listAllAppSubjectsSettingKeys(req, res, next) {
        const service = new SettingsService(req.setting_app, req.params.subject)
        const result = await service.getAllExistentSettingKeys()

        res.send(result);
    },

    async showSettingKeyMetadata(req, res, next) {
        const { subject, key } = req.params;
        const service = new SettingsService(req.setting_app, subject)
        const result = await service.getKeyMetaData(key)

        res.send(result);
    },

    async defineNewSetting(req, res, next) {
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
    },

    async getAllScopedSettings(req, res, next) {
        const { subject_type, subject_scope } = req.params;
        // TODO: Check metadata if exist before create. if not create default metadata
        const service = new SettingsService(req.setting_app, subject_type, subject_scope);
        const result = await service.getAllSettings()

        res.send(result);
    }
}