(function () {
    $.DoMotions = $.DoMotions || {};
    $.DoMotions.modules = $.DoMotions.modules || {};
    $.DoMotions.modules.easing = {};

    // ─── Private Helpers ────────────────────────────────────────────────

    /**
     * Return an array of 1-based keyframe indices that the user has selected
     * on the given property. If nothing is explicitly selected, returns ALL
     * key indices so the preset still does something useful.
     */
    function _getSelectedKeyIndices(prop) {
        var indices = [];
        for (var k = 1; k <= prop.numKeys; k++) {
            if (prop.keySelected(k)) {
                indices.push(k);
            }
        }
        // Fallback: treat all keys as selected when none are explicitly picked
        if (indices.length === 0) {
            for (var k = 1; k <= prop.numKeys; k++) {
                indices.push(k);
            }
        }
        return indices;
    }

    /**
     * Build an ease array of the correct dimension for `setTemporalEaseAtKey`.
     *   1D property  →  [KeyframeEase]
     *   2D property  →  [KeyframeEase, KeyframeEase]
     *   3D property  →  [KeyframeEase, KeyframeEase, KeyframeEase]
     *
     * @param {number} speed     - Speed value (default 0 = auto)
     * @param {number} influence - Influence percentage 0.1 – 100
     * @param {number} dims      - 1, 2, or 3
     * @returns {Array<KeyframeEase>}
     */
    function _buildEaseArray(speed, influence, dims) {
        var arr = [];
        for (var d = 0; d < dims; d++) {
            arr.push(new KeyframeEase(speed, influence));
        }
        return arr;
    }

    /**
     * Resolve preset name → { influenceIn, influenceOut, speedIn, speedOut, interpType }
     * Returns null when the type is 'custom' (caller supplies values directly).
     */
    function _resolvePreset(type) {
        switch (type) {
            case 'easeIn':
                // Weight the incoming handle; leave the outgoing near-linear.
                return { influenceIn: 75,  influenceOut: 0.1, speedIn: 0, speedOut: 0, interp: 'bezier' };
            case 'easeOut':
                // Weight the outgoing handle; leave the incoming near-linear.
                return { influenceIn: 0.1, influenceOut: 75,  speedIn: 0, speedOut: 0, interp: 'bezier' };
            case 'easeInOut':
                return { influenceIn: 33,  influenceOut: 33,  speedIn: 0, speedOut: 0, interp: 'bezier' };
            case 'linear':
                return { influenceIn: 0.1, influenceOut: 0.1, speedIn: 0, speedOut: 0, interp: 'linear' };
            case 'hold':
                return { interp: 'hold' };
            default:
                return null; // custom – caller supplies values
        }
    }

    // ─── Public API ─────────────────────────────────────────────────────

    /**
     * Apply easing to selected keyframes.
     *
     * @param {Object}  params
     * @param {string}  params.type         - 'easeIn'|'easeOut'|'easeInOut'|'linear'|'hold'|'custom'
     * @param {number}  [params.influenceIn]  - Incoming influence 0.1–100
     * @param {number}  [params.influenceOut] - Outgoing influence 0.1–100
     * @param {number}  [params.speedIn]      - Incoming speed (default 0 = auto)
     * @param {number}  [params.speedOut]     - Outgoing speed (default 0 = auto)
     * @returns {Object} { keysModified, message }
     */
    $.DoMotions.modules.easing.applyEase = function (params) {
        return $.DoMotions.utils.undoGroup('Apply Easing', function () {
            var props = $.DoMotions.utils.getSelectedProperties();

            var preset = _resolvePreset(params.type);
            var isHold    = preset && preset.interp === 'hold';
            var isLinear  = preset && preset.interp === 'linear';

            // Determine final influence / speed values
            var infIn, infOut, spdIn, spdOut;
            if (preset && !isHold) {
                infIn  = (params.influenceIn  !== undefined) ? params.influenceIn  : preset.influenceIn;
                infOut = (params.influenceOut !== undefined) ? params.influenceOut : preset.influenceOut;
                spdIn  = (params.speedIn  !== undefined) ? params.speedIn  : preset.speedIn;
                spdOut = (params.speedOut !== undefined) ? params.speedOut : preset.speedOut;
            } else if (!isHold) {
                // custom
                infIn  = params.influenceIn  || 33;
                infOut = params.influenceOut || 33;
                spdIn  = params.speedIn  || 0;
                spdOut = params.speedOut || 0;
            }

            var totalKeys = 0;

            for (var p = 0; p < props.length; p++) {
                var prop = props[p];
                // Temporal-ease array size is driven by propertyValueType, not
                // by the number of value components (Position is spatial → 1).
                var dims = $.DoMotions.utils.getEaseDimensions(prop);
                var keys = _getSelectedKeyIndices(prop);

                for (var ki = 0; ki < keys.length; ki++) {
                    var idx = keys[ki];

                    if (isHold) {
                        // Hold: set interpolation to HOLD on the outgoing side
                        prop.setInterpolationTypeAtKey(
                            idx,
                            KeyframeInterpolationType.LINEAR,
                            KeyframeInterpolationType.HOLD
                        );
                    } else if (isLinear) {
                        // Linear: set interpolation to LINEAR on both sides
                        prop.setInterpolationTypeAtKey(
                            idx,
                            KeyframeInterpolationType.LINEAR,
                            KeyframeInterpolationType.LINEAR
                        );
                    } else {
                        // Bezier: set interpolation then apply temporal ease
                        prop.setInterpolationTypeAtKey(
                            idx,
                            KeyframeInterpolationType.BEZIER,
                            KeyframeInterpolationType.BEZIER
                        );

                        var easeInArr  = _buildEaseArray(spdIn,  infIn,  dims);
                        var easeOutArr = _buildEaseArray(spdOut, infOut, dims);

                        prop.setTemporalEaseAtKey(idx, easeInArr, easeOutArr);
                    }

                    totalKeys++;
                }
            }

            var label = params.type || 'custom';
            return {
                keysModified: totalKeys,
                message: 'Applied ' + label + ' to ' + totalKeys + ' keyframe' + (totalKeys !== 1 ? 's' : '')
            };
        });
    };

    /**
     * Read easing info from the first selected keyframe of the first
     * selected property. Useful for populating UI sliders.
     *
     * @returns {Object} { influenceIn, influenceOut, speedIn, speedOut, interpIn, interpOut }
     */
    $.DoMotions.modules.easing.getEaseInfo = function (params) {
        var props = $.DoMotions.utils.getSelectedProperties();
        var prop  = props[0];
        var keys  = _getSelectedKeyIndices(prop);
        var idx   = keys[0];

        var easeInArr  = prop.keyInTemporalEase(idx);
        var easeOutArr = prop.keyOutTemporalEase(idx);

        var interpIn  = prop.keyInInterpolationType(idx);
        var interpOut = prop.keyOutInterpolationType(idx);

        // Read from the first dimension (representative)
        var eiFirst = easeInArr[0];
        var eoFirst = easeOutArr[0];

        // Determine human-readable type
        var typeName = 'custom';
        if (interpOut === KeyframeInterpolationType.HOLD) {
            typeName = 'hold';
        } else if (interpIn === KeyframeInterpolationType.LINEAR && interpOut === KeyframeInterpolationType.LINEAR) {
            typeName = 'linear';
        } else if (interpIn === KeyframeInterpolationType.BEZIER && interpOut === KeyframeInterpolationType.BEZIER) {
            typeName = 'easeInOut';
        }

        return {
            influenceIn:  eiFirst.influence,
            influenceOut: eoFirst.influence,
            speedIn:      eiFirst.speed,
            speedOut:     eoFirst.speed,
            interpIn:     interpIn,
            interpOut:    interpOut,
            type:         typeName,
            message:      'Ease info retrieved'
        };
    };
})();
