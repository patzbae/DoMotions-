(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    var EasingModule = function () {
        this._context = null;
    };

    EasingModule.prototype.initialize = function (context) {
        this._context = context;

        // Register settings schema for easing
        context.settings.registerSchema('easing', {
            defaultInfluenceIn: { default: 33, type: 'number', label: 'Default In Influence', min: 0.1, max: 100 },
            defaultInfluenceOut: { default: 33, type: 'number', label: 'Default Out Influence', min: 0.1, max: 100 },
            defaultType: { default: 'easeInOut', type: 'select', label: 'Default Ease Type', options: ['easeIn', 'easeOut', 'easeInOut', 'linear', 'hold'] }
        });

        return Promise.resolve();
    };

    EasingModule.prototype.render = function (container) {
        var self = this;
        var settings = this._context.settings;
        var icons = this._context.icons;
        var defaultIn = settings.get('modules.easing.defaultInfluenceIn') || 33;
        var defaultOut = settings.get('modules.easing.defaultInfluenceOut') || 33;

        container.innerHTML = 
            '<div class="module-content">' +
                '<section class="dm-section">' +
                    '<div class="dm-section-title">Presets</div>' +
                    '<div class="dm-btn-group">' +
                        '<button class="dm-btn" id="preset-easy" data-tooltip="Easy Ease (In & Out)">' + icons.get('easing', {size:'14px'}) + ' Easy</button>' +
                        '<button class="dm-btn" id="preset-in" data-tooltip="Ease In">' + icons.get('easing', {size:'14px'}) + ' In</button>' +
                        '<button class="dm-btn" id="preset-out" data-tooltip="Ease Out">' + icons.get('easing', {size:'14px'}) + ' Out</button>' +
                        '<button class="dm-btn" id="preset-linear" data-tooltip="Linear">' + icons.get('easing', {size:'14px'}) + ' Lin</button>' +
                        '<button class="dm-btn" id="preset-hold" data-tooltip="Hold">' + icons.get('easing', {size:'14px'}) + ' Hold</button>' +
                    '</div>' +
                '</section>' +

                '<section class="dm-section">' +
                    '<div class="dm-section-title">Custom Ease</div>' +
                    '<div class="dm-slider-row">' +
                        '<span class="dm-slider-label">Influence In</span>' +
                        '<input type="range" class="dm-slider" id="slider-in" min="0.1" max="100" step="0.1" value="' + defaultIn + '">' +
                        '<span class="dm-slider-value" id="val-in">' + defaultIn + '%</span>' +
                    '</div>' +
                    '<div class="dm-slider-row" style="margin-top: 10px;">' +
                        '<span class="dm-slider-label">Influence Out</span>' +
                        '<input type="range" class="dm-slider" id="slider-out" min="0.1" max="100" step="0.1" value="' + defaultOut + '">' +
                        '<span class="dm-slider-value" id="val-out">' + defaultOut + '%</span>' +
                    '</div>' +
                    '<div class="dm-slider-row" style="margin-top: 10px;">' +
                        '<span class="dm-slider-label">Speed In</span>' +
                        '<input type="number" class="dm-input" id="speed-in" min="0" step="1" value="0" style="width:60px;" data-tooltip="Incoming speed (0 = auto)">' +
                    '</div>' +
                    '<div class="dm-slider-row" style="margin-top: 6px;">' +
                        '<span class="dm-slider-label">Speed Out</span>' +
                        '<input type="number" class="dm-input" id="speed-out" min="0" step="1" value="0" style="width:60px;" data-tooltip="Outgoing speed (0 = auto)">' +
                    '</div>' +
                '</section>' +

                '<section class="dm-section">' +
                    '<div class="dm-section-title">Quick Influence</div>' +
                    '<div class="dm-btn-group">' +
                        '<button class="dm-btn" id="speed-smooth" data-tooltip="33% Influence">' + icons.get('easing', {size:'14px'}) + ' 33%</button>' +
                        '<button class="dm-btn" id="speed-snappy" data-tooltip="75% Influence">' + icons.get('easing', {size:'14px'}) + ' 75%</button>' +
                        '<button class="dm-btn" id="speed-heavy" data-tooltip="90% Influence">' + icons.get('easing', {size:'14px'}) + ' 90%</button>' +
                    '</div>' +
                '</section>' +

                '<div style="margin-top: 10px; display: flex; gap: 6px;">' +
                    '<button class="dm-btn primary" id="apply-ease" style="flex: 1;">' + icons.get('easing', {size:'14px'}) + ' Apply Ease</button>' +
                    '<button class="dm-btn" id="read-ease" data-tooltip="Read ease from selected keyframe" style="flex: 0 0 auto; padding: 8px 12px;">' + icons.get('settings', {size:'14px'}) + '</button>' +
                '</div>' +
            '</div>';

        // ─── Element References ─────────────────────────────────────────
        var sliderIn  = container.querySelector('#slider-in');
        var sliderOut = container.querySelector('#slider-out');
        var valIn     = container.querySelector('#val-in');
        var valOut    = container.querySelector('#val-out');
        var speedIn   = container.querySelector('#speed-in');
        var speedOut  = container.querySelector('#speed-out');
        var applyBtn  = container.querySelector('#apply-ease');
        var readBtn   = container.querySelector('#read-ease');

        // ─── Slider live-update ─────────────────────────────────────────
        sliderIn.addEventListener('input', function () {
            valIn.textContent = parseFloat(sliderIn.value).toFixed(1) + '%';
        });
        sliderOut.addEventListener('input', function () {
            valOut.textContent = parseFloat(sliderOut.value).toFixed(1) + '%';
        });

        // ─── Helpers ────────────────────────────────────────────────────
        function setSliders(infIn, infOut) {
            sliderIn.value = infIn;
            sliderOut.value = infOut;
            valIn.textContent  = parseFloat(infIn).toFixed(1) + '%';
            valOut.textContent = parseFloat(infOut).toFixed(1) + '%';
        }

        function getCurrentParams(type) {
            return {
                type: type,
                influenceIn:  parseFloat(sliderIn.value),
                influenceOut: parseFloat(sliderOut.value),
                speedIn:      parseFloat(speedIn.value)  || 0,
                speedOut:     parseFloat(speedOut.value) || 0
            };
        }

        function dispatchEase(params) {
            self._context.commandBus.dispatch(DoMotions.Commands.Easing.applyEase(params))
                .then(function (res) {
                    var msg = (res && res.data && res.data.message) ? res.data.message : 'Ease applied';
                    DoMotions.UIManager.showStatus(msg, 'success');
                })
                .catch(function (err) {
                    var errMsg = (err && err.message) ? err.message : 'Error applying ease';
                    DoMotions.UIManager.showStatus(errMsg, 'error');
                });
        }

        // ─── Preset Buttons ─────────────────────────────────────────────
        container.querySelector('#preset-easy').addEventListener('click', function () {
            setSliders(33, 33);
            dispatchEase({ type: 'easeInOut', influenceIn: 33, influenceOut: 33 });
        });

        container.querySelector('#preset-in').addEventListener('click', function () {
            setSliders(75, 0.1);
            dispatchEase({ type: 'easeIn', influenceIn: 75, influenceOut: 0.1 });
        });

        container.querySelector('#preset-out').addEventListener('click', function () {
            setSliders(0.1, 75);
            dispatchEase({ type: 'easeOut', influenceIn: 0.1, influenceOut: 75 });
        });

        container.querySelector('#preset-linear').addEventListener('click', function () {
            setSliders(0.1, 0.1);
            dispatchEase({ type: 'linear' });
        });

        container.querySelector('#preset-hold').addEventListener('click', function () {
            dispatchEase({ type: 'hold' });
        });

        // ─── Quick Influence Buttons ────────────────────────────────────
        container.querySelector('#speed-smooth').addEventListener('click', function () {
            setSliders(33, 33);
            dispatchEase(getCurrentParams('custom'));
        });

        container.querySelector('#speed-snappy').addEventListener('click', function () {
            setSliders(75, 75);
            dispatchEase(getCurrentParams('custom'));
        });

        container.querySelector('#speed-heavy').addEventListener('click', function () {
            setSliders(90, 90);
            dispatchEase(getCurrentParams('custom'));
        });

        // ─── Apply Custom ───────────────────────────────────────────────
        applyBtn.addEventListener('click', function () {
            dispatchEase(getCurrentParams('custom'));
        });

        // ─── Read Ease ──────────────────────────────────────────────────
        readBtn.addEventListener('click', function () {
            self._context.commandBus.dispatch(DoMotions.Commands.Easing.getEaseInfo())
                .then(function (res) {
                    if (res && res.data) {
                        var d = res.data;
                        if (d.influenceIn !== undefined)  { sliderIn.value  = d.influenceIn;  valIn.textContent  = parseFloat(d.influenceIn).toFixed(1)  + '%'; }
                        if (d.influenceOut !== undefined) { sliderOut.value = d.influenceOut; valOut.textContent = parseFloat(d.influenceOut).toFixed(1) + '%'; }
                        if (d.speedIn !== undefined)  speedIn.value  = d.speedIn;
                        if (d.speedOut !== undefined) speedOut.value = d.speedOut;
                        DoMotions.UIManager.showStatus('Read ease: ' + (d.type || 'custom') + ' | In ' + parseFloat(d.influenceIn).toFixed(1) + '% | Out ' + parseFloat(d.influenceOut).toFixed(1) + '%', 'info');
                    }
                })
                .catch(function (err) {
                    var errMsg = (err && err.message) ? err.message : 'Error reading ease';
                    DoMotions.UIManager.showStatus(errMsg, 'error');
                });
        });
    };

    EasingModule.prototype.destroy = function () {
        console.log('[DoMotions:Easing] Easing module destroyed');
    };

    // Register with Plugin Registry
    DoMotions.Registry.register({
        id: 'easing',
        name: 'Easing',
        icon: 'easing',
        order: 30,
        version: '0.1.0',
        dependencies: [],
        enabled: true,
        placeholder: false,
        instance: new EasingModule()
    });

})();
