(function () {
    $.DoMotions = $.DoMotions || {};
    $.DoMotions.modules = $.DoMotions.modules || {};
    $.DoMotions.modules.anchor = {};

    // Read the layer's current Position, dimension-safe and separated-safe.
    function _readPosition(layer, is3D) {
        if (layer.position.dimensionsSeparated) {
            var tg = layer.property("ADBE Transform Group");
            var x = tg.property("ADBE Position_0").value;
            var y = tg.property("ADBE Position_1").value;
            return is3D ? [x, y, tg.property("ADBE Position_2").value] : [x, y];
        }
        return layer.position.value;
    }

    // Write Position, honoring keyframes and separated dimensions.
    function _applyPosition(layer, time, is3D, val) {
        if (layer.position.dimensionsSeparated) {
            var tg = layer.property("ADBE Transform Group");
            var px = tg.property("ADBE Position_0");
            var py = tg.property("ADBE Position_1");
            var pz = is3D ? tg.property("ADBE Position_2") : null;
            if (px.numKeys > 0) px.setValueAtTime(time, val[0]); else px.setValue(val[0]);
            if (py.numKeys > 0) py.setValueAtTime(time, val[1]); else py.setValue(val[1]);
            if (is3D && pz) { if (pz.numKeys > 0) pz.setValueAtTime(time, val[2]); else pz.setValue(val[2]); }
        } else {
            if (layer.position.numKeys > 0) layer.position.setValueAtTime(time, val);
            else layer.position.setValue(val);
        }
    }

    // Write Anchor Point, honoring keyframes.
    function _applyAnchor(layer, time, val) {
        if (layer.anchorPoint.numKeys > 0) layer.anchorPoint.setValueAtTime(time, val);
        else layer.anchorPoint.setValue(val);
    }

    function _moveAnchor(layer, newAnchor) {
        var comp = layer.containingComp;
        var time = comp.time;
        var is3D = layer.threeDLayer;

        // `newAnchor` is in the layer's SOURCE (content) space — the same space as
        // anchorPoint.value and sourceRectAtTime. Match its length to the layer.
        var oldA = layer.anchorPoint.value;
        var newA = is3D ? [newAnchor[0], newAnchor[1], (newAnchor[2] || 0)]
            : [newAnchor[0], newAnchor[1]];

        var pos = _readPosition(layer, is3D);

        // NOTE: toWorld/fromWorld/toWorldVec are EXPRESSION-only methods — they do
        // not exist on the scripting Layer object, which is why the old approach
        // failed. sourcePointToComp() (AVLayer, AE 17.0/2020+) is the scripting
        // equivalent and is exactly what anchor tools should use.
        if (typeof layer.sourcePointToComp === 'function') {
            var p2 = [newA[0], newA[1]];
            // Comp-space position of the target content point BEFORE moving anchor.
            var before = layer.sourcePointToComp(p2);
            _applyAnchor(layer, time, newA);
            // ...and AFTER. The layer shifted by (after - before) on screen.
            var after = layer.sourcePointToComp(p2);
            var dx = after[0] - before[0];
            var dy = after[1] - before[1];
            // Cancel that shift via Position so the layer stays visually put.
            // Handles scale, rotation and parenting for the comp (screen) plane.
            var newPos = is3D ? [pos[0] - dx, pos[1] - dy, pos[2]]
                : [pos[0] - dx, pos[1] - dy];
            _applyPosition(layer, time, is3D, newPos);
        } else {
            // Fallback for pre-2020: compensate using the layer's own scale + 2D
            // rotation (both relative to the parent, so the result is already in
            // Position space). 3D rotation is not compensated on this path.
            var s = layer.scale.value;
            var scx = (newA[0] - oldA[0]) * (s[0] / 100);
            var scy = (newA[1] - (oldA[1] || 0)) * (s[1] / 100);
            var rot = (layer.rotation && !is3D) ? layer.rotation.value : 0;
            var rad = rot * Math.PI / 180, c = Math.cos(rad), sn = Math.sin(rad);
            var pdx = scx * c - scy * sn;
            var pdy = scx * sn + scy * c;
            var newPos2 = is3D ? [pos[0] + pdx, pos[1] + pdy, pos[2]]
                : [pos[0] + pdx, pos[1] + pdy];
            _applyAnchor(layer, time, newA);
            _applyPosition(layer, time, is3D, newPos2);
        }
    }

    function _getNewAnchorForPosition(layer, positionStr) {
        var comp = layer.containingComp;
        var x = 0, y = 0, w = 0, h = 0;

        // Use sourceRectAtTime if available (Text, Shape, Solids, Precomps)
        if (typeof layer.sourceRectAtTime === 'function') {
            try {
                var rect = layer.sourceRectAtTime(comp.time, false);
                x = rect.left;
                y = rect.top;
                w = rect.width;
                h = rect.height;
            } catch (e) {
                throw new Error(
                    "Anchor: failed reading sourceRectAtTime to layer '" +
                    layer.name + "': " + e.message
                );
            }
        }

        var ax = x, ay = y;
        switch (positionStr) {
            case 'TL': ax = x; ay = y; break;
            case 'TC': ax = x + w / 2; ay = y; break;
            case 'TR': ax = x + w; ay = y; break;
            case 'ML': ax = x; ay = y + h / 2; break;
            case 'MC': ax = x + w / 2; ay = y + h / 2; break;
            case 'MR': ax = x + w; ay = y + h / 2; break;
            case 'BL': ax = x; ay = y + h; break;
            case 'BC': ax = x + w / 2; ay = y + h; break;
            case 'BR': ax = x + w; ay = y + h; break;
            default: ax = x + w / 2; ay = y + h / 2; break;
        }

        var currentZ = layer.anchorPoint.value.length > 2 ? layer.anchorPoint.value[2] : 0;
        return [ax, ay, currentZ];
    }

    function _isUnsupportedLayer(layer) {
        if (!layer) return false;
        if (typeof CameraLayer !== 'undefined' && layer instanceof CameraLayer) return true;
        if (typeof LightLayer !== 'undefined' && layer instanceof LightLayer) return true;
        if (layer.matchName && (layer.matchName === 'ADBE Camera Layer' || layer.matchName === 'ADBE Light Layer')) return true;
        return false;
    }

    function _validateSupportedLayers(layers) {
        for (var i = 0; i < layers.length; i++) {
            if (_isUnsupportedLayer(layers[i])) {
                throw new Error("Anchor Point not supported to this layer.");
            }
        }
    }

    // 1. Set Position (Grid)
    $.DoMotions.modules.anchor.setPosition = function (params) {
        return $.DoMotions.utils.undoGroup('Set Anchor Point', function () {
            var layers = $.DoMotions.utils.getSelectedLayers();
            var posStr = params.position || 'MC';

            // Reject operation immediately if any layer is unsupported to prevent partial execution
            _validateSupportedLayers(layers);

            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                var newA = _getNewAnchorForPosition(layer, posStr);
                _moveAnchor(layer, newA);
            }

            return {
                affectedLayers: layers.length,
                message: 'Anchor set to ' + posStr
            };
        });
    };

    // 2. Center to Content
    $.DoMotions.modules.anchor.centerToContent = function (params) {
        return $.DoMotions.utils.undoGroup('Center Anchor to Content', function () {
            var layers = $.DoMotions.utils.getSelectedLayers();

            // Reject operation immediately if any layer is unsupported to prevent partial execution
            _validateSupportedLayers(layers);

            for (var i = 0; i < layers.length; i++) {
                var layerC = layers[i];
                var newA = _getNewAnchorForPosition(layerC, 'MC');
                _moveAnchor(layerC, newA);
            }

            return {
                affectedLayers: layers.length,
                message: 'Centered anchor to content'
            };
        });
    };

    // 3. Get Current Position
    $.DoMotions.modules.anchor.getCurrentPosition = function (params) {
        var layers = $.DoMotions.utils.getSelectedLayers();
        if (_isUnsupportedLayer(layers[0])) {
            throw new Error("Anchor Point not supported to this layer.");
        }
        var a = layers[0].anchorPoint.value;
        return {
            x: a[0],
            y: a[1],
            z: a.length > 2 ? a[2] : 0,
            message: 'Anchor position retrieved'
        };
    };
})();
