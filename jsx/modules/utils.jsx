(function () {
    $.DoMotions = $.DoMotions || {};
    $.DoMotions.utils = {};

    /**
     * Wraps a function in an undo group.
     * @param {string} name - Undo group name
     * @param {Function} fn - Function to execute
     * @returns {*} Return value of fn
     */
    $.DoMotions.utils.undoGroup = function (name, fn) {
        app.beginUndoGroup(name);
        try {
            var result = fn();
            app.endUndoGroup();
            return result;
        } catch (e) {
            app.endUndoGroup();
            throw e;
        }
    };

    /**
     * Gets the active composition or throws.
     * @returns {CompItem}
     */
    $.DoMotions.utils.getActiveComp = function () {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            throw new Error('No active composition. Please open a composition first.');
        }
        return comp;
    };

    /**
     * Gets selected layers or throws.
     * @returns {Array<Layer>}
     */
    $.DoMotions.utils.getSelectedLayers = function () {
        var comp = $.DoMotions.utils.getActiveComp();
        if (comp.selectedLayers.length === 0) {
            throw new Error('No layers selected. Please select at least one layer.');
        }
        var layers = [];
        for (var i = 0; i < comp.selectedLayers.length; i++) {
            layers.push(comp.selectedLayers[i]);
        }
        return layers;
    };

    /**
     * Gets all selected properties that have keyframes.
     * @returns {Array<Property>}
     */
    $.DoMotions.utils.getSelectedProperties = function () {
        var comp = $.DoMotions.utils.getActiveComp();
        var props = comp.selectedProperties;
        var result = [];
        for (var i = 0; i < props.length; i++) {
            if (props[i].numKeys && props[i].numKeys > 0) {
                result.push(props[i]);
            }
        }
        if (result.length === 0) {
            throw new Error('No keyframed properties selected. Please select properties with keyframes.');
        }
        return result;
    };

    /**
     * Returns the number of value dimensions for a property.
     * @param {Property} prop
     * @returns {number} 1, 2, or 3
     */
    $.DoMotions.utils.getPropertyDimensions = function (prop) {
        var val = prop.value;
        if (val instanceof Array) {
            return val.length;
        }
        return 1;
    };

    /**
     * Returns how many KeyframeEase objects setTemporalEaseAtKey() expects for
     * a property. This is NOT the same as the number of value components:
     * After Effects sizes the temporal-ease array by propertyValueType.
     *
     *   TwoD          → 2   (e.g. Scale 2D)
     *   ThreeD        → 3   (e.g. Scale 3D)
     *   TwoD_SPATIAL  → 1   (e.g. Position 2D — velocity along the path is scalar)
     *   ThreeD_SPATIAL→ 1   (e.g. Position 3D)
     *   OneD / COLOR / everything else → 1
     *
     * @param {Property} prop
     * @returns {number} 1, 2, or 3
     */
    $.DoMotions.utils.getEaseDimensions = function (prop) {
        switch (prop.propertyValueType) {
            case PropertyValueType.TwoD:
                return 2;
            case PropertyValueType.ThreeD:
                return 3;
            default:
                // Spatial (Position/Anchor path), OneD, Color, Marker, etc.
                return 1;
        }
    };
})();
