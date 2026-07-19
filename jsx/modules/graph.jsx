(function () {
    $.DoMotions = $.DoMotions || {};
    $.DoMotions.modules = $.DoMotions.modules || {};
    $.DoMotions.modules.graph = {};

    function _clamp(v, lo, hi) {
        if (v < lo) return lo;
        if (v > hi) return hi;
        return v;
    }

    /**
     * Magnitude of the change between two keyframe values.
     * Works for scalars (1D) and arrays (2D/3D/color).
     */
    function _valueDelta(v1, v2) {
        if (v1 instanceof Array) {
            var sum = 0;
            for (var i = 0; i < v1.length; i++) {
                var d = (v2[i] || 0) - (v1[i] || 0);
                sum += d * d;
            }
            return Math.sqrt(sum);
        }
        return Math.abs(v2 - v1);
    }

    /** Selected key indices on a property; falls back to ALL keys. */
    function _selectedKeys(prop) {
        var idx = [];
        for (var k = 1; k <= prop.numKeys; k++) {
            if (prop.keySelected(k)) idx.push(k);
        }
        if (idx.length === 0) {
            for (var k2 = 1; k2 <= prop.numKeys; k2++) idx.push(k2);
        }
        return idx;
    }

    /**
     * Apply a cubic-bezier easing curve to selected keyframe segments.
     *
     * The curve is defined by control points P0(0,0) P1(x1,y1) P2(x2,y2) P3(1,1)
     * — the same model as CSS cubic-bezier(). For each consecutive pair of
     * selected keyframes it sets:
     *   - the OUTGOING ease of the first key  → influence x1, slope y1/x1
     *   - the INCOMING ease of the second key → influence (1-x2), slope (1-y2)/(1-x2)
     * scaled into value/second by the segment's own value & time change.
     *
     * @param {Object} params { x1, y1, x2, y2 }
     * @returns {Object} { pairsModified, message }
     */
    $.DoMotions.modules.graph.applyGraphEase = function (params) {
        return $.DoMotions.utils.undoGroup('Apply Graph Ease', function () {
            // Keep x strictly inside (0,1): influence must stay > 0 and the
            // slope denominators must stay finite. Crucially, the SAME clamped
            // x is used for BOTH the influence and the tangent slope, so the
            // resulting AE control point lands exactly on the bezier handle.
            // (Clamping them inconsistently — e.g. forcing slope to 0 when
            // influence hits its minimum — throws the handle's Y away, which is
            // what made the top of steep curves flatten instead of staying
            // vertical.)
            var EPS = 0.001;
            var x1 = _clamp(params.x1, EPS, 1 - EPS);
            var y1 = _clamp(params.y1, 0, 1);
            var x2 = _clamp(params.x2, EPS, 1 - EPS);
            var y2 = _clamp(params.y2, 0, 1);

            // Normalized tangent slopes at the start and end of the curve.
            var slopeOut = y1 / x1;
            var slopeIn  = (1 - y2) / (1 - x2);

            // Influence percentages (clamped to AE's valid 0.1–100 range).
            var infOut = _clamp(x1 * 100, 0.1, 100);
            var infIn  = _clamp((1 - x2) * 100, 0.1, 100);

            var props = $.DoMotions.utils.getSelectedProperties();
            var totalPairs = 0;

            for (var p = 0; p < props.length; p++) {
                var prop = props[p];
                var dims = $.DoMotions.utils.getEaseDimensions(prop);
                var pvt  = prop.propertyValueType;
                var isSpatial = (pvt === PropertyValueType.TwoD_SPATIAL ||
                                 pvt === PropertyValueType.ThreeD_SPATIAL);
                var keys = _selectedKeys(prop);
                if (keys.length < 2) continue;

                for (var i = 0; i < keys.length - 1; i++) {
                    var k1 = keys[i];
                    var k2 = keys[i + 1];

                    var t1 = prop.keyTime(k1);
                    var t2 = prop.keyTime(k2);
                    var dt = t2 - t1;
                    if (dt <= 0) continue;

                    var v1 = prop.keyValue(k1);
                    var v2 = prop.keyValue(k2);

                    // Build per-dimension ease. The speed MUST carry the sign of
                    // the value change; using a bare magnitude makes a decreasing
                    // value overshoot past the keyframe. Spatial properties
                    // (Position/Anchor) use one positive magnitude — AE derives
                    // the direction from the motion path.
                    var outEase = [];
                    var inEase  = [];
                    if (isSpatial) {
                        var mag = _valueDelta(v1, v2) / dt;
                        outEase.push(new KeyframeEase(mag * slopeOut, infOut));
                        inEase.push(new KeyframeEase(mag * slopeIn, infIn));
                    } else {
                        for (var d = 0; d < dims; d++) {
                            var a = (v1 instanceof Array) ? v1[d] : v1;
                            var b = (v2 instanceof Array) ? v2[d] : v2;
                            var bs = (b - a) / dt; // signed speed for this dimension
                            outEase.push(new KeyframeEase(bs * slopeOut, infOut));
                            inEase.push(new KeyframeEase(bs * slopeIn, infIn));
                        }
                    }

                    // Both keys must be bezier for temporal ease to take effect.
                    prop.setInterpolationTypeAtKey(k1, prop.keyInInterpolationType(k1), KeyframeInterpolationType.BEZIER);
                    prop.setInterpolationTypeAtKey(k2, KeyframeInterpolationType.BEZIER, prop.keyOutInterpolationType(k2));

                    // Preserve the untouched side of each key.
                    prop.setTemporalEaseAtKey(k1, prop.keyInTemporalEase(k1), outEase);
                    prop.setTemporalEaseAtKey(k2, inEase, prop.keyOutTemporalEase(k2));

                    totalPairs++;
                }
            }

            return {
                pairsModified: totalPairs,
                message: (totalPairs > 0)
                    ? 'Applied curve to ' + totalPairs + ' segment' + (totalPairs !== 1 ? 's' : '')
                    : 'Select at least 2 keyframes on a property'
            };
        });
    };
})();
