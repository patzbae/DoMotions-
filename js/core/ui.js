(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    if (DoMotions.UIManager) { return; }

    var _tabContainer = null;
    var _contentContainer = null;
    var _activeModuleId = null;
    var _statusTimeout = null;
    var _initialized = false;

    DoMotions.UIManager = {

        /**
         * Initialize the UI manager.
         * Builds accordion sections from the Registry's visible modules.
         *
         * @param {HTMLElement} accordionContainer   Container element for accordion items
         */
        initialize: function (accordionContainer) {
            if (_initialized) {
                console.warn('[DoMotions:UI] Already initialized.');
                return;
            }

            _contentContainer = accordionContainer;
            _contentContainer.innerHTML = '';

            var modules = DoMotions.Registry.getVisible();
            var self = this;

            modules.forEach(function (descriptor) {
                var item = document.createElement('div');
                item.className = 'dm-accordion-item';
                item.setAttribute('data-module-id', descriptor.id);

                var header = document.createElement('div');
                header.className = 'dm-accordion-header';
                
                var iconHtml = '';
                if (DoMotions.IconManager && descriptor.icon) {
                    iconHtml = DoMotions.IconManager.get(descriptor.icon, { size: '18px' });
                }
                
                var iconWrapper = document.createElement('div');
                iconWrapper.className = 'dm-accordion-icon';
                iconWrapper.innerHTML = iconHtml;
                
                var title = document.createElement('div');
                title.className = 'dm-accordion-title';
                title.textContent = descriptor.name || descriptor.id;

                var chevron = document.createElement('div');
                chevron.className = 'dm-accordion-chevron';
                // Inline SVG chevron
                chevron.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

                header.appendChild(iconWrapper);
                header.appendChild(title);
                header.appendChild(chevron);

                var content = document.createElement('div');
                content.className = 'dm-accordion-content';

                item.appendChild(header);
                item.appendChild(content);
                _contentContainer.appendChild(item);

                header.addEventListener('click', function () {
                    self.toggle(descriptor.id);
                });
            });

            _initialized = true;
            console.log('[DoMotions:UI] Initialized with', modules.length, 'accordion items.');
        },

        toggle: function (moduleId) {
            if (_activeModuleId === moduleId) {
                this.collapse(moduleId);
            } else {
                this.expand(moduleId);
            }
        },

        collapse: function (moduleId) {
            if (_activeModuleId !== moduleId) return;
            var descriptor = DoMotions.Registry.get(moduleId);
            if (!descriptor) return;

            var item = _contentContainer.querySelector('.dm-accordion-item[data-module-id="' + moduleId + '"]');
            if (item) {
                item.classList.remove('expanded');
                item.querySelector('.dm-accordion-header').classList.remove('active');
            }

            if (descriptor.instance && typeof descriptor.instance.destroy === 'function') {
                try {
                    descriptor.instance.destroy();
                } catch (e) {
                    console.error('[DoMotions:UI] Error destroying module:', moduleId, e);
                }
            }

            var contentContainer = item ? item.querySelector('.dm-accordion-content') : null;
            if (contentContainer) {
                contentContainer.innerHTML = '';
            }

            _activeModuleId = null;
        },

        expand: function (moduleId) {
            // Collapse current if any
            if (_activeModuleId) {
                this.collapse(_activeModuleId);
            }

            var descriptor = DoMotions.Registry.get(moduleId);
            if (!descriptor) return;

            var item = _contentContainer.querySelector('.dm-accordion-item[data-module-id="' + moduleId + '"]');
            var contentContainer = item ? item.querySelector('.dm-accordion-content') : null;
            
            if (!item || !contentContainer) return;

            if (descriptor.instance && typeof descriptor.instance.render === 'function') {
                try {
                    descriptor.instance.render(contentContainer);
                } catch (e) {
                    console.error('[DoMotions:UI] Error rendering module:', moduleId, e);
                    contentContainer.innerHTML = '<div class="dm-error">Failed to render module: ' + moduleId + '</div>';
                }
            } else if (descriptor.placeholder) {
                contentContainer.innerHTML =
                    '<div class="placeholder-module">' +
                    '<p>' + (descriptor.name || moduleId) + '</p>' +
                    '<p class="dm-placeholder-hint">Coming soon</p>' +
                    '</div>';
            }

            item.classList.add('expanded');
            item.querySelector('.dm-accordion-header').classList.add('active');
            _activeModuleId = moduleId;

            if (DoMotions.SettingsManager) {
                DoMotions.SettingsManager.set('ui.lastActiveModule', moduleId);
            }
            console.log('[DoMotions:UI] Expanded:', moduleId);
        },

        /**
         * Show a status message in the status bar.
         */
        showStatus: function (message, type, duration) {
            var statusBar = document.getElementById('dm-status');
            var statusText = document.getElementById('dm-status-text');
            if (!statusBar || !statusText) return;

            if (_statusTimeout) {
                clearTimeout(_statusTimeout);
                _statusTimeout = null;
            }

            statusText.textContent = message;
            statusBar.className = 'dm-status-bar';
            if (type) {
                statusBar.classList.add(type);
            }

            var dur = duration;
            if (dur === undefined || dur === null) {
                dur = (DoMotions.SettingsManager && DoMotions.SettingsManager.get('general.showStatusDuration')) || 3000;
            }

            if (dur > 0) {
                _statusTimeout = setTimeout(function () {
                    statusText.textContent = '';
                    statusBar.className = 'dm-status-bar';
                    _statusTimeout = null;
                }, dur);
            }
        },

        getActiveModuleId: function () {
            return _activeModuleId;
        }
    };
})();
