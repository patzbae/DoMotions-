(function () {
    'use strict';
    window.DoMotions = window.DoMotions || {};
    DoMotions.Commands = DoMotions.Commands || {};

    DoMotions.Commands.Graph = {
        /**
         * Apply a cubic-bezier easing curve to selected keyframe segments.
         * @param {Object} params { x1, y1, x2, y2 }  control points in [0,1]
         */
        applyEase: function (params) {
            return {
                id: 'graph.applyGraphEase',
                module: 'graph',
                label: 'Apply Graph Ease',
                target: 'graph.applyGraphEase',
                payload: params,
                validate: function () {
                    return !!params &&
                        typeof params.x1 === 'number' && typeof params.y1 === 'number' &&
                        typeof params.x2 === 'number' && typeof params.y2 === 'number';
                }
            };
        }
    };
})();
