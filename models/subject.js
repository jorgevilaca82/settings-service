
class Subject {
    #type = null
    #scope = null
    /**
     * Create a subject with type and scope
     * If no scope is provided it will be at GLOBAL_SCOPE
     * 
     * Examples:
     * > s = new Subject("store")
     * > Subject { type: 'store', scope: null }
     * > s.getId()
     * > "store"
     * 
     * > s = new Subject("store", "12345")
     * > Subject { type: 'store', scope: '12345' }
     * > s.getId()
     * > "store:12345"
     * 
     * @param {string} type 
     * @param {string} scope 
     */
    constructor(type, scope = null) {
        this.#type = type
        this.#scope = scope
    }

    getType() {
        return this.#type
    }

    getScope() {
        return this.#scope
    }

    getScopedId() {
        return [this.#type, this.#scope].join(':')
    }
}

module.exports = Subject