/**
 * DoMotions - Anchor Module DIAGNOSTIC VERSION
 * File  : jsx/modules/anchor_diag.jsx
 * Status: DIAGNOSTIC ONLY - DO NOT SHIP
 * 
 * Instruksi penggunaan:
 *   1. Di hostscript.jsx, ganti baris:
 *        $.evalFile(_basePath + '/modules/anchor.jsx');
 *      dengan:
 *        $.evalFile(_basePath + '/modules/anchor_diag.jsx');
 *   2. Reload panel di AE.
 *   3. Log tampil di $.writeln -> ExtendScript Console
 *      dan di field "diagLog" pada response setiap command.
 *   4. Setelah selesai diagnosis, kembalikan hostscript.jsx ke anchor.jsx.
 */

(function () {
    $.DoMotions = $.DoMotions || {};
    $.DoMotions.modules = $.DoMotions.modules || {};
    $.DoMotions.modules.anchor = {};

    // =========================================================================
    // DIAGNOSTIC LOGGER
    // =========================================================================
    var _diagLog = [];
    var _callId  = 0;

    function _dlog(tag, data) {
        var entry = '[ANCHOR-DIAG][' + tag + '] ' + JSON.stringify(data);
        $.writeln(entry);
        _diagLog.push(entry);
    }

    function _dlogSection(title) {
        var line = '=== ' + title + ' ===';
        $.writeln(line);
        _diagLog.push(line);
    }

    function _resetLog() {
        _diagLog = [];
        _callId++;
        $.writeln('\n\n========== ANCHOR DIAG CALL #' + _callId + ' ==========');
    }

    // =========================================================================
    // SAFE PROPERTY READER
    // =========================================================================
    function _safeRead(label, fn) {
        try {
            var result = fn();
            _dlog('READ_OK', { label: label, value: result });
            return { ok: true, value: result };
        } catch (e) {
            _dlog('READ_ERR', { label: label, error: e.message, toString: String(e) });
            return { ok: false, error: e.message, value: undefined };
        }
    }

    function _safeWrite(label, fn) {
        try {
            fn();
            _dlog('WRITE_OK', { label: label });
            return { ok: true };
        } catch (e) {
            _dlog('WRITE_ERR', { label: label, error: e.message, toString: String(e) });
            return { ok: false, error: e.message };
        }
    }

    // =========================================================================
    // COMP SNAPSHOT
    // =========================================================================
    function _snapComp(comp) {
        _dlogSection('ACTIVE COMP');
        var snap = {};
        snap.name     = _safeRead('comp.name',     function(){ return comp.name; }).value;
        snap.width    = _safeRead('comp.width',    function(){ return comp.width; }).value;
        snap.height   = _safeRead('comp.height',   function(){ return comp.height; }).value;
        snap.duration = _safeRead('comp.duration', function(){ return comp.duration; }).value;
        snap.time     = _safeRead('comp.time',     function(){ return comp.time; }).value;
        snap.numLayers= _safeRead('comp.numLayers',function(){ return comp.numLayers; }).value;
        _dlog('COMP_SNAP', snap);
        return snap;
    }

    // =========================================================================
    // LAYER TYPE DETECTOR
    // =========================================================================
    function _detectLayerType(layer) {
        try {
            if (layer instanceof TextLayer)       return 'TextLayer';
            if (layer instanceof ShapeLayer)      return 'ShapeLayer';
            if (layer instanceof CameraLayer)     return 'CameraLayer';
            if (layer instanceof LightLayer)      return 'LightLayer';
            if (layer.nullLayer)                  return 'NullLayer';
            if (layer.adjustmentLayer)            return 'AdjustmentLayer';
            return 'AVLayer';
        } catch (e) {
            return 'UNKNOWN(' + e.message + ')';
        }
    }

    // =========================================================================
    // LAYER SNAPSHOT
    // =========================================================================
    function _snapLayer(layer) {
        _dlogSection('LAYER STATE');
        var snap = {};
        snap.name         = _safeRead('layer.name',        function(){ return layer.name; }).value;
        snap.index        = _safeRead('layer.index',       function(){ return layer.index; }).value;
        snap.type         = _detectLayerType(layer);
        snap.is3D         = _safeRead('layer.threeDLayer', function(){ return layer.threeDLayer; }).value;
        snap.enabled      = _safeRead('layer.enabled',     function(){ return layer.enabled; }).value;
        snap.locked       = _safeRead('layer.locked',      function(){ return layer.locked; }).value;
        snap.nullLayer    = _safeRead('layer.nullLayer',   function(){ return layer.nullLayer; }).value;
        
        try {
            var par = layer.parent;
            snap.parent = par ? par.name : null;
        } catch(e) {
            snap.parent = 'ERR:' + e.message;
        }
        
        try {
            snap.dimensionsSeparated = layer.position.dimensionsSeparated;
        } catch(e) {
            snap.dimensionsSeparated = 'ERR:' + e.message;
        }

        _dlog('LAYER_SNAP', snap);
        return snap;
    }

    // =========================================================================
    // TRANSFORM SNAPSHOT
    // =========================================================================
    function _snapTransform(layer, is3D) {
        _dlogSection('TRANSFORM STATE');
        var snap = {};
        
        snap.anchorPoint     = _safeRead('anchorPoint.value',  function(){ return layer.anchorPoint.value; }).value;
        snap.anchorNumKeys   = _safeRead('anchorPoint.numKeys',function(){ return layer.anchorPoint.numKeys; }).value;
        snap.positionRaw     = _safeRead('position.value',     function(){ return layer.position.value; }).value;
        snap.positionNumKeys = _safeRead('position.numKeys',   function(){ return layer.position.numKeys; }).value;
        
        var dimSep = false;
        try { dimSep = layer.position.dimensionsSeparated; } catch(e) {}
        if (dimSep) {
            try {
                var tg = layer.property("ADBE Transform Group");
                snap.posX = tg.property("ADBE Position_0").value;
                snap.posY = tg.property("ADBE Position_1").value;
                snap.posZ = is3D ? tg.property("ADBE Position_2").value : null;
            } catch(e) {
                snap.separatedPosError = e.message;
            }
        }
        
        snap.scale = _safeRead('scale.value', function(){ return layer.scale.value; }).value;
        
        if (!is3D) {
            snap.rotation = _safeRead('rotation.value', function(){ return layer.rotation.value; }).value;
        } else {
            snap.orientation = _safeRead('orientation.value', function(){ return layer.orientation.value; }).value;
            snap.xRotation   = _safeRead('xRotation.value',   function(){ return layer.xRotation.value; }).value;
            snap.yRotation   = _safeRead('yRotation.value',   function(){ return layer.yRotation.value; }).value;
            snap.zRotation   = _safeRead('zRotation.value',   function(){ return layer.zRotation.value; }).value;
        }

        _dlog('TRANSFORM_SNAP', snap);
        return snap;
    }

    // =========================================================================
    // SOURCE RECT SNAPSHOT
    // =========================================================================
    function _snapSourceRect(layer, compTime) {
        _dlogSection('SOURCE RECT');
        var snap = {};
        snap.compTime = compTime;
        snap.hasSourceRectAtTime = (typeof layer.sourceRectAtTime === 'function');
        
        if (snap.hasSourceRectAtTime) {
            try {
                var rect = layer.sourceRectAtTime(compTime, false);
                snap.left   = rect.left;
                snap.top    = rect.top;
                snap.width  = rect.width;
                snap.height = rect.height;
                snap.ok     = true;
            } catch(e) {
                snap.ok       = false;
                snap.error    = e.message;
                snap.toString = String(e);
            }
        } else {
            snap.ok     = false;
            snap.reason = 'layer.sourceRectAtTime is not a function on this layer type';
        }

        _dlog('SOURCE_RECT_SNAP', snap);
        return snap;
    }

    // =========================================================================
    // sourcePointToComp DIAGNOSTIC
    // =========================================================================
    function _diagSourcePointToComp(layer, point2D, label) {
        _dlogSection('sourcePointToComp - ' + label);
        var snap = {};
        snap.input     = point2D;
        snap.hasMethod = (typeof layer.sourcePointToComp === 'function');
        
        if (snap.hasMethod) {
            try {
                snap.result = layer.sourcePointToComp(point2D);
                snap.ok     = true;
            } catch(e) {
                snap.ok       = false;
                snap.error    = e.message;
                snap.toString = String(e);
            }
        } else {
            snap.ok     = false;
            snap.reason = 'layer.sourcePointToComp is NOT available on this layer/AE version';
        }
        _dlog('SOURCEPOINTTOCOMP_' + label.toUpperCase().replace(/ /g,'_'), snap);
        return snap;
    }

    // =========================================================================
    // ANCHOR CALCULATION LOG
    // =========================================================================
    function _snapAnchorCalc(posStr, rectSnap, oldA, newA, is3D) {
        _dlogSection('ANCHOR CALCULATION');
        var snap = {};
        snap.requestedPosition       = posStr;
        snap.rectUsed                = rectSnap;
        snap.oldAnchorPoint          = oldA;
        snap.newAnchorPoint          = newA;
        snap.is3D                    = is3D;
        snap.dimMismatch_oldVsNew    = (oldA && newA) ? (oldA.length !== newA.length) : 'N/A';
        _dlog('ANCHOR_CALC', snap);
        return snap;
    }

    // =========================================================================
    // _readPosition - instrumented
    // =========================================================================
    function _readPosition(layer, is3D) {
        _dlogSection('_readPosition');
        var dimSep = false;
        try { dimSep = layer.position.dimensionsSeparated; } catch(e) { dimSep = false; }
        _dlog('readPos.dimSep', { dimSep: dimSep, is3D: is3D });

        if (dimSep) {
            try {
                var tg  = layer.property("ADBE Transform Group");
                var x   = tg.property("ADBE Position_0").value;
                var y   = tg.property("ADBE Position_1").value;
                var result = is3D ? [x, y, tg.property("ADBE Position_2").value] : [x, y];
                _dlog('readPos.separated', { result: result });
                return result;
            } catch(e) {
                _dlog('readPos.separatedERR', { error: e.message });
                throw e;
            }
        }
        
        try {
            var posVal = layer.position.value;
            _dlog('readPos.direct', { value: posVal });
            return posVal;
        } catch(e) {
            _dlog('readPos.directERR', { error: e.message });
            throw e;
        }
    }

    // =========================================================================
    // _applyPosition - instrumented
    // =========================================================================
    function _applyPosition(layer, time, is3D, val) {
        _dlogSection('_applyPosition');
        _dlog('applyPos.input', { time: time, is3D: is3D, val: val, valLen: val ? val.length : 'null' });

        var dimSep = false;
        try { dimSep = layer.position.dimensionsSeparated; } catch(e) {}
        _dlog('applyPos.dimSep', { dimSep: dimSep });

        if (dimSep) {
            try {
                var tg = layer.property("ADBE Transform Group");
                var px = tg.property("ADBE Position_0");
                var py = tg.property("ADBE Position_1");
                var pz = is3D ? tg.property("ADBE Position_2") : null;
                
                _dlog('applyPos.separated.numKeys', {
                    px: px.numKeys, py: py.numKeys, pz: pz ? pz.numKeys : 'N/A'
                });

                var res = _safeWrite('px.setValue', function() {
                    if (px.numKeys > 0) px.setValueAtTime(time, val[0]); else px.setValue(val[0]);
                });
                if (!res.ok) throw new Error('px write failed: ' + res.error);

                res = _safeWrite('py.setValue', function() {
                    if (py.numKeys > 0) py.setValueAtTime(time, val[1]); else py.setValue(val[1]);
                });
                if (!res.ok) throw new Error('py write failed: ' + res.error);

                if (is3D && pz) {
                    res = _safeWrite('pz.setValue', function() {
                        if (pz.numKeys > 0) pz.setValueAtTime(time, val[2]); else pz.setValue(val[2]);
                    });
                    if (!res.ok) throw new Error('pz write failed: ' + res.error);
                }
            } catch(e) {
                _dlog('applyPos.separatedERR', { error: e.message });
                throw e;
            }
        } else {
            _dlog('applyPos.direct', {
                numKeys:   layer.position.numKeys,
                valLen:    val ? val.length : 'null',
                is3D:      is3D,
                expected:  is3D ? 3 : 2
            });
            var res2 = _safeWrite('position.setValue', function() {
                if (layer.position.numKeys > 0) layer.position.setValueAtTime(time, val);
                else layer.position.setValue(val);
            });
            if (!res2.ok) throw new Error('position write failed: ' + res2.error);
        }
    }

    // =========================================================================
    // _applyAnchor - instrumented
    // =========================================================================
    function _applyAnchor(layer, time, val) {
        _dlogSection('_applyAnchor');
        _dlog('applyAnchor.input', {
            time:    time,
            val:     val,
            valLen:  val ? val.length : 'null',
            numKeys: layer.anchorPoint.numKeys
        });
        var res = _safeWrite('anchorPoint.setValue', function() {
            if (layer.anchorPoint.numKeys > 0) layer.anchorPoint.setValueAtTime(time, val);
            else layer.anchorPoint.setValue(val);
        });
        if (!res.ok) throw new Error('anchorPoint write failed: ' + res.error);
    }

    // =========================================================================
    // _moveAnchor - instrumented
    // =========================================================================
    function _moveAnchor(layer, newAnchor) {
        _dlogSection('_moveAnchor BEGIN');
        var comp  = layer.containingComp;
        var time  = comp.time;
        var is3D  = layer.threeDLayer;

        _dlog('moveAnchor.params', {
            layerName:    layer.name,
            compTime:     time,
            is3D:         is3D,
            newAnchorIn:  newAnchor,
            newAnchorLen: newAnchor ? newAnchor.length : 'null'
        });

        var oldA_res = _safeRead('anchorPoint.value', function(){ return layer.anchorPoint.value; });
        var oldA = oldA_res.ok ? oldA_res.value : null;

        var newA = is3D ? [newAnchor[0], newAnchor[1], (newAnchor[2] || 0)]
                        : [newAnchor[0], newAnchor[1]];

        _dlog('moveAnchor.anchorDims', {
            oldA:       oldA,
            oldALen:    oldA ? oldA.length : 'null',
            newA:       newA,
            newALen:    newA ? newA.length : 'null',
            dimMatch:   oldA ? (oldA.length === newA.length) : 'CANNOT CHECK',
            is3D:       is3D,
            warning:    (is3D && newAnchor.length === 2)
                ? 'INPUT only has 2 elements but layer is 3D - Z defaulted to 0'
                : 'OK'
        });

        var pos = _readPosition(layer, is3D);

        _dlog('moveAnchor.position', {
            pos:      pos,
            posLen:   pos ? pos.length : 'null',
            is3D:     is3D,
            dimMatch: pos ? (is3D ? pos.length === 3 : pos.length === 2) : 'CANNOT CHECK'
        });

        var hasMethod = (typeof layer.sourcePointToComp === 'function');
        _dlog('moveAnchor.pathDecision', {
            hasSourcePointToComp: hasMethod,
            path: hasMethod ? 'PRIMARY (sourcePointToComp)' : 'FALLBACK (manual scale+rot)'
        });

        if (hasMethod) {
            var p2 = [newA[0], newA[1]];
            _dlog('moveAnchor.primary.p2', { p2: p2, note: '2D input to sourcePointToComp' });

            var before_snap = _diagSourcePointToComp(layer, p2, 'BEFORE ANCHOR MOVE');
            if (!before_snap.ok) {
                throw new Error('sourcePointToComp BEFORE failed: ' + (before_snap.error || before_snap.reason));
            }
            var before = before_snap.result;

            _applyAnchor(layer, time, newA);

            var after_snap = _diagSourcePointToComp(layer, p2, 'AFTER ANCHOR MOVE');
            if (!after_snap.ok) {
                throw new Error('sourcePointToComp AFTER failed: ' + (after_snap.error || after_snap.reason));
            }
            var after = after_snap.result;

            var dx = after[0] - before[0];
            var dy = after[1] - before[1];

            _dlog('moveAnchor.primary.shift', {
                before: before, after: after, dx: dx, dy: dy
            });

            var newPos = is3D ? [pos[0] - dx, pos[1] - dy, pos[2]]
                              : [pos[0] - dx, pos[1] - dy];

            _dlog('moveAnchor.primary.newPos', {
                oldPos: pos, newPos: newPos, posLen: newPos.length, is3D: is3D
            });

            _applyPosition(layer, time, is3D, newPos);

        } else {
            _dlogSection('FALLBACK PATH (pre-AE2020)');
            var s_res = _safeRead('scale.value', function(){ return layer.scale.value; });
            var s = s_res.ok ? s_res.value : [100, 100];
            
            var scx = (newA[0] - (oldA ? oldA[0] : 0)) * (s[0] / 100);
            var scy = (newA[1] - (oldA ? (oldA[1] || 0) : 0)) * (s[1] / 100);

            var rot = 0;
            if (!is3D) {
                var rot_res = _safeRead('rotation.value', function(){ return layer.rotation.value; });
                rot = rot_res.ok ? rot_res.value : 0;
            }
            var rad = rot * Math.PI / 180;
            var c   = Math.cos(rad);
            var sn  = Math.sin(rad);
            var pdx = scx * c - scy * sn;
            var pdy = scx * sn + scy * c;

            var newPos2 = is3D ? [pos[0] + pdx, pos[1] + pdy, pos[2]]
                               : [pos[0] + pdx, pos[1] + pdy];

            _dlog('moveAnchor.fallback.calc', {
                scale: s, scx: scx, scy: scy, rotation: rot,
                pdx: pdx, pdy: pdy, oldPos: pos, newPos: newPos2
            });

            _applyAnchor(layer, time, newA);
            _applyPosition(layer, time, is3D, newPos2);
        }

        _dlogSection('_moveAnchor END - SUCCESS');
    }

    // =========================================================================
    // _getNewAnchorForPosition - instrumented
    // =========================================================================
    function _getNewAnchorForPosition(layer, positionStr) {
        _dlogSection('_getNewAnchorForPosition');
        var comp = layer.containingComp;
        var x = 0, y = 0, w = 0, h = 0;
        var rectSnap = null;
        
        if (typeof layer.sourceRectAtTime === 'function') {
            rectSnap = _snapSourceRect(layer, comp.time);
            if (rectSnap.ok) {
                x = rectSnap.left;
                y = rectSnap.top;
                w = rectSnap.width;
                h = rectSnap.height;
            } else {
                _dlog('getNewAnchor.sourceRectFailed', {
                    error:  rectSnap.error,
                    reason: rectSnap.reason,
                    note:   'Falling back to x=y=w=h=0'
                });
            }
        } else {
            _dlog('getNewAnchor.noSourceRect', {
                layerType: _detectLayerType(layer),
                note: 'sourceRectAtTime not available - x=y=w=h=0'
            });
        }

        _dlog('getNewAnchor.rectValues', { x: x, y: y, w: w, h: h });

        var ax = x, ay = y;
        switch (positionStr) {
            case 'TL': ax = x;         ay = y;         break;
            case 'TC': ax = x + w / 2; ay = y;         break;
            case 'TR': ax = x + w;     ay = y;         break;
            case 'ML': ax = x;         ay = y + h / 2; break;
            case 'MC': ax = x + w / 2; ay = y + h / 2; break;
            case 'MR': ax = x + w;     ay = y + h / 2; break;
            case 'BL': ax = x;         ay = y + h;     break;
            case 'BC': ax = x + w / 2; ay = y + h;     break;
            case 'BR': ax = x + w;     ay = y + h;     break;
            default:   ax = x + w / 2; ay = y + h / 2; break;
        }

        var currentAnchor_res = _safeRead('anchorPoint.value for Z', function(){ return layer.anchorPoint.value; });
        var currentAnchorVal  = currentAnchor_res.ok ? currentAnchor_res.value : [];
        var currentZ          = (currentAnchorVal.length > 2) ? currentAnchorVal[2] : 0;

        var result = [ax, ay, currentZ];

        _dlog('getNewAnchor.result', {
            positionStr: positionStr,
            ax: ax, ay: ay, currentZ: currentZ,
            result: result, resultLen: 3,
            note: 'Always 3 elements; _moveAnchor trims to 2 for 2D layers'
        });

        return result;
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================

    $.DoMotions.modules.anchor.setPosition = function (params) {
        _resetLog();
        _dlogSection('setPosition CALLED');
        _dlog('setPosition.params', params);

        try {
            return $.DoMotions.utils.undoGroup('Set Anchor Point [DIAG]', function () {
                var layers = $.DoMotions.utils.getSelectedLayers();
                _dlog('setPosition.layerCount', { count: layers.length });

                var posStr = params.position || 'MC';
                _dlog('setPosition.posStr', { posStr: posStr });

                // Pre-validation pass: reject entire operation if any layer is unsupported
                for (var v = 0; v < layers.length; v++) {
                    var l = layers[v];
                    if ((typeof CameraLayer !== 'undefined' && l instanceof CameraLayer) ||
                        (typeof LightLayer !== 'undefined' && l instanceof LightLayer) ||
                        (l.matchName === 'ADBE Camera Layer' || l.matchName === 'ADBE Light Layer')) {
                        _dlog('GUARD_REJECTED', { reason: 'UnsupportedLayer', layerName: l.name });
                        throw new Error("Anchor Point tidak didukung untuk layer ini.");
                    }
                }

                for (var i = 0; i < layers.length; i++) {
                    _dlogSection('LAYER ' + (i+1) + '/' + layers.length);
                    var layer = layers[i];
                    var comp  = layer.containingComp;
                    _snapComp(comp);
                    _snapLayer(layer);
                    _snapTransform(layer, layer.threeDLayer);

                    var newA = _getNewAnchorForPosition(layer, posStr);
                    var oldA;
                    try { oldA = layer.anchorPoint.value; } catch(e) { oldA = null; }
                    _snapAnchorCalc(posStr, null, oldA, newA, layer.threeDLayer);
                    _moveAnchor(layer, newA);
                }

                return {
                    affectedLayers: layers.length,
                    message:        'Anchor set to ' + posStr,
                    diagLog:        _diagLog.slice()
                };
            });

        } catch(e) {
            _dlog('setPosition.CAUGHT_ERROR', {
                message:  e.message,
                toString: String(e)
            });
            throw new Error(
                'ANCHOR_DIAG setPosition: ' + e.message +
                ' | LAST_5=' + JSON.stringify(_diagLog.slice(-5))
            );
        }
    };

    $.DoMotions.modules.anchor.centerToContent = function (params) {
        _resetLog();
        _dlogSection('centerToContent CALLED');

        try {
            return $.DoMotions.utils.undoGroup('Center Anchor to Content [DIAG]', function () {
                var layers = $.DoMotions.utils.getSelectedLayers();
                _dlog('centerToContent.layerCount', { count: layers.length });

                // Pre-validation pass: reject entire operation if any layer is unsupported
                for (var v2 = 0; v2 < layers.length; v2++) {
                    var l2 = layers[v2];
                    if ((typeof CameraLayer !== 'undefined' && l2 instanceof CameraLayer) ||
                        (typeof LightLayer !== 'undefined' && l2 instanceof LightLayer) ||
                        (l2.matchName === 'ADBE Camera Layer' || l2.matchName === 'ADBE Light Layer')) {
                        _dlog('GUARD_REJECTED', { reason: 'UnsupportedLayer', layerName: l2.name });
                        throw new Error("Anchor Point tidak didukung untuk layer ini.");
                    }
                }

                for (var i = 0; i < layers.length; i++) {
                    var layer = layers[i];
                    _snapComp(layer.containingComp);
                    _snapLayer(layer);
                    _snapTransform(layer, layer.threeDLayer);

                    var newA = _getNewAnchorForPosition(layer, 'MC');
                    _moveAnchor(layer, newA);
                }

                return {
                    affectedLayers: layers.length,
                    message:        'Centered anchor to content',
                    diagLog:        _diagLog.slice()
                };
            });

        } catch(e) {
            _dlog('centerToContent.CAUGHT_ERROR', { message: e.message, toString: String(e) });
            throw new Error(
                'ANCHOR_DIAG centerToContent: ' + e.message +
                ' | LAST_5=' + JSON.stringify(_diagLog.slice(-5))
            );
        }
    };

    $.DoMotions.modules.anchor.getCurrentPosition = function (params) {
        _resetLog();
        _dlogSection('getCurrentPosition CALLED');

        try {
            var layers = $.DoMotions.utils.getSelectedLayers();
            if (layers.length === 0) throw new Error('No layers selected.');
            var a = layers[0].anchorPoint.value;
            _dlog('getCurrentPosition.result', { a: a, length: a.length });
            return {
                x: a[0],
                y: a[1],
                z: a.length > 2 ? a[2] : 0,
                message: 'Anchor position retrieved'
            };
        } catch(e) {
            _dlog('getCurrentPosition.ERR', { message: e.message });
            throw e;
        }
    };

})();
