/**
 * DoMotions — ExtendScript Host Entry Point
 * 
 * This file is loaded by CEP via the ScriptPath in manifest.xml.
 * It creates the $.DoMotions namespace and loads all modules.
 */

// Always (re)load the host + modules. The ExtendScript engine persists for the
// whole After Effects session, so a guard here would keep stale .jsx code loaded
// after edits until AE restarts. Reloading every time makes panel reload enough
// to pick up changes. Re-defining the namespace/objects is idempotent.
{

    // Load JSON polyfill
    $.evalFile(new File($.fileName).parent.fsName + '/lib/json2.jsx');

    // Create namespace
    $.DoMotions = {
        version: '0.1.0',
        modules: {},

        /**
         * Central dispatcher — called by the CEP Bridge.
         * Routes calls to the correct module and function.
         *
         * @param {string} moduleName - e.g. 'easing'
         * @param {string} functionName - e.g. 'applyEase'
         * @param {string} argsJSON - JSON string of arguments
         * @returns {string} JSON response: { success: boolean, data: any, error?: string }
         */
        dispatch: function (moduleName, functionName, argsJSON) {
            try {
                var args = {};
                if (argsJSON && argsJSON !== '' && argsJSON !== 'undefined') {
                    args = JSON.parse(argsJSON);
                }

                var mod = this.modules[moduleName];
                if (!mod) {
                    throw new Error('Module not found: ' + moduleName);
                }
                if (typeof mod[functionName] !== 'function') {
                    throw new Error('Function not found: ' + moduleName + '.' + functionName);
                }

                var result = mod[functionName](args);
                return JSON.stringify({ success: true, data: result });

            } catch (e) {
                return JSON.stringify({
                    success: false,
                    error: e.message || String(e),
                    module: moduleName,
                    function_name: functionName  // 'function' is reserved in ES3
                });
            }
        }
    };

    // Load utility modules
    var _basePath = new File($.fileName).parent.fsName;
    $.evalFile(_basePath + '/modules/utils.jsx');

    // Load feature modules
    $.evalFile(_basePath + '/modules/easing.jsx');
    $.evalFile(_basePath + '/modules/anchor.jsx');
    $.evalFile(_basePath + '/modules/layer.jsx');
    $.evalFile(_basePath + '/modules/graph.jsx');

    // Initialization complete
    $.writeln('[DoMotions] ExtendScript host loaded. Version: ' + $.DoMotions.version);
}
