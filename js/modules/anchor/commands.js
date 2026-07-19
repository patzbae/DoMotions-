(function () {
    'use strict';
    window.DoMotions = window.DoMotions || {};
    DoMotions.Commands = DoMotions.Commands || {};

    DoMotions.Commands.Anchor = {
        setPosition: function (params) {
            var validPositions = ['TL', 'TC', 'TR', 'ML', 'MC', 'MR', 'BL', 'BC', 'BR'];
            return {
                id: 'anchor.setPosition',
                module: 'anchor',
                label: 'Set Anchor to ' + (params.position || '?'),
                target: 'anchor.setPosition',
                payload: params,
                validate: function () {
                    return validPositions.indexOf(params.position) !== -1;
                }
            };
        },
        centerToContent: function () {
            return {
                id: 'anchor.centerToContent',
                module: 'anchor',
                label: 'Center Anchor to Content',
                target: 'anchor.centerToContent',
                payload: {}
            };
        },
        getCurrentPosition: function () {
            return {
                id: 'anchor.getCurrentPosition',
                module: 'anchor',
                label: 'Get Current Anchor Position',
                target: 'anchor.getCurrentPosition',
                payload: {}
            };
        }
    };
})();
