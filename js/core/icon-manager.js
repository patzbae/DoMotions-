(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    if (DoMotions.IconManager) { return; }

    var _theme = 'dark';
    var _cache = {};            // name → SVG HTML string (for future inline SVG use)
    var _registry = {};         // name → { sources } for custom-registered icons
    var _initialized = false;

    /**
     * Unicode fallback characters when an SVG icon can't be resolved.
     */
    var _fallbacks = {
        easing:    '\u26A1',   // ⚡
        anchor:    '\u2295',   // ⊕
        layer:     '\u2630',   // ☰
        graph:     '\uD83D\uDCC8', // 📈
        text:      'T',
        utilities: '\uD83D\uDD27', // 🔧
        settings:  '\u2699',   // ⚙
        logo:      'D'
    };

    /**
     * Build the file path for a themed icon.
     * @param {string} name
     * @param {string} theme
     * @returns {string}
     */
    function _buildPath(name, theme) {
        return 'icons/' + theme + '/' + name + '.svg';
    }

    DoMotions.IconManager = {

        /**
         * Initialize the icon manager.
         * @param {string} currentTheme  'dark' or 'light'
         */
        initialize: function (currentTheme) {
            if (_initialized) {
                console.warn('[DoMotions:Icons] Already initialized.');
                return;
            }
            _theme = currentTheme || 'dark';
            _cache = {};
            _initialized = true;
            console.log('[DoMotions:Icons] Initialized with theme:', _theme);
        },

        /**
         * Get an HTML string for an icon.
         *
         * Returns an <img> tag pointing at the themed SVG path.
         * If the icon name is unknown (not in _fallbacks and not registered),
         * returns a <span> with a fallback character.
         *
         * @param {string} name     Icon name (e.g. 'easing', 'settings')
         * @param {object} [options]
         * @param {string} [options.theme]   Override theme for this call
         * @param {string} [options.size]    CSS size string, e.g. '16px'
         * @param {string} [options.cls]     Extra CSS class
         * @returns {string} HTML string
         */
        get: function (name, options) {
            options = options || {};
            var theme = options.theme || _theme;
            var size  = options.size  || '16px';
            var cls   = options.cls   ? ' ' + options.cls : '';

            // Try registered custom icon first
            if (_registry[name] && _registry[name].sources && _registry[name].sources[theme]) {
                var customSrc = _registry[name].sources[theme];
                return '<img src="' + customSrc + '"' +
                       ' class="dm-icon' + cls + '"' +
                       ' alt="' + name + '"' +
                       ' width="' + size + '" height="' + size + '"' +
                       ' style="width:' + size + ';height:' + size + ';" />';
            }

            // Build standard themed path
            var path = _buildPath(name, theme);

            // Return <img> tag — the browser will handle 404s gracefully
            var imgTag = '<img src="' + path + '"' +
                         ' class="dm-icon' + cls + '"' +
                         ' alt="' + name + '"' +
                         ' width="' + size + '" height="' + size + '"' +
                         ' style="width:' + size + ';height:' + size + ';"' +
                         ' onerror="this.style.display=\'none\';' +
                         'this.nextElementSibling.style.display=\'inline\';" />';

            // Fallback <span> hidden by default, shown on img error
            var fallbackChar = _fallbacks[name] || '\u2753'; // ❓ if truly unknown
            var fallbackSpan = '<span class="dm-icon-fallback' + cls + '"' +
                               ' style="display:none;font-size:' + size + ';line-height:' + size + ';">' +
                               fallbackChar + '</span>';

            return imgTag + fallbackSpan;
        },

        /**
         * Update the current theme and clear the icon cache.
         * @param {string} theme  'dark' or 'light'
         */
        setTheme: function (theme) {
            _theme = theme;
            _cache = {};
            console.log('[DoMotions:Icons] Theme changed to:', theme);
        },

        /**
         * Register a custom icon with per-theme sources.
         * @param {string} name
         * @param {object} sources  e.g. { dark: 'path/to/dark.svg', light: 'path/to/light.svg' }
         */
        register: function (name, sources) {
            _registry[name] = { sources: sources };
            console.log('[DoMotions:Icons] Registered custom icon:', name);
        },

        /**
         * Get the current theme.
         * @returns {string}
         */
        getTheme: function () {
            return _theme;
        },

        /**
         * Get the fallback character for an icon name.
         * @param {string} name
         * @returns {string}
         */
        getFallback: function (name) {
            return _fallbacks[name] || '\u2753';
        }
    };
})();
