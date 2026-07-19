(function () {
    'use strict';
    window.DoMotions = window.DoMotions || {};
    DoMotions.Commands = DoMotions.Commands || {};

    DoMotions.Commands.Easing = {
        /**
         * Apply easing preset or custom values to selected keyframes.
         *
         * @param {Object}  params
         * @param {string}  params.type         - 'easeIn'|'easeOut'|'easeInOut'|'linear'|'hold'|'custom'
         * @param {number}  [params.influenceIn]  - 0.1–100
         * @param {number}  [params.influenceOut] - 0.1–100
         * @param {number}  [params.speedIn]      - speed value (optional)
         * @param {number}  [params.speedOut]     - speed value (optional)
         */
        applyEase: function (params) {
            var validTypes = ['easeIn', 'easeOut', 'easeInOut', 'linear', 'hold', 'custom'];
            return {
                id: 'easing.applyEase',
                module: 'easing',
                label: 'Apply ' + (params.type || 'Ease'),
                target: 'easing.applyEase',
                payload: params,
                validate: function () {
                    if (validTypes.indexOf(params.type) === -1) return false;
                    // Hold and Linear don't require influence values
                    if (params.type === 'hold' || params.type === 'linear') return true;
                    // For bezier types, influence must be in valid range
                    var infIn  = (params.influenceIn  !== undefined) ? params.influenceIn  : 33;
                    var infOut = (params.influenceOut !== undefined) ? params.influenceOut : 33;
                    return infIn >= 0.1 && infIn <= 100 && infOut >= 0.1 && infOut <= 100;
                }
            };
        },
        /**
         * Read easing data from the first selected keyframe.
         */
        getEaseInfo: function () {
            return {
                id: 'easing.getEaseInfo',
                module: 'easing',
                label: 'Read Keyframe Ease',
                target: 'easing.getEaseInfo',
                payload: {}
            };
        }
    };
})();
