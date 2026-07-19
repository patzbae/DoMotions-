(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    // ── Curve → SVG mapping (viewBox is 0..100, plot area padded to 10..90) ──
    var PAD = 10;
    var SPAN = 80; // 100 - 2*PAD

    function toSvgX(bx) { return PAD + bx * SPAN; }
    function toSvgY(by) { return (100 - PAD) - by * SPAN; } // by=0 bottom, by=1 top

    function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Copy text to clipboard (execCommand works inside CEP's older Chromium).
    function copyText(text) {
        try {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            return ok;
        } catch (e) { return false; }
    }

    // Parse the first four numbers out of a "cubic-bezier(a, b, c, d)" style string.
    function parseBezier(str) {
        if (!str) return null;
        var m = String(str).match(/-?\d*\.?\d+/g);
        if (!m || m.length < 4) return null;
        return {
            x1: parseFloat(m[0]), y1: parseFloat(m[1]),
            x2: parseFloat(m[2]), y2: parseFloat(m[3])
        };
    }

    // Built-in presets: name → cubic-bezier(x1, y1, x2, y2). All monotonic
    // (temporal ease cannot overshoot), so no "back"/"elastic" curves here.
    var PRESETS = [
        { name: 'Smooth',   v: [0.33, 0.00, 0.67, 1.00] },
        { name: 'Ease In',  v: [0.42, 0.00, 1.00, 1.00] },
        { name: 'Ease Out', v: [0.00, 0.00, 0.58, 1.00] },
        { name: 'In-Out',   v: [0.42, 0.00, 0.58, 1.00] },
        { name: 'Quad In',  v: [0.11, 0.00, 0.50, 0.00] },
        { name: 'Quad Out', v: [0.50, 1.00, 0.89, 1.00] },
        { name: 'Quad IO',  v: [0.45, 0.00, 0.55, 1.00] },
        { name: 'Cubic In', v: [0.32, 0.00, 0.67, 0.00] },
        { name: 'Cubic Out',v: [0.33, 1.00, 0.68, 1.00] },
        { name: 'Cubic IO', v: [0.65, 0.00, 0.35, 1.00] },
        { name: 'Quart In', v: [0.50, 0.00, 0.75, 0.00] },
        { name: 'Quart Out',v: [0.25, 1.00, 0.50, 1.00] },
        { name: 'Quart IO', v: [0.76, 0.00, 0.24, 1.00] },
        { name: 'Expo In',  v: [0.70, 0.00, 0.84, 0.00] },
        { name: 'Expo Out', v: [0.16, 1.00, 0.30, 1.00] },
        { name: 'Expo IO',  v: [0.87, 0.00, 0.13, 1.00] }
    ];

    var DEFAULT_CURVE = { x1: 0.33, y1: 0.00, x2: 0.67, y2: 1.00 };

    var GraphModule = function () {
        this._context = null;
        this._curve = null;
        this._els = null;
        this._active = null;       // 'p1' | 'p2' | null
        this._moveHandler = null;
        this._upHandler = null;
    };

    GraphModule.prototype.initialize = function (context) {
        this._context = context;
        return Promise.resolve();
    };

    GraphModule.prototype.render = function (container) {
        var self = this;
        var icons = this._context.icons;

        // Restore last curve (persisted) or fall back to default.
        var saved = this._context.settings.get('modules.graph.lastCurve');
        this._curve = (saved && typeof saved.x1 === 'number')
            ? { x1: saved.x1, y1: saved.y1, x2: saved.x2, y2: saved.y2 }
            : { x1: DEFAULT_CURVE.x1, y1: DEFAULT_CURVE.y1, x2: DEFAULT_CURVE.x2, y2: DEFAULT_CURVE.y2 };

        // ── Preset buttons markup ──
        var presetHtml = '';
        for (var i = 0; i < PRESETS.length; i++) {
            presetHtml += '<button class="dm-btn dm-graph-preset" data-preset="' + i + '">' + PRESETS[i].name + '</button>';
        }

        container.innerHTML =
            '<div class="module-content">' +
                '<section class="dm-section">' +
                    '<div class="dm-section-title">Ease Curve</div>' +
                    '<div class="dm-graph-wrap">' +
                        '<svg id="dm-graph-svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
                            '<rect x="0" y="0" width="100" height="100" fill="transparent" class="dm-graph-hit"/>' +
                            '<rect x="10" y="10" width="80" height="80" class="dm-graph-frame"/>' +
                            '<line x1="36.67" y1="10" x2="36.67" y2="90" class="dm-graph-grid"/>' +
                            '<line x1="63.33" y1="10" x2="63.33" y2="90" class="dm-graph-grid"/>' +
                            '<line x1="10" y1="36.67" x2="90" y2="36.67" class="dm-graph-grid"/>' +
                            '<line x1="10" y1="63.33" x2="90" y2="63.33" class="dm-graph-grid"/>' +
                            '<line x1="10" y1="90" x2="90" y2="10" class="dm-graph-linear"/>' +
                            '<line id="dm-graph-line1" class="dm-graph-handleline"/>' +
                            '<line id="dm-graph-line2" class="dm-graph-handleline"/>' +
                            '<path id="dm-graph-curve" class="dm-graph-curve"/>' +
                            '<circle cx="10" cy="90" r="2" class="dm-graph-endpoint"/>' +
                            '<circle cx="90" cy="10" r="2" class="dm-graph-endpoint"/>' +
                            '<circle id="dm-graph-h1" r="4" class="dm-graph-handle"/>' +
                            '<circle id="dm-graph-h2" r="4" class="dm-graph-handle"/>' +
                        '</svg>' +
                    '</div>' +
                    '<div class="dm-graph-toolbar">' +
                        '<span class="dm-graph-readout" id="dm-graph-readout"></span>' +
                        '<button class="dm-btn dm-graph-mini" id="dm-graph-copy" data-tooltip="Copy cubic-bezier">Copy</button>' +
                        '<button class="dm-btn dm-graph-mini" id="dm-graph-paste" data-tooltip="Paste cubic-bezier">Paste</button>' +
                    '</div>' +
                    '<div class="dm-graph-inputs">' +
                        '<label>X1<input type="number" id="dm-in-x1" step="0.01" min="0" max="1"></label>' +
                        '<label>Y1<input type="number" id="dm-in-y1" step="0.01" min="0" max="1"></label>' +
                        '<label>X2<input type="number" id="dm-in-x2" step="0.01" min="0" max="1"></label>' +
                        '<label>Y2<input type="number" id="dm-in-y2" step="0.01" min="0" max="1"></label>' +
                    '</div>' +
                '</section>' +

                '<section class="dm-section">' +
                    '<div class="dm-section-title">Presets</div>' +
                    '<div class="dm-btn-group dm-graph-presets">' + presetHtml + '</div>' +
                '</section>' +

                '<section class="dm-section">' +
                    '<div class="dm-section-title">Custom Presets</div>' +
                    '<button class="dm-btn dm-graph-mini" id="dm-graph-save" style="width:100%;margin-bottom:6px;">+ Save Current Curve</button>' +
                    '<div class="dm-graph-custom-list" id="dm-graph-custom"></div>' +
                '</section>' +

                '<div style="margin-top: 12px;">' +
                    '<button class="dm-btn primary" id="dm-graph-apply" style="width:100%;">' +
                        icons.get('graph', { size: '14px' }) + ' Apply to Keyframes' +
                    '</button>' +
                '</div>' +
                '<p class="dm-graph-hint">Select 2+ keyframes, shape the curve, then Apply.</p>' +
            '</div>';

        // ── Cache element references ──
        this._els = {
            svg:     container.querySelector('#dm-graph-svg'),
            curve:   container.querySelector('#dm-graph-curve'),
            line1:   container.querySelector('#dm-graph-line1'),
            line2:   container.querySelector('#dm-graph-line2'),
            h1:      container.querySelector('#dm-graph-h1'),
            h2:      container.querySelector('#dm-graph-h2'),
            readout: container.querySelector('#dm-graph-readout'),
            inX1:    container.querySelector('#dm-in-x1'),
            inY1:    container.querySelector('#dm-in-y1'),
            inX2:    container.querySelector('#dm-in-x2'),
            inY2:    container.querySelector('#dm-in-y2'),
            customList: container.querySelector('#dm-graph-custom')
        };

        this._update();
        this._syncInputs();
        this._renderCustom();

        // ── Handle dragging (grab nearest handle anywhere in the SVG) ──
        this._moveHandler = function (e) { self._onMove(e); };
        this._upHandler   = function ()  { self._onUp(); };
        this._els.svg.addEventListener('mousedown', function (e) { self._onDown(e); });

        // ── Numeric inputs (two-way sync) ──
        this._bindInput(this._els.inX1, 'x1');
        this._bindInput(this._els.inY1, 'y1');
        this._bindInput(this._els.inX2, 'x2');
        this._bindInput(this._els.inY2, 'y2');

        // ── Presets ──
        var presetBtns = container.querySelectorAll('.dm-graph-preset');
        for (var b = 0; b < presetBtns.length; b++) {
            presetBtns[b].addEventListener('click', function (e) {
                var idx = parseInt(e.currentTarget.getAttribute('data-preset'), 10);
                var v = PRESETS[idx].v;
                self._setCurve({ x1: v[0], y1: v[1], x2: v[2], y2: v[3] }, true);
            });
        }

        // ── Copy / Paste ──
        container.querySelector('#dm-graph-copy').addEventListener('click', function () {
            var str = self._bezierString();
            if (copyText(str)) DoMotions.UIManager.showStatus('Copied ' + str, 'info');
            else DoMotions.UIManager.showStatus('Copy failed', 'error');
        });
        container.querySelector('#dm-graph-paste').addEventListener('click', function () {
            var input = window.prompt('Paste a cubic-bezier value:', self._bezierString());
            if (!input) return;
            var parsed = parseBezier(input);
            if (parsed) {
                self._setCurve(parsed, true);
                DoMotions.UIManager.showStatus('Pasted curve', 'info');
            } else {
                DoMotions.UIManager.showStatus('Could not parse 4 numbers from input', 'error');
            }
        });

        // ── Save custom preset ──
        container.querySelector('#dm-graph-save').addEventListener('click', function () {
            var name = window.prompt('Preset name:', 'My Curve');
            if (!name) return;
            var arr = self._context.settings.get('modules.graph.customPresets') || [];
            arr.push({ name: name, v: [self._curve.x1, self._curve.y1, self._curve.x2, self._curve.y2] });
            self._context.settings.set('modules.graph.customPresets', arr);
            self._renderCustom();
            DoMotions.UIManager.showStatus('Saved preset: ' + name, 'success');
        });

        // ── Apply ──
        container.querySelector('#dm-graph-apply').addEventListener('click', function () {
            self._apply();
        });
    };

    // Formatted "cubic-bezier(...)" string for the current curve.
    GraphModule.prototype._bezierString = function () {
        var c = this._curve;
        return 'cubic-bezier(' + c.x1.toFixed(2) + ', ' + c.y1.toFixed(2) +
               ', ' + c.x2.toFixed(2) + ', ' + c.y2.toFixed(2) + ')';
    };

    // Set the whole curve from any source, clamp, redraw, sync inputs, persist.
    GraphModule.prototype._setCurve = function (c, persist) {
        this._curve = {
            x1: clamp01(c.x1), y1: clamp01(c.y1),
            x2: clamp01(c.x2), y2: clamp01(c.y2)
        };
        this._update();
        this._syncInputs();
        if (persist) this._persist();
    };

    // Recompute all curve/handle positions and the numeric readout.
    GraphModule.prototype._update = function () {
        var c = this._curve, els = this._els;

        var p1x = toSvgX(c.x1), p1y = toSvgY(c.y1);
        var p2x = toSvgX(c.x2), p2y = toSvgY(c.y2);
        var p0x = toSvgX(0),    p0y = toSvgY(0);
        var p3x = toSvgX(1),    p3y = toSvgY(1);

        els.curve.setAttribute('d',
            'M ' + p0x + ' ' + p0y +
            ' C ' + p1x + ' ' + p1y + ' ' + p2x + ' ' + p2y + ' ' + p3x + ' ' + p3y);

        els.line1.setAttribute('x1', p0x); els.line1.setAttribute('y1', p0y);
        els.line1.setAttribute('x2', p1x); els.line1.setAttribute('y2', p1y);
        els.line2.setAttribute('x1', p3x); els.line2.setAttribute('y1', p3y);
        els.line2.setAttribute('x2', p2x); els.line2.setAttribute('y2', p2y);

        els.h1.setAttribute('cx', p1x); els.h1.setAttribute('cy', p1y);
        els.h2.setAttribute('cx', p2x); els.h2.setAttribute('cy', p2y);

        els.readout.textContent = this._bezierString();
    };

    // Push current curve values into the numeric input fields.
    GraphModule.prototype._syncInputs = function () {
        var c = this._curve, els = this._els;
        els.inX1.value = c.x1.toFixed(2);
        els.inY1.value = c.y1.toFixed(2);
        els.inX2.value = c.x2.toFixed(2);
        els.inY2.value = c.y2.toFixed(2);
    };

    GraphModule.prototype._bindInput = function (el, key) {
        var self = this;
        // Live update while typing (don't rewrite the field mid-edit).
        el.addEventListener('input', function () {
            var val = parseFloat(el.value);
            if (isNaN(val)) return;
            self._curve[key] = clamp01(val);
            self._update();
            self._persist();
        });
        // Normalize formatting when the field loses focus / commits.
        el.addEventListener('change', function () {
            self._syncInputs();
        });
    };

    // ── Drag: mouse event → viewBox coords (0..100). ok=false before layout. ──
    GraphModule.prototype._clientToSvg = function (e) {
        var rect = this._els.svg.getBoundingClientRect();
        return {
            ok: rect.width > 0 && rect.height > 0,
            x: (e.clientX - rect.left) / rect.width * 100,
            y: (e.clientY - rect.top) / rect.height * 100
        };
    };

    GraphModule.prototype._onDown = function (e) {
        var s = this._clientToSvg(e);
        if (!s.ok) return;
        var d1 = Math.sqrt(Math.pow(toSvgX(this._curve.x1) - s.x, 2) + Math.pow(toSvgY(this._curve.y1) - s.y, 2));
        var d2 = Math.sqrt(Math.pow(toSvgX(this._curve.x2) - s.x, 2) + Math.pow(toSvgY(this._curve.y2) - s.y, 2));
        if (Math.min(d1, d2) > 22) return; // clicked far from both handles
        e.preventDefault();
        this._active = (d1 <= d2) ? 'p1' : 'p2';
        document.addEventListener('mousemove', this._moveHandler);
        document.addEventListener('mouseup', this._upHandler);
        this._onMove(e); // snap grabbed handle under the cursor
    };

    GraphModule.prototype._onMove = function (e) {
        if (!this._active) return;
        var s = this._clientToSvg(e);
        if (!s.ok) return;
        var bx = clamp01((s.x - PAD) / SPAN);
        var by = clamp01(((100 - PAD) - s.y) / SPAN);
        if (this._active === 'p1') { this._curve.x1 = bx; this._curve.y1 = by; }
        else                       { this._curve.x2 = bx; this._curve.y2 = by; }
        this._update();
        this._syncInputs();
    };

    GraphModule.prototype._onUp = function () {
        this._active = null;
        document.removeEventListener('mousemove', this._moveHandler);
        document.removeEventListener('mouseup', this._upHandler);
        this._persist();
    };

    GraphModule.prototype._persist = function () {
        this._context.settings.set('modules.graph.lastCurve', {
            x1: this._curve.x1, y1: this._curve.y1,
            x2: this._curve.x2, y2: this._curve.y2
        });
    };

    // ── Custom presets list ──
    GraphModule.prototype._renderCustom = function () {
        var self = this;
        var list = this._els.customList;
        var presets = this._context.settings.get('modules.graph.customPresets') || [];

        if (!presets.length) {
            list.innerHTML = '<span class="dm-graph-hint" style="margin:0;">No custom presets yet.</span>';
            return;
        }

        var html = '';
        for (var i = 0; i < presets.length; i++) {
            html += '<span class="dm-graph-chip">' +
                        '<button class="dm-graph-chip-apply" data-idx="' + i + '">' + escapeHtml(presets[i].name) + '</button>' +
                        '<button class="dm-graph-chip-del" data-idx="' + i + '" data-tooltip="Delete">&times;</button>' +
                    '</span>';
        }
        list.innerHTML = html;

        var applies = list.querySelectorAll('.dm-graph-chip-apply');
        for (var a = 0; a < applies.length; a++) {
            applies[a].addEventListener('click', function (e) {
                var idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                var arr = self._context.settings.get('modules.graph.customPresets') || [];
                if (arr[idx]) {
                    var v = arr[idx].v;
                    self._setCurve({ x1: v[0], y1: v[1], x2: v[2], y2: v[3] }, true);
                }
            });
        }
        var dels = list.querySelectorAll('.dm-graph-chip-del');
        for (var d = 0; d < dels.length; d++) {
            dels[d].addEventListener('click', function (e) {
                var idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
                var arr = self._context.settings.get('modules.graph.customPresets') || [];
                arr.splice(idx, 1);
                self._context.settings.set('modules.graph.customPresets', arr);
                self._renderCustom();
            });
        }
    };

    GraphModule.prototype._apply = function () {
        this._context.commandBus.dispatch(DoMotions.Commands.Graph.applyEase({
            x1: this._curve.x1, y1: this._curve.y1,
            x2: this._curve.x2, y2: this._curve.y2
        }))
        .then(function (res) {
            var msg = (res && res.data && res.data.message) ? res.data.message : 'Curve applied';
            DoMotions.UIManager.showStatus(msg, 'success');
        })
        .catch(function (err) {
            var msg = (err && err.message) ? err.message : 'Error applying curve';
            DoMotions.UIManager.showStatus(msg, 'error', 15000);
        });
    };

    GraphModule.prototype.destroy = function () {
        if (this._moveHandler) document.removeEventListener('mousemove', this._moveHandler);
        if (this._upHandler)   document.removeEventListener('mouseup', this._upHandler);
        this._active = null;
        console.log('[DoMotions:Graph] Graph module destroyed');
    };

    DoMotions.Registry.register({
        id: 'graph',
        name: 'Graph',
        icon: 'graph',
        order: 20,
        version: '0.1.0',
        dependencies: [],
        enabled: true,
        placeholder: false,
        instance: new GraphModule()
    });

})();
