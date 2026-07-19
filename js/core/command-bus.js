(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    if (DoMotions.CommandBus) { return; }

    // Command factory namespace — modules attach their command constructors here
    DoMotions.Commands = DoMotions.Commands || {};

    var _bridge = null;
    var _history = [];
    var _listeners = {};       // event → [callback, …]
    var _initialized = false;

    var HISTORY_CAP = 100;

    /**
     * Fire all listeners for a given event.
     * @param {string} event
     * @param {*} data
     */
    function _fire(event, data) {
        if (!_listeners[event]) return;
        _listeners[event].forEach(function (cb) {
            try { cb(data); } catch (e) {
                console.error('[DoMotions:CommandBus] Listener error on "' + event + '":', e);
            }
        });
    }

    /**
     * Append an entry to history, respecting the cap.
     * @param {object} entry  { command, result, error, timestamp }
     */
    function _log(entry) {
        _history.push(entry);
        if (_history.length > HISTORY_CAP) {
            _history.shift();
        }
    }

    DoMotions.CommandBus = {

        /**
         * Initialize the command bus.
         * @param {object} bridge  DoMotions.Bridge instance
         */
        initialize: function (bridge) {
            if (_initialized) {
                console.warn('[DoMotions:CommandBus] Already initialized.');
                return;
            }
            _bridge = bridge;
            _history = [];
            _listeners = {};
            _initialized = true;
            console.log('[DoMotions:CommandBus] Initialized.');
        },

        /**
         * Dispatch a command through the bridge.
         *
         * A command object should have:
         *   target  {string}              e.g. 'easing.applyEase'
         *   payload {object}              data for the ExtendScript side
         *   validate {function} [optional] returns true or throws
         *
         * @param {object} command
         * @returns {Promise<*>}
         */
        dispatch: function (command) {
            if (!_bridge) {
                return Promise.reject(new Error('[DoMotions:CommandBus] Not initialized.'));
            }
            if (!command || !command.target) {
                return Promise.reject(new Error('[DoMotions:CommandBus] Invalid command — missing target.'));
            }

            // ── Validation ──────────────────────────────────────
            if (typeof command.validate === 'function') {
                try {
                    var valid = command.validate();
                    if (valid === false) {
                        var validationError = new Error('[DoMotions:CommandBus] Command validation failed for: ' + command.target);
                        _fire('error', { command: command, error: validationError });
                        return Promise.reject(validationError);
                    }
                } catch (e) {
                    _fire('error', { command: command, error: e });
                    return Promise.reject(e);
                }
            }

            // ── Before ─────────────────────────────────────────
            _fire('before', { command: command });

            // ── Execute ─────────────────────────────────────────
            var timestamp = Date.now();

            return _bridge.call(command.target, command.payload)
                .then(function (result) {
                    var entry = {
                        command: command,
                        result: result,
                        error: null,
                        timestamp: timestamp
                    };
                    _log(entry);
                    _fire('after', entry);
                    return result;
                })
                .catch(function (err) {
                    var entry = {
                        command: command,
                        result: null,
                        error: err,
                        timestamp: timestamp
                    };
                    _log(entry);
                    _fire('error', entry);
                    throw err;
                });
        },

        /**
         * Subscribe to command lifecycle events.
         * @param {string} event     'before' | 'after' | 'error'
         * @param {function} callback
         */
        on: function (event, callback) {
            if (!_listeners[event]) {
                _listeners[event] = [];
            }
            _listeners[event].push(callback);
        },

        /**
         * Unsubscribe from a command lifecycle event.
         * @param {string} event
         * @param {function} callback
         */
        off: function (event, callback) {
            if (!_listeners[event]) return;
            _listeners[event] = _listeners[event].filter(function (cb) {
                return cb !== callback;
            });
        },

        /**
         * Get the last N history entries.
         * @param {number} [count]  Number of entries. Defaults to all.
         * @returns {Array<{command, result, error, timestamp}>}
         */
        getHistory: function (count) {
            if (typeof count === 'number' && count > 0) {
                return _history.slice(-count);
            }
            return _history.slice();
        }
    };
})();
