(function () {
    $.DoMotions = $.DoMotions || {};
    $.DoMotions.modules = $.DoMotions.modules || {};
    $.DoMotions.modules.layer = {};

    function _createNull(comp, name) {
        var nullLayer = comp.layers.addNull();
        if (name) nullLayer.name = name;
        return nullLayer;
    }

    // 1. Create Null Object
    $.DoMotions.modules.layer.createNull = function (params) {
        return $.DoMotions.utils.undoGroup('Create Null Object', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var nullLayer = _createNull(comp, params.name || 'Null');
            if (params.atCenter) {
                nullLayer.position.setValue([comp.width / 2, comp.height / 2]);
            }
            return { affectedLayers: 1, message: 'Created Null Object' };
        });
    };

    // 2. Create Shape Layer
    $.DoMotions.modules.layer.createShapeLayer = function (params) {
        return $.DoMotions.utils.undoGroup('Create Shape Layer', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var shapeLayer = comp.layers.addShape();
            if (params.name) shapeLayer.name = params.name;
            return { affectedLayers: 1, message: 'Created Shape Layer' };
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
            var solid = comp.layers.addSolid(color, name, w, h, comp.pixelAspect, comp.duration);
            return { affectedLayers: 1, message: 'Created Solid Layer' };
        });
    };

    // 4. Create Adjustment Layer
    $.DoMotions.modules.layer.createAdjustmentLayer = function (params) {
        return $.DoMotions.utils.undoGroup('Create Adjustment Layer', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var name = params.name || 'Adjustment Layer';
            var adj = comp.layers.addSolid([1,1,1], name, comp.width, comp.height, comp.pixelAspect, comp.duration);
            adj.adjustmentLayer = true;
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

    // 8. Create Null at Selected Layers
    $.DoMotions.modules.layer.createNullAtSelected = function (params) {
        return $.DoMotions.utils.undoGroup('Create Null at Selected', function () {
            var comp = $.DoMotions.utils.getActiveComp();
            var layers = $.DoMotions.utils.getSelectedLayers();
            for (var i = 0; i < layers.length; i++) {
                var layer = layers[i];
                var pos = layer.position.value;               // 2 elems (2D) or 3 elems (3D)
                var nullLayer = _createNull(comp, 'Null for ' + layer.name);
                // addNull() always creates a 2D null. Match its dimensionality to
                // the source layer so setValue() gets a correctly-sized array.
                if (layer.threeDLayer) {
                    nullLayer.threeDLayer = true;
                    nullLayer.position.setValue([pos[0], pos[1], (pos[2] || 0)]);
                } else {
                    nullLayer.position.setValue([pos[0], pos[1]]);
                }
                nullLayer.moveBefore(layer);
            }
            return { affectedLayers: layers.length, message: 'Created ' + layers.length + ' Null(s)' };
        });
    };

    // 9. Select Similar Layers
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
