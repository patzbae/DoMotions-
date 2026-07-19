(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    var TextModule = function () {
        this._context = null;
    };

    TextModule.prototype.initialize = function (context) {
        this._context = context;
        return Promise.resolve();
    };

    TextModule.prototype.render = function (container) {
        var iconHtml = '';
        if (this._context.icons && typeof this._context.icons.get === 'function') {
            iconHtml = this._context.icons.get('text', { size: '48px', cls: 'placeholder-icon' });
        }
        container.innerHTML = 
            '<div class="placeholder-module">' +
                '<div class="placeholder-icon" style="margin-bottom:15px;display:flex;justify-content:center;">' + iconHtml + '</div>' +
                '<h2>Text Animator</h2>' +
                '<p style="margin-top:10px;font-size:11px;color:#a0a0a0;text-align:center;max-width:200px;">' +
                    'Text animation presets and batch text tools — coming in a future version.' +
                '</p>' +
            '</div>';
    };

    TextModule.prototype.destroy = function () {
        console.log('[DoMotions:Text] Text module destroyed');
    };

    DoMotions.Registry.register({
        id: 'text',
        name: 'Text',
        icon: 'text',
        order: 50,
        version: '0.1.0',
        dependencies: [],
        enabled: true,
        placeholder: true,
        instance: new TextModule()
    });

})();
