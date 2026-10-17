(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    if (DoMotions.Bridge) { return; }

    var _csInterface = null;
    var _initialized = false;

    /**
     * Escape a string for safe embedding inside an ExtendScript single-quoted
     * string literal.
     * @param {string} str
     * @returns {string}
     */
    function _escapeForJSX(str) {
        return str
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r');
    }

    /**
     * Parse a response from ExtendScript. Attempts JSON.parse first;
     * if that fails, returns the raw string.
     * @param {string} raw
     * @returns {*}
     */
    function _parseResponse(raw) {
        if (raw === 'EvalScript error.' || raw === 'undefined' || raw === undefined) {
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (e) {
            return raw;
        }
    }

    DoMotions.Bridge = {

        /**
         * Initialize the bridge.
         * Stores the CSInterface instance and loads the ExtendScript host file.
         * @param {CSInterface} csInterface
         * @returns {Promise<void>}
         */
        initialize: function (csInterface) {
            if (_initialized) {
                console.warn('[DoMotions:Bridge] Already initialized.');
                return Promise.resolve();
            }

            _csInterface = csInterface;

            // Attempt to load the ExtendScript host via $.evalFile().
            // The host.jsx path is relative to the extension root.
            var extPath = _csInterface.getSystemPath(SystemPath.EXTENSION);
            var hostPath = extPath + '/jsx/hostscript.jsx';

            return new Promise(function (resolve, reject) {
                var loadScript = '$.evalFile("' + _escapeForJSX(hostPath) + '")';
                _csInterface.evalScript(loadScript, function (result) {
                    if (result === 'EvalScript error.') {
                        // Not fatal during development — the stub CSInterface always
                        // returns this. Log and continue.
                        console.warn('[DoMotions:Bridge] Could not load host.jsx (expected outside CEP).');
                    } else {
                        console.log('[DoMotions:Bridge] Host script loaded.');
                    }
                    _initialized = true;
                    resolve();
                });
            });
        },

        call: function (target, payload) {
            if (!_csInterface) {
                return Promise.reject(new Error('[DoMotions:Bridge] Not initialized.'));
            }

            // Split target into module and function name
            var parts = target.split('.');
            if (parts.length < 2) {
                return Promise.reject(new Error('[DoMotions:Bridge] Invalid target "' + target + '". Expected "module.function".'));
            }
            var moduleName = parts[0];
            var fnName = parts.slice(1).join('.');

            // Serialize payload to JSON string
            var jsonPayload = '{}';
            if (payload !== undefined && payload !== null) {
                try {
                    jsonPayload = JSON.stringify(payload);
                } catch (e) {
                    return Promise.reject(new Error('[DoMotions:Bridge] Failed to serialize payload: ' + e.message));
                }
            }

            // Build the ExtendScript call string
            var callString = '$.DoMotions.dispatch("' +
                _escapeForJSX(moduleName) + '", "' +
                _escapeForJSX(fnName) + '", \'' +
                _escapeForJSX(jsonPayload) + '\')';

            console.log('[DoMotions:Bridge] -> Dispatching Call:', target, '\nPayload:', jsonPayload);

            return new Promise(function (resolve, reject) {
                var timedOut = false;
                var timeoutId = setTimeout(function () {
                    timedOut = true;
                    var err = new Error('[DoMotions:Bridge] Timeout exceeded for target: ' + target);
                    console.error(err.message);
                    reject(err);
                }, 10000);

                _csInterface.evalScript(callString, function (result) {
                    if (timedOut) return;
                    clearTimeout(timeoutId);

                    if (result === 'EvalScript error.') {
                        var err = new Error('[DoMotions:Bridge] EvalScript error for target: ' + target);
                        console.error(err.message);
                        reject(err);
                    } else {
                        var parsed = _parseResponse(result);
                        console.log('[DoMotions:Bridge] <- Received Response for', target, ':', parsed);
                        
                        // Enforce structured response { success, data, error }
                        if (parsed && typeof parsed === 'object' && 'success' in parsed) {
                            if (parsed.success) {
                                resolve(parsed);
                            } else {
                                var err = new Error(parsed.error || 'Unknown ExtendScript error');
                                if (parsed.module)        { err.module = parsed.module; }
                                if (parsed.function_name) { err.function_name = parsed.function_name; }
                                reject(err);
                            }
                        } else {
                            // Fallback if raw value returned
                            resolve({ success: true, data: parsed, error: null });
                        }
                    }
                });
            });
        },

        /**
         * Execute multiple calls sequentially.
         *
         * @param {Array<{target: string, payload: object}>} calls
         * @returns {Promise<Array<*>>}  Array of results in order
         */
        callBatch: function (calls) {
            var self = this;
            var results = [];

            var chain = Promise.resolve();
            calls.forEach(function (callDef) {
                chain = chain.then(function () {
                    return self.call(callDef.target, callDef.payload);
                }).then(function (result) {
                    results.push(result);
                });
            });

            return chain.then(function () {
                return results;
            });
        },

        /**
         * Execute a raw ExtendScript string (escape hatch).
         * @param {string} script
         * @returns {Promise<*>}
         */
        raw: function (script) {
            if (!_csInterface) {
                return Promise.reject(new Error('[DoMotions:Bridge] Not initialized.'));
            }
            return new Promise(function (resolve, reject) {
                _csInterface.evalScript(script, function (result) {
                    if (result === 'EvalScript error.') {
                        reject(new Error('[DoMotions:Bridge] Raw evalScript error.'));
                    } else {
                        resolve(_parseResponse(result));
                    }
                });
            });
        }
    };
})();
