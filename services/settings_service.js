var clientFactory = require('../utils/redis_client_factory').clientFactory;
var Setting = require('../models/setting')

class SettingsService {
    constructor(app, subject_type = null, subject_scope = null) {
        this.client = clientFactory()

        this.setting = new Setting(app.appId, subject_type, subject_scope)
        if (subject_type !== null) {
            this.#addSubject(subject_type)
        }

    }

    #addSubject(subject) {
        this.client.sadd(`${this.setting.getAppPrefix()}:__subjects__`, subject)
    }

    listAllSubjects() {
        const subjectKeys = `${this.setting.getAppPrefix()}:__subjects__`
        return this.client.smembers(subjectKeys)
    }

    async getSettingValue(key) {
        // TODO: if the key doesent exist get the default value from meta data
        const prefix = this.setting.getPrefix()

        return await this.client.hget(prefix, key)
    }

    async #addMember(key) {
        const prefix = this.setting.getSubjecMembersPrefix()
        await this.client.sadd(prefix, key)
    }

    async getAllExistentSettingKeys() {
        const prefix = this.setting.getSubjecMembersPrefix()
        return await this.client.smembers(prefix)
    }

    async setSettingValue(key, value) {
        // await this.#addMember(key)
        const prefix = this.setting.getPrefix()
        return await this.client.hset(prefix, key, value)
    }

    async addMetaData(key, metaData) {
        await this.#addMember(key)
        const settingKey = this.setting.getMetaKey(key)
        return await this.client.hset(settingKey, metaData)
    }

    async getKeyMetaData(key) {
        const settingKey = this.setting.getMetaKey(key)
        return await this.client.hgetall(settingKey)
    }

    async getAllDefinedSettings() {
        const prefix = this.setting.getPrefix()
        return await this.client.hgetall(prefix)
    }

    async getAllSettings() {
        const allSettings = await this.getAllDefinedSettings()
        const allMembers = await this.getAllExistentSettingKeys()
        const missing = {}

        for (const key in allMembers) {
            let settingKey = allMembers[key]
            if (!allSettings.hasOwnProperty(settingKey)) {
                const { defaultValue } = await this.getKeyMetaData(settingKey)
                missing[settingKey] = defaultValue
            }
        }

        return { ...missing, ...allSettings }
    }
}

module.exports = SettingsService