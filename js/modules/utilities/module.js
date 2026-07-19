(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    var UtilitiesModule = function () {
        this._context = null;
    };

    UtilitiesModule.prototype.initialize = function (context) {
        this._context = context;
        return Promise.resolve();
    };

    UtilitiesModule.prototype.render = function (container) {
        var iconHtml = '';
        if (this._context.icons && typeof this._context.icons.get === 'function') {
            iconHtml = this._context.icons.get('utilities', { size: '48px', cls: 'placeholder-icon' });
        }
        container.innerHTML = 
            '<div class="placeholder-module">' +
                '<div class="placeholder-icon" style="margin-bottom:15px;display:flex;justify-content:center;">' + iconHtml + '</div>' +
                '<h2>Utilities</h2>' +
                '<p style="margin-top:10px;font-size:11px;color:#a0a0a0;text-align:center;max-width:200px;">' +
                    'Composition utilities, expression tools, and automation — coming in a future version.' +
                '</p>' +
            '</div>';
    };

    UtilitiesModule.prototype.destroy = function () {
        console.log('[DoMotions:Utilities] Utilities module destroyed');
    };

    DoMotions.Registry.register({
        id: 'utilities',
        name: 'Utils',
        icon: 'utilities',
        order: 60,
        version: '0.1.0',
        dependencies: [],
        enabled: true,
        placeholder: true,
        instance: new UtilitiesModule()
    });

})();
