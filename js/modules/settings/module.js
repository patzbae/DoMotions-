(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    var SettingsModule = function () {
        this._context = null;
    };

    SettingsModule.prototype.initialize = function (context) {
        this._context = context;
        var self = this;
        return DoMotions._readJSON('./config/version.json')
            .then(function(json) {
                self._versionInfo = json;
            })
            .catch(function(err) {
                console.warn('[DoMotions:Settings] Failed to read version.json', err);
                self._versionInfo = { name: "DoMotions", version: "0.1.0" };
            });
    };

    SettingsModule.prototype.render = function (container) {
        var self = this;
        var settings = this._context.settings;

        var accentColor = settings.get('general.accentColor') || '#00D4FF';
        var animations = settings.get('ui.animationsEnabled') !== false;
        var compact = settings.get('ui.compactMode') === true;

        var html = 
            '<div class="module-content">' +
                '<section class="dm-section">' +
                    '<div class="dm-section-title">About</div>' +
                    '<div class="dm-col" style="text-align: center; padding: 10px 0;">' +
                        '<div style="font-size: 14px; font-weight: 600; color: var(--accent-primary);">' + (this._versionInfo ? this._versionInfo.name : 'DoMotions') + '</div>' +
                        '<div style="font-size: 11px; color: var(--text-secondary);">Version ' + (this._versionInfo ? this._versionInfo.version : '0.1.0') + ' (Build ' + (this._versionInfo && this._versionInfo.build ? this._versionInfo.build : '1') + ')</div>' +
                    '</div>' +
                '</section>' +
                
                '<section class="dm-section">' +
                    '<div class="dm-section-title">General</div>' +
                    '<div class="dm-col">' +
                        '<div class="dm-row" style="display:flex;align-items:center;gap:8px;">' +
                            '<span>Accent Color:</span>' +
                            '<div style="width: 12px; height: 12px; border-radius: 50%; background-color: ' + accentColor + '; border: 1px solid var(--border-color);"></div>' +
                            '<span style="font-size: 11px; color: var(--text-secondary);">' + accentColor + '</span>' +
                        '</div>' +
                        '<div class="dm-row" style="margin-top: 8px;">' +
                            '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;">' +
                                '<input type="checkbox" id="toggle-animations" ' + (animations ? 'checked' : '') + '> Enable Animations' +
                            '</label>' +
                        '</div>' +
                        '<div class="dm-row" style="margin-top: 8px;">' +
                            '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;">' +
                                '<input type="checkbox" id="toggle-compact" ' + (compact ? 'checked' : '') + '> Compact Mode' +
                            '</label>' +
                        '</div>' +
                    '</div>' +
                '</section>';

        // Module settings schemas
        var schemas = settings.getAllSchemas();
        var schemaHtml = '';

        for (var modId in schemas) {
            if (schemas.hasOwnProperty(modId)) {
                schemaHtml += '<div style="margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 8px;">' +
                    '<div style="font-weight:600; text-transform:uppercase; font-size:10px; color:var(--text-secondary); margin-bottom:5px;">' + modId + '</div>';
                
                var modSchema = schemas[modId];
                for (var key in modSchema) {
                    if (modSchema.hasOwnProperty(key)) {
                        var fullKey = 'modules.' + modId + '.' + key;
                        var val = settings.get(fullKey);
                        if (val === undefined) {
                            val = modSchema[key].default;
                        }
                        schemaHtml += '<div class="dm-row" style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px;">' +
                            '<span>' + (modSchema[key].label || key) + ':</span>' +
                            '<span style="color:var(--text-secondary); font-variant-numeric:tabular-nums;">' + val + '</span>' +
                        '</div>';
                    }
                }
                schemaHtml += '</div>';
            }
        }

        if (schemaHtml) {
            html += '<section class="dm-section" style="margin-top: 10px;">' +
                '<div class="dm-section-title">Module Settings</div>' +
                '<div class="dm-col">' + schemaHtml + '</div>' +
            '</section>';
        }

        html += '<div style="margin-top: 15px;">' +
                    '<button class="dm-btn" id="reset-all" style="width: 100%; color: var(--color-error); border-color: rgba(244, 67, 54, 0.4);">Reset All Settings</button>' +
                '</div>' +
            '</div>';

        container.innerHTML = html;

        // Listeners
        container.querySelector('#toggle-animations').addEventListener('change', function (e) {
            settings.set('ui.animationsEnabled', e.target.checked);
            DoMotions.UIManager.showStatus('Animations ' + (e.target.checked ? 'enabled' : 'disabled'), 'info');
        });

        container.querySelector('#toggle-compact').addEventListener('change', function (e) {
            settings.set('ui.compactMode', e.target.checked);
            DoMotions.UIManager.showStatus('Compact Mode ' + (e.target.checked ? 'enabled' : 'disabled'), 'info');
        });

        container.querySelector('#reset-all').addEventListener('click', function () {
            // Reset keys
            settings.reset('general.theme');
            settings.reset('general.accentColor');
            settings.reset('ui.animationsEnabled');
            settings.reset('ui.compactMode');
            
            for (var modId in schemas) {
                if (schemas.hasOwnProperty(modId)) {
                    var modSchema = schemas[modId];
                    for (var key in modSchema) {
                        if (modSchema.hasOwnProperty(key)) {
                            settings.reset('modules.' + modId + '.' + key);
                        }
                    }
                }
            }

            DoMotions.UIManager.showStatus('Settings reset to default', 'success');
            self.render(container); // Refresh UI
        });
    };

    SettingsModule.prototype.destroy = function () {
        console.log('[DoMotions:Settings] Settings module destroyed');
    };

    DoMotions.Registry.register({
        id: 'settings',
        name: 'Settings',
        icon: 'settings',
        order: 70,
        version: '0.1.0',
        dependencies: [],
        enabled: true,
        placeholder: false,
        instance: new SettingsModule()
    });

})();
