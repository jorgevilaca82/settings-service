var Subject = require('../models/subject')

class Setting {
    static SETTINGS_PREFIX = "settings"

    constructor(appId, subject_type, subject_scope, prefix = Setting.SETTINGS_PREFIX) {
        this.appId = appId
        this.subject = new Subject(subject_type, subject_scope)
        this.prefix = prefix
    }

    getAppPrefix() {
        return [this.prefix, this.appId].join(":")
    }


    getPrefix() {
        // const visibility = false ? "private" : "public"
        return [this.getAppPrefix(), this.subject.getScopedId()].join(":")
    }

    getMetaPrefix() {
        return [this.getAppPrefix(), this.subject.getType(), "__meta__"].join(":")

    }

    getKey(suffix) {
        if(this.subject.getScope() === null) {
            throw new Error("Cannot get key from an uscoped setting.")
        }

        return `${this.getPrefix()}:${suffix}`
    }

    getMetaKey(suffix) {
        return `${this.getMetaPrefix()}:${suffix}`
    }
}

module.exports = Setting

// var ss = new Setting("xpto9999", "store")
// ss.getAppPrefix()
// ss.getMetaPrefix()
// ss.getMetaKey("show_message")
// ss.getKey("show_message") // throw error "Cannot get key from an uscoped setting"

// var ss = new Setting("xpto9999", "store", "12345")
// ss.getAppPrefix()
// ss.getMetaPrefix()
// ss.getMetaKey("show_message")
// ss.getKey("show_message")