(function () {
    'use strict';
    window.DoMotions = window.DoMotions || {};
    DoMotions.Commands = DoMotions.Commands || {};

    DoMotions.Commands.Layer = {
        createNull: function (params) {
            return {
                id: 'layer.createNull',
                module: 'layer',
                label: 'Create Null Object',
                target: 'layer.createNull',
                payload: params || { atCenter: true },
                validate: function () { return true; }
            };
        },
        createShapeLayer: function (params) {
            return {
                id: 'layer.createShapeLayer',
                module: 'layer',
                label: 'Create Shape Layer',
                target: 'layer.createShapeLayer',
                payload: params || {},
                validate: function () { return true; }
            };
        },
        createSolid: function (params) {
            return {
                id: 'layer.createSolid',
                module: 'layer',
                label: 'Create Solid Layer',
                target: 'layer.createSolid',
                payload: params || {},
                validate: function () { return true; }
            };
        },
        createAdjustmentLayer: function (params) {
            return {
                id: 'layer.createAdjustmentLayer',
                module: 'layer',
                label: 'Create Adjustment Layer',
                target: 'layer.createAdjustmentLayer',
                payload: params || {},
                validate: function () { return true; }
            };
        },
        duplicateSelected: function () {
            return {
                id: 'layer.duplicateSelected',
                module: 'layer',
                label: 'Duplicate Selected Layer(s)',
                target: 'layer.duplicateSelected',
                payload: {}
            };
        },
        renameSelected: function (params) {
            return {
                id: 'layer.renameSelected',
                module: 'layer',
                label: 'Rename Selected Layer(s)',
                target: 'layer.renameSelected',
                payload: params || { name: 'Renamed Layer' },
                validate: function () { return !!params.name; }
            };
        },
        createNullAtSelected: function () {
            return {
                id: 'layer.createNullAtSelected',
                module: 'layer',
                label: 'Create Null at Selected Layer',
                target: 'layer.createNullAtSelected',
                payload: {}
            };
        },
        parentToNull: function () {
            return {
                id: 'layer.parentToNull',
                module: 'layer',
                label: 'Parent Selected to Null',
                target: 'layer.parentToNull',
                payload: {}
            };
        },
        selectSimilar: function () {
            return {
                id: 'layer.selectSimilar',
                module: 'layer',
                label: 'Select Similar Layers',
                target: 'layer.selectSimilar',
                payload: {}
            };
        },
        toggleProperty: function (params) {
            var validProps = ['shy', 'lock', 'guide'];
            return {
                id: 'layer.toggleProperty',
                module: 'layer',
                label: 'Toggle ' + (params.property || '?'),
                target: 'layer.toggleProperty',
                payload: params,
                validate: function () {
                    return validProps.indexOf(params.property) !== -1;
                }
            };
        }
    };
})();
