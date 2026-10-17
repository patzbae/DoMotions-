(function () {
    $.DoMotions = $.DoMotions || {};
    $.DoMotions.modules = $.DoMotions.modules || {};
    $.DoMotions.modules.layer = {};

    // After Effects Timeline Layer Label Color Indices (Preferences > Labels)
    var LABEL_COLORS = {
        NONE: 0,
        SOLID: 1,        // Red (Merah)
        ADJUSTMENT: 8,   // Blue (Biru Clay / Slate Blue)
        NULL: 9          // Green (Hijau)
    };

    function _createNull(comp, name) {
        var nullLayer = comp.layers.addNull();
        if (name) nullLayer.name = name;
        nullLayer.label = LABEL_COLORS.NULL;
        return nullLayer;
    }

    function _readLayerPosition(layer, is3D) {
        if (layer.position && layer.position.dimensionsSeparated) {
            var tg = layer.property("ADBE Transform Group");
            var x = tg.property("ADBE Position_0").value;
            var y = tg.property("ADBE Position_1").value;
            return is3D ? [x, y, tg.property("ADBE Position_2").value] : [x, y];
        }
        if (layer.position) {
            return layer.position.value;
        }
        return [0, 0];
    }

    function _getLayerCompPosition(layer) {
        var is3D = layer.threeDLayer;
        if (!layer.parent) {
            var p = _readLayerPosition(layer, is3D);
            if (is3D && p.length < 3) return [p[0], p[1], 0];
            return p;
        }

        if (typeof layer.sourcePointToComp === 'function' && layer.anchorPoint) {
            try {
                var anchor = layer.anchorPoint.value;
                var pt = layer.sourcePointToComp([anchor[0], anchor[1]]);
                if (is3D) {
                    var posVal = _readLayerPosition(layer, is3D);
                    var z = (posVal.length > 2) ? posVal[2] : 0;
                    return [pt[0], pt[1], z];
                }
                return [pt[0], pt[1]];
            } catch (e) {
                // fallback
            }
        }

        return _readLayerPosition(layer, is3D);
    }

    // 1. Create Null Object (Smart behavior: normal null if no selection, or parent controller null for each selected layer)
    $.DoMotions.modules.layer.createNull = function (params) {
        return $.DoMotions.utils.undoGroup('Create Null', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var selected = comp.selectedLayers;

            // Scenario A: No layers selected -> create single default null at comp center
            if (!selected || selected.length === 0) {
                var singleNull = _createNull(comp, (params && params.name) ? params.name : 'Null');
                singleNull.position.setValue([comp.width / 2, comp.height / 2]);
                singleNull.label = LABEL_COLORS.NULL;
                return {
                    affectedLayers: 1,
                    message: 'Created Null Object'
                };
            }

            // Scenario B: One or more layers selected -> create parent null for each selected layer
            // Snapshot selected layers into an array because adding layers alters comp.selectedLayers
            var targets = [];
            for (var i = 0; i < selected.length; i++) {
                targets.push(selected[i]);
            }

            var createdNulls = [];
            for (var j = 0; j < targets.length; j++) {
                var targetLayer = targets[j];
                var nullName = (params && params.name) ? (params.name + ' for ' + targetLayer.name) : ('Null for ' + targetLayer.name);
                var nullLayer = _createNull(comp, nullName);
                nullLayer.label = LABEL_COLORS.NULL;

                // Match 3D status of target layer
                if (targetLayer.threeDLayer) {
                    nullLayer.threeDLayer = true;
                }

                // Place Null directly above target layer on timeline
                nullLayer.moveBefore(targetLayer);

                // Synchronize duration: match inPoint and outPoint with target layer
                var inP = targetLayer.inPoint;
                var outP = targetLayer.outPoint;
                if (inP > nullLayer.outPoint) {
                    nullLayer.outPoint = outP;
                    nullLayer.inPoint = inP;
                } else {
                    nullLayer.inPoint = inP;
                    nullLayer.outPoint = outP;
                }

                // Match position to target layer's comp position before parenting
                var compPos = _getLayerCompPosition(targetLayer);
                if (nullLayer.threeDLayer) {
                    nullLayer.position.setValue(compPos.length > 2 ? compPos : [compPos[0], compPos[1], 0]);
                } else {
                    nullLayer.position.setValue([compPos[0], compPos[1]]);
                }

                // Parent target layer to Null (Null becomes PARENT, targetLayer becomes CHILD)
                targetLayer.parent = nullLayer;

                createdNulls.push(nullLayer);
            }

            // Deselect original layers and select newly created nulls
            for (var d = 0; d < targets.length; d++) {
                targets[d].selected = false;
            }
            for (var s = 0; s < createdNulls.length; s++) {
                createdNulls[s].selected = true;
            }

            return {
                affectedLayers: createdNulls.length,
                message: 'Created ' + createdNulls.length + ' Null(s) for selected layer(s)'
            };
        });
    };

    // 3. Create Solid Layer
    $.DoMotions.modules.layer.createSolid = function (params) {
        return $.DoMotions.utils.undoGroup('Create Solid Layer', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var color = params.color || [1, 1, 1];
            var w = params.width || comp.width;
            var h = params.height || comp.height;
            var name = params.name || 'Solid';

            // Snapshot selected layers before addSolid changes selection
            var selected = comp.selectedLayers;
            var refLayer = (selected && selected.length > 0) ? selected[0] : null;

            var solid = comp.layers.addSolid(color, name, w, h, comp.pixelAspect, comp.duration);
            solid.label = LABEL_COLORS.SOLID;

            // If a layer was selected, match its frame range (without parenting)
            if (refLayer) {
                var inP = refLayer.inPoint;
                var outP = refLayer.outPoint;
                if (inP > solid.outPoint) {
                    solid.outPoint = outP;
                    solid.inPoint = inP;
                } else {
                    solid.inPoint = inP;
                    solid.outPoint = outP;
                }
            }

            return { affectedLayers: 1, message: 'Created Solid Layer' };
        });
    };

    // 4. Create Adjustment Layer
    $.DoMotions.modules.layer.createAdjustmentLayer = function (params) {
        return $.DoMotions.utils.undoGroup('Create Adjustment Layer', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var name = params.name || 'Adjustment Layer';

            // Snapshot selected layers before addSolid changes selection
            var selected = comp.selectedLayers;
            var refLayer = (selected && selected.length > 0) ? selected[0] : null;

            var adj = comp.layers.addSolid([1, 1, 1], name, comp.width, comp.height, comp.pixelAspect, comp.duration);
            adj.adjustmentLayer = true;
            adj.label = LABEL_COLORS.ADJUSTMENT;

            // If a layer was selected, match its frame range (without parenting)
            if (refLayer) {
                var inP = refLayer.inPoint;
                var outP = refLayer.outPoint;
                if (inP > adj.outPoint) {
                    adj.outPoint = outP;
                    adj.inPoint = inP;
                } else {
                    adj.inPoint = inP;
                    adj.outPoint = outP;
                }
            }

            return { affectedLayers: 1, message: 'Created Adjustment Layer' };
        });
    };

    // 5. Duplicate Selected
    $.DoMotions.modules.layer.duplicateSelected = function (params) {
        return $.DoMotions.utils.undoGroup('Duplicate Selected Layers', function () {
            var layers = $.DoMotions.utils.getSelectedLayers();
            for (var i = 0; i < layers.length; i++) {
                layers[i].duplicate();
            }
            return { affectedLayers: layers.length, message: 'Duplicated ' + layers.length + ' layer(s)' };
        });
    };

    // 6. Rename Selected
    $.DoMotions.modules.layer.renameSelected = function (params) {
        return $.DoMotions.utils.undoGroup('Rename Selected Layers', function () {
            var layers = $.DoMotions.utils.getSelectedLayers();
            var newName = params.name;
            if (!newName) throw new Error("No name provided for renaming.");
            // When multiple layers are selected, suffix with an index so names
            // stay unique (e.g. "Icon 1", "Icon 2") instead of all identical.
            var multiple = layers.length > 1;
            for (var i = 0; i < layers.length; i++) {
                layers[i].name = multiple ? (newName + ' ' + (i + 1)) : newName;
            }
            return { affectedLayers: layers.length, message: 'Renamed ' + layers.length + ' layer(s)' };
        });
    };

    // 7. Parent Selected to a New Null
    $.DoMotions.modules.layer.parentToNull = function (params) {
        return $.DoMotions.utils.undoGroup('Parent to Null', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var layers = $.DoMotions.utils.getSelectedLayers();
            var avgX = 0, avgY = 0;
            for (var i = 0; i < layers.length; i++) {
                var pos = layers[i].position.value;
                avgX += pos[0];
                avgY += pos[1];
            }
            avgX /= layers.length;
            avgY /= layers.length;
            var nullLayer = _createNull(comp, 'Parent Null');
            nullLayer.position.setValue([avgX, avgY]);
            
            // Move null just above the top selected layer
            nullLayer.moveBefore(layers[0]);

            for (var i = 0; i < layers.length; i++) {
                layers[i].parent = nullLayer;
            }
            return { affectedLayers: layers.length, message: 'Parented ' + layers.length + ' layer(s) to Null' };
        });
    };

    // 8. Select Similar Layers
    $.DoMotions.modules.layer.selectSimilar = function (params) {
        return $.DoMotions.utils.undoGroup('Select Similar Layers', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var layers = $.DoMotions.utils.getSelectedLayers();
            var refType = null;
            if (layers[0] instanceof TextLayer) refType = 'TextLayer';
            else if (layers[0] instanceof ShapeLayer) refType = 'ShapeLayer';
            else if (layers[0] instanceof CameraLayer) refType = 'CameraLayer';
            else if (layers[0] instanceof LightLayer) refType = 'LightLayer';
            else if (layers[0].nullLayer) refType = 'NullLayer';
            else refType = 'AVLayer';

            var count = 0;
            for (var i = 1; i <= comp.numLayers; i++) {
                var l = comp.layer(i);
                var isMatch = false;
                if (refType === 'TextLayer' && l instanceof TextLayer) isMatch = true;
                else if (refType === 'ShapeLayer' && l instanceof ShapeLayer) isMatch = true;
                else if (refType === 'CameraLayer' && l instanceof CameraLayer) isMatch = true;
                else if (refType === 'LightLayer' && l instanceof LightLayer) isMatch = true;
                else if (refType === 'NullLayer' && l.nullLayer) isMatch = true;
                else if (refType === 'AVLayer' && l instanceof AVLayer && !l.nullLayer) isMatch = true;
                
                if (isMatch) {
                    l.selected = true;
                    count++;
                }
            }
            return { affectedLayers: count, message: 'Selected ' + count + ' similar layers' };
        });
    };

    // 10, 11, 12: Toggles
    $.DoMotions.modules.layer.toggleProperty = function (params) {
        return $.DoMotions.utils.undoGroup('Toggle ' + params.property, function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var layers = $.DoMotions.utils.getSelectedLayers();
            var prop = params.property; // 'shy', 'lock', 'guide'
            if (prop !== 'shy' && prop !== 'lock' && prop !== 'guide') {
                throw new Error('Unsupported property: ' + prop);
            }
            
            // If all selected are true, we set to false. Otherwise true.
            var allTrue = true;
            for (var i = 0; i < layers.length; i++) {
                if (prop === 'shy' && !layers[i].shy) allTrue = false;
                if (prop === 'lock' && !layers[i].locked) allTrue = false;
                if (prop === 'guide' && !layers[i].guideLayer) allTrue = false;
            }
            var targetValue = !allTrue;
            for (var i = 0; i < layers.length; i++) {
                if (prop === 'shy') layers[i].shy = targetValue;
                if (prop === 'lock') layers[i].locked = targetValue;
                if (prop === 'guide') layers[i].guideLayer = targetValue;
            }
            return { affectedLayers: layers.length, message: 'Toggled ' + prop + ' for ' + layers.length + ' layer(s)' };
        });
    };
})();
