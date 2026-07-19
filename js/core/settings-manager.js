(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    if (DoMotions.SettingsManager) { return; }

    var STORAGE_KEY = 'domotions-user-settings';

    var _defaults = {};
    var _user = {};
    var _session = {};
    var _schemas = {};        // moduleId → schema
    var _listeners = {};      // key → [callback, …]
    var _initialized = false;

    /* ── Helpers ──────────────────────────────────────────────── */

    /**
     * Walk an object tree by dot-notation key and return the value.
     * @param {object} obj
     * @param {string} key   e.g. 'ui.theme' or 'easing.defaultCurve'
     * @returns {*} value or undefined
     */
    function _resolveKey(obj, key) {
        if (!obj || typeof key !== 'string') return undefined;
        var parts = key.split('.');
        var current = obj;
        for (var i = 0; i < parts.length; i++) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }
            current = current[parts[i]];
        }
        return current;
    }

    /**
     * Set a value in an object tree by dot-notation key, creating
     * intermediate objects as needed.
     * @param {object} obj
     * @param {string} key
     * @param {*} value
     */
    function _setKey(obj, key, value) {
        var parts = key.split('.');
        var current = obj;
        for (var i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] === undefined || typeof current[parts[i]] !== 'object') {
                current[parts[i]] = {};
            }
            current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
    }

    /**
     * Delete a value from an object tree by dot-notation key.
     * @param {object} obj
     * @param {string} key
     */
    function _deleteKey(obj, key) {
        var parts = key.split('.');
        var current = obj;
        for (var i = 0; i < parts.length - 1; i++) {
            if (current[parts[i]] === undefined || typeof current[parts[i]] !== 'object') {
                return; // path doesn't exist
            }
            current = current[parts[i]];
        }
        delete current[parts[parts.length - 1]];
    }

    /**
     * Deep clone a plain object / array.
     */
    function _deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Read a local JSON file. Uses XMLHttpRequest instead of fetch() because
     * CEP loads the panel over the file:// scheme, which the Fetch API refuses
     * to service. XHR works for file:// when --allow-file-access(-from-files)
     * is set in the manifest CEFCommandLine.
     * @param {string} url  Relative path, e.g. './config/defaults.json'
     * @returns {Promise<object>}
     */
    function _readJSON(url) {
        return new Promise(function (resolve, reject) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState !== 4) return;
                    // file:// requests report status 0 on success
                    if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch (e) {
                            reject(new Error('Invalid JSON in ' + url + ': ' + e.message));
                        }
                    } else {
                        reject(new Error('HTTP ' + xhr.status + ' loading ' + url));
                    }
                };
                xhr.onerror = function () {
                    reject(new Error('Network error loading ' + url));
                };
                xhr.send(null);
            } catch (e) {
                reject(e);
            }
        });
    }
    // Expose for other modules that need to read local JSON (e.g. Settings).
    DoMotions._readJSON = _readJSON;

    /**
     * Load user overrides from localStorage.
     */
    function _loadUser() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                _user = JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[DoMotions:Settings] Failed to parse user settings from localStorage:', e);
            _user = {};
        }
    }

    /**
     * Persist user overrides to localStorage.
     */
    function _saveUser() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_user));
        } catch (e) {
            console.warn('[DoMotions:Settings] Failed to save user settings to localStorage:', e);
        }
    }

    /**
     * Fire onChange callbacks for the given key.
     * @param {string} key
     * @param {*} newValue
     * @param {*} oldValue
     */
    function _fireChange(key, newValue, oldValue) {
        // Fire exact-key listeners
        if (_listeners[key]) {
            _listeners[key].forEach(function (cb) {
                try { cb(newValue, oldValue, key); } catch (e) {
                    console.error('[DoMotions:Settings] onChange callback error for key "' + key + '":', e);
                }
            });
        }
        // Fire wildcard listeners
        if (_listeners['*']) {
            _listeners['*'].forEach(function (cb) {
                try { cb(newValue, oldValue, key); } catch (e) {
                    console.error('[DoMotions:Settings] onChange wildcard callback error:', e);
                }
            });
        }
    }

    /* ── Public API ──────────────────────────────────────────── */

    DoMotions.SettingsManager = {

        /**
         * Initialize the settings manager.
         * Fetches defaults.json, loads user overrides from localStorage.
         * @returns {Promise<void>}
         */
        initialize: function () {
            if (_initialized) {
                console.warn('[DoMotions:Settings] Already initialized.');
                return Promise.resolve();
            }

            _loadUser();

            return _readJSON('./config/defaults.json')
                .then(function (json) {
                    _defaults = json;
                    _initialized = true;
                    console.log('[DoMotions:Settings] Initialized with defaults.');
                })
                .catch(function (err) {
                    console.warn('[DoMotions:Settings] Could not load defaults.json — using empty defaults.', err);
                    _defaults = {};
                    _initialized = true;
                });
        },

        /**
         * Get a setting value. Resolution order: session → user → defaults.
         * @param {string} key  Dot-notation key, e.g. 'ui.theme'
         * @returns {*}
         */
        get: function (key) {
            var val = _resolveKey(_session, key);
            if (val !== undefined) return _deepClone(val);

            val = _resolveKey(_user, key);
            if (val !== undefined) return _deepClone(val);

            val = _resolveKey(_defaults, key);
            if (val !== undefined) return _deepClone(val);

            return undefined;
        },

        /**
         * Set a user override and persist to localStorage.
         * Fires onChange callbacks.
         * @param {string} key
         * @param {*} value
         */
        set: function (key, value) {
            var oldValue = this.get(key);
            _setKey(_user, key, value);
            _saveUser();
            var newValue = this.get(key);
            _fireChange(key, newValue, oldValue);
        },

        /**
         * Set a session-only override (in-memory, not persisted).
         * Fires onChange callbacks.
         * @param {string} key
         * @param {*} value
         */
        setSession: function (key, value) {
            var oldValue = this.get(key);
            _setKey(_session, key, value);
            var newValue = this.get(key);
            _fireChange(key, newValue, oldValue);
        },

        /**
         * Remove a user override for a key, falling back to the default.
         * Fires onChange callbacks.
         * @param {string} key
         */
        reset: function (key) {
            var oldValue = this.get(key);
            _deleteKey(_user, key);
            _deleteKey(_session, key);
            _saveUser();
            var newValue = this.get(key);
            _fireChange(key, newValue, oldValue);
        },

        /**
         * Subscribe to changes on a specific key or '*' for all changes.
         * @param {string} key
         * @param {function} callback  (newValue, oldValue, key) => void
         */
        onChange: function (key, callback) {
            if (!_listeners[key]) {
                _listeners[key] = [];
            }
            _listeners[key].push(callback);
        },

        /**
         * Register a settings schema for a module.
         * @param {string} moduleId
         * @param {object} schema  Describes the module's settings shape & UI hints
         */
        registerSchema: function (moduleId, schema) {
            _schemas[moduleId] = schema;
            console.log('[DoMotions:Settings] Schema registered for:', moduleId);
        },

        /**
         * Get all registered schemas.
         * @returns {object}  { moduleId: schema, … }
         */
        getAllSchemas: function () {
            return _deepClone(_schemas);
        }
    };
})();
