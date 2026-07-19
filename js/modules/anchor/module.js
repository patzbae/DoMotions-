(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    var AnchorModule = function () {
        this._context = null;
    };

    AnchorModule.prototype.initialize = function (context) {
        this._context = context;
        return Promise.resolve();
    };

    AnchorModule.prototype.render = function (container) {
        var self = this;
        var icons = this._context.icons;
        
        container.innerHTML = 
            '<div class="module-content">' +
                '<section class="dm-section">' +
                    '<div class="dm-section-title">Anchor Point</div>' +
                    '<div class="dm-anchor-grid">' +
                        '<button class="dm-anchor-cell" data-position="TL" data-tooltip="Top Left">\u2196</button>' +
                        '<button class="dm-anchor-cell" data-position="TC" data-tooltip="Top Center">\u2191</button>' +
                        '<button class="dm-anchor-cell" data-position="TR" data-tooltip="Top Right">\u2197</button>' +
                        '<button class="dm-anchor-cell" data-position="ML" data-tooltip="Middle Left">\u2190</button>' +
                        '<button class="dm-anchor-cell" data-position="MC" data-tooltip="Center">\u00B7</button>' +
                        '<button class="dm-anchor-cell" data-position="MR" data-tooltip="Middle Right">\u2192</button>' +
                        '<button class="dm-anchor-cell" data-position="BL" data-tooltip="Bottom Left">\u2199</button>' +
                        '<button class="dm-anchor-cell" data-position="BC" data-tooltip="Bottom Center">\u2193</button>' +
                        '<button class="dm-anchor-cell" data-position="BR" data-tooltip="Bottom Right">\u2198</button>' +
                    '</div>' +
                '</section>' +

                '<div style="margin-top: 15px;">' +
                    '<button class="dm-btn primary" id="center-content" style="width: 100%;" data-tooltip="Center Anchor to Content">' + icons.get('anchor', {size:'14px'}) + ' Center to Content</button>' +
                '</div>' +
            '</div>';

        // Add listeners to grid cells
        var cells = container.querySelectorAll('.dm-anchor-cell');
        for (var i = 0; i < cells.length; i++) {
            cells[i].addEventListener('click', function (e) {
                var position = e.target.getAttribute('data-position');
                
                // Clear active from other cells
                for (var j = 0; j < cells.length; j++) {
                    cells[j].classList.remove('active');
                }
                e.target.classList.add('active');

                // Dispatch command
                self._context.commandBus.dispatch(DoMotions.Commands.Anchor.setPosition({ position: position }))
                    .then(function (res) {
                        var msg = (res && res.data && res.data.message) ? res.data.message : 'Anchor set to: ' + position;
                        DoMotions.UIManager.showStatus(msg, 'success');
                    })
                    .catch(function (err) {
                        var msg = (err && err.message) ? err.message : 'Error setting anchor';
                        DoMotions.UIManager.showStatus(msg, 'error', 15000);
                    });
            });
        }

        // Center to content listener
        var centerBtn = container.querySelector('#center-content');
        centerBtn.addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Anchor.centerToContent())
                .then(function (res) {
                    var msg = (res && res.data && res.data.message) ? res.data.message : 'Centered anchor to content';
                    DoMotions.UIManager.showStatus(msg, 'success');
                })
                .catch(function (err) {
                    var msg = (err && err.message) ? err.message : 'Error centering anchor';
                    DoMotions.UIManager.showStatus(msg, 'error', 15000);
                });
        });
    };

    AnchorModule.prototype.destroy = function () {
        console.log('[DoMotions:Anchor] Anchor module destroyed');
    };

    // Register with Plugin Registry
    DoMotions.Registry.register({
        id: 'anchor',
        name: 'Anchor',
        icon: 'anchor',
        order: 40,
        version: '0.1.0',
        dependencies: [],
        enabled: true,
        placeholder: false,
        instance: new AnchorModule()
    });

})();
