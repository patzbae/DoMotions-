/**
 * json2.jsx — Minimal JSON polyfill for ExtendScript (ES3)
 *
 * Provides JSON.parse and JSON.stringify when the native JSON
 * object is not available (which is the case in ExtendScript).
 */
if (typeof JSON === 'undefined') {
    JSON = {};

    /**
     * Parse a JSON string into a JavaScript value.
     * NOTE: This uses eval() which is NOT safe for untrusted input.
     * For production, replace with a proper recursive-descent parser.
     */
    JSON.parse = function (text) {
        if (typeof text !== 'string') {
            throw new Error('JSON.parse: expected string, got ' + typeof text);
        }
        // Strip leading/trailing whitespace
        text = text.replace(/^\s+/, '').replace(/\s+$/, '');
        if (text === '') {
            throw new Error('JSON.parse: unexpected end of input');
        }
        return eval('(' + text + ')');
    };

    /**
     * Stringify a JavaScript value to a JSON string.
     * Handles: string, number, boolean, null, Array, plain Object.
     */
    JSON.stringify = function (value) {
        return JSON._toJSON(value);
    };

    /** @private */
    JSON._escapeString = function (str) {
        var escaped = '';
        for (var i = 0; i < str.length; i++) {
            var ch = str.charAt(i);
            if (ch === '"') { escaped += '\\"'; }
            else if (ch === '\\') { escaped += '\\\\'; }
            else if (ch === '\n') { escaped += '\\n'; }
            else if (ch === '\r') { escaped += '\\r'; }
            else if (ch === '\t') { escaped += '\\t'; }
            else if (ch === '\b') { escaped += '\\b'; }
            else if (ch === '\f') { escaped += '\\f'; }
            else {
                var code = str.charCodeAt(i);
                if (code < 32) {
                    var hex = code.toString(16);
                    while (hex.length < 4) { hex = '0' + hex; }
                    escaped += '\\u' + hex;
                } else {
                    escaped += ch;
                }
            }
        }
        return '"' + escaped + '"';
    };

    /** @private */
    JSON._toJSON = function (value) {
        if (value === null) {
            return 'null';
        }
        if (value === undefined) {
            return undefined;
        }

        var t = typeof value;

        if (t === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (t === 'number') {
            if (isNaN(value) || !isFinite(value)) {
                return 'null';
            }
            return String(value);
        }
        if (t === 'string') {
            return JSON._escapeString(value);
        }

        // Array check (instanceof works in ES3)
        if (value instanceof Array) {
            var arrParts = [];
            for (var i = 0; i < value.length; i++) {
                var elem = JSON._toJSON(value[i]);
                arrParts.push(elem === undefined ? 'null' : elem);
            }
            return '[' + arrParts.join(',') + ']';
        }

        // Plain object
        if (t === 'object') {
            var objParts = [];
            for (var key in value) {
                if (value.hasOwnProperty(key)) {
                    var val = JSON._toJSON(value[key]);
                    if (val !== undefined) {
                        objParts.push(JSON._escapeString(key) + ':' + val);
                    }
                }
            }
            return '{' + objParts.join(',') + '}';
        }

        // Functions and other types are omitted (return undefined)
        return undefined;
    };
}
