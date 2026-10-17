(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    var LayerModule = function () {
        this._context = null;
    };

    LayerModule.prototype.initialize = function (context) {
        this._context = context;
        return Promise.resolve();
    };

    LayerModule.prototype.render = function (container) {
        var self = this;
        var icons = this._context.icons;
        
        container.innerHTML = 
            '<div class="module-content">' +
                '<section class="dm-section">' +
                    '<div class="dm-section-title">Create Layer</div>' +
                    '<div class="dm-btn-group" style="display:flex; gap:4px;">' +
                        '<button class="dm-btn" style="flex: 1;" id="create-null" data-tooltip="Create Null (normal or for selected)">' + icons.get('layer', {size:'14px'}) + ' Null</button>' +
                        '<button class="dm-btn" style="flex: 1;" id="create-solid" data-tooltip="Create Solid Layer">' + icons.get('layer', {size:'14px'}) + ' Solid</button>' +
                        '<button class="dm-btn" style="flex: 1;" id="create-adj" data-tooltip="Create Adjustment Layer">' + icons.get('layer', {size:'14px'}) + ' Adj</button>' +
                    '</div>' +
                '</section>' +

                '<section class="dm-section">' +
                    '<div class="dm-section-title">Utilities</div>' +
                    '<div class="dm-col">' +
                        '<button class="dm-btn" id="parent-null" data-tooltip="Parent Selected to Null">' + icons.get('layer', {size:'14px'}) + ' Parent to Null</button>' +
                        '<button class="dm-btn" id="duplicate-layers" data-tooltip="Duplicate Selected Layers">' + icons.get('layer', {size:'14px'}) + ' Duplicate</button>' +
                        '<button class="dm-btn" id="rename-layers" data-tooltip="Rename Selected Layers">' + icons.get('layer', {size:'14px'}) + ' Rename</button>' +
                        '<button class="dm-btn" id="select-similar" data-tooltip="Select Layers of Similar Type">' + icons.get('utilities', {size:'14px'}) + ' Select Similar</button>' +
                    '</div>' +
                '</section>' +

                '<section class="dm-section">' +
                    '<div class="dm-section-title">Toggles</div>' +
                    '<div class="dm-btn-group">' +
                        '<button class="dm-btn" id="toggle-shy" data-tooltip="Toggle Shy Switch">' + icons.get('layer', {size:'14px'}) + ' Shy</button>' +
                        '<button class="dm-btn" id="toggle-lock" data-tooltip="Toggle Lock Switch">' + icons.get('settings', {size:'14px'}) + ' Lock</button>' +
                        '<button class="dm-btn" id="toggle-guide" data-tooltip="Toggle Guide Layer">' + icons.get('graph', {size:'14px'}) + ' Guide</button>' +
                    '</div>' +
                '</section>' +
            '</div>';

        // Creation Listeners
        container.querySelector('#create-null').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.createNull())
                .then(function (res) {
                    var msg = (res && res.data && res.data.message) ? res.data.message : 'Created Null';
                    DoMotions.UIManager.showStatus(msg, 'success');
                })
                .catch(function (err) {
                    var msg = (err && err.message) ? err.message : 'Error creating Null';
                    DoMotions.UIManager.showStatus(msg, 'error');
                    if (DoMotions.Notification) {
                        DoMotions.Notification.error(msg);
                    }
                });
        });
        
        container.querySelector('#create-solid').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.createSolid())
                .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Created Solid', 'success'); })
                .catch(function (err) { DoMotions.UIManager.showStatus('Error creating Solid', 'error'); });
        });

        container.querySelector('#create-adj').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.createAdjustmentLayer())
                .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Created Adjustment Layer', 'success'); })
                .catch(function (err) { DoMotions.UIManager.showStatus('Error creating Adjustment Layer', 'error'); });
        });

        // Utilities Listeners
        container.querySelector('#parent-null').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.parentToNull())
                .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Parented layers to null', 'success'); })
                .catch(function (err) { DoMotions.UIManager.showStatus('Error parenting to null', 'error'); });
        });

        container.querySelector('#duplicate-layers').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.duplicateSelected())
                .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Duplicated layers', 'success'); })
                .catch(function (err) { DoMotions.UIManager.showStatus('Error duplicating layers', 'error'); });
        });

        container.querySelector('#rename-layers').addEventListener('click', function () {
            var newName = prompt('Enter new layer name:', 'Renamed Layer');
            if (newName) {
                self._context.commandBus.dispatch(DoMotions.Commands.Layer.renameSelected({ name: newName }))
                    .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Renamed layers', 'success'); })
                    .catch(function (err) { DoMotions.UIManager.showStatus('Error renaming layers', 'error'); });
            }
        });

        container.querySelector('#select-similar').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.selectSimilar())
                .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Selected similar layers', 'success'); })
                .catch(function (err) { DoMotions.UIManager.showStatus('Error selecting similar layers', 'error'); });
        });

        // Toggles Listeners
        container.querySelector('#toggle-shy').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.toggleProperty({ property: 'shy' }))
                .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Toggled Shy property', 'success'); })
                .catch(function (err) { DoMotions.UIManager.showStatus('Error toggling Shy', 'error'); });
        });

        container.querySelector('#toggle-lock').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.toggleProperty({ property: 'lock' }))
                .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Toggled Lock property', 'success'); })
                .catch(function (err) { DoMotions.UIManager.showStatus('Error toggling Lock', 'error'); });
        });

        container.querySelector('#toggle-guide').addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Layer.toggleProperty({ property: 'guide' }))
                .then(function (res) { DoMotions.UIManager.showStatus((res && res.data && res.data.message) ? res.data.message : 'Toggled Guide property', 'success'); })
                .catch(function (err) { DoMotions.UIManager.showStatus('Error toggling Guide', 'error'); });
        });
    };

    LayerModule.prototype.destroy = function () {
        console.log('[DoMotions:Layer] Layer module destroyed');
    };

    // Register with Plugin Registry
    DoMotions.Registry.register({
        id: 'layer',
        name: 'Layers',
        icon: 'layer',
        order: 10,
        version: '0.1.0',
        dependencies: [],
        enabled: true,
        placeholder: false,
        instance: new LayerModule()
    });

})();
