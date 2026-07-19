(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    if (DoMotions.Registry) { return; }

    var _modules = [];  // Array of registered module descriptors
    var _initialized = false;

    DoMotions.Registry = {
        /**
         * Register a module descriptor. Called by each module's script on load.
         * @param {object} descriptor - { id, name, icon, order, version, dependencies, enabled, placeholder, instance }
         */
        register: function (descriptor) {
            // Validate required fields
            if (!descriptor.id || !descriptor.instance) {
                console.error('[DoMotions:Registry] Invalid descriptor — missing id or instance:', descriptor);
                return;
            }
            // Prevent duplicate registration
            for (var i = 0; i < _modules.length; i++) {
                if (_modules[i].id === descriptor.id) {
                    console.warn('[DoMotions:Registry] Module already registered:', descriptor.id);
                    return;
                }
            }
            // Apply defaults
            descriptor.order = descriptor.order || 999;
            descriptor.version = descriptor.version || '0.0.0';
            descriptor.dependencies = descriptor.dependencies || [];
            descriptor.enabled = descriptor.enabled !== false;
            descriptor.placeholder = descriptor.placeholder || false;

            _modules.push(descriptor);
            console.log('[DoMotions:Registry] Registered:', descriptor.id);
        },

        /**
         * Get all registered modules sorted by order.
         * @returns {Array}
         */
        getAll: function () {
            return _modules.slice().sort(function (a, b) {
                return a.order - b.order;
            });
        },

        /**
         * Get a module by ID.
         * @param {string} id
         * @returns {object|null}
         */
        get: function (id) {
            for (var i = 0; i < _modules.length; i++) {
                if (_modules[i].id === id) return _modules[i];
            }
            return null;
        },

        /**
         * Initialize all registered modules in dependency order.
         * Calls initialize(context) on each module instance.
         * @param {object} context - { settings, commandBus, bridge, icons }
         * @returns {Promise<void>}
         */
        initializeAll: function (context) {
            if (_initialized) {
                console.warn('[DoMotions:Registry] Already initialized.');
                return Promise.resolve();
            }

            var sorted = this._resolveDependencyOrder();
            var chain = Promise.resolve();

            sorted.forEach(function (descriptor) {
                chain = chain.then(function () {
                    if (!descriptor.enabled) {
                        console.log('[DoMotions:Registry] Skipping disabled:', descriptor.id);
                        return;
                    }
                    console.log('[DoMotions:Registry] Initializing:', descriptor.id);
                    return Promise.resolve(descriptor.instance.initialize(context));
                });
            });

            return chain.then(function () {
                _initialized = true;
                console.log('[DoMotions:Registry] All modules initialized.');
            });
        },

        /**
         * Get only enabled, non-placeholder modules.
         * @returns {Array}
         */
        getActive: function () {
            return this.getAll().filter(function (m) {
                return m.enabled && !m.placeholder;
            });
        },

        /**
         * Get only enabled modules (including placeholders).
         * @returns {Array}
         */
        getVisible: function () {
            return this.getAll().filter(function (m) {
                return m.enabled;
            });
        },

        /**
         * Topological sort by dependencies.
         * @private
         * @returns {Array}
         */
        _resolveDependencyOrder: function () {
            var sorted = [];
            var visited = {};
            var all = this.getAll();
            var moduleMap = {};

            all.forEach(function (m) { moduleMap[m.id] = m; });

            function visit(m) {
                if (visited[m.id]) return;
                visited[m.id] = true;
                (m.dependencies || []).forEach(function (depId) {
                    if (moduleMap[depId]) visit(moduleMap[depId]);
                });
                sorted.push(m);
            }

            all.forEach(function (m) { visit(m); });
            return sorted;
        }
    };
})();
