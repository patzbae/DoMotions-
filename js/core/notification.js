/**
 * DoMotions — Global Toast Notification System
 * File: js/core/notification.js
 * 
 * Provides animated, non-blocking, accessible toast notifications
 * for all DoMotions frontend modules.
 */
(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    if (DoMotions.Notification) { return; }

    var DEFAULT_DURATION = 3000;
    var ANIMATION_DURATION = 220; // ms for exit animation

    var _container = null;
    var _toasts = []; // list of active toast objects: { id, element, timer }
    var _counter = 0;

    // SVG icon definitions for toast types (theme-matching, crisp inline vectors)
    var _icons = {
        success: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.5l4 4 7-8"/></svg>',
        error:   '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5"/></svg>',
        warning: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.2L1.5 13.8h13L8 2.2z"/><path d="M8 6.5v3.2M8 11.5v.5"/></svg>',
        info:    '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 4.8v.4"/></svg>',
        close:   '<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>'
    };

    /**
     * Get or create the persistent container element.
     */
    function _getContainer() {
        if (!_container || !document.body.contains(_container)) {
            _container = document.getElementById('dm-toast-container');
            if (!_container) {
                _container = document.createElement('div');
                _container.id = 'dm-toast-container';
                _container.className = 'dm-toast-container';
                _container.setAttribute('aria-live', 'polite');
                _container.setAttribute('aria-atomic', 'false');
                document.body.appendChild(_container);
            }
        }
        return _container;
    }

    /**
     * Dismiss a specific toast by its record or element.
     */
    function _dismissToast(toastObj) {
        if (!toastObj || toastObj.isDismissing) return;
        toastObj.isDismissing = true;

        if (toastObj.timer) {
            clearTimeout(toastObj.timer);
            toastObj.timer = null;
        }

        var el = toastObj.element;
        if (!el) return;

        // Start exit animation
        el.classList.remove('dm-toast-visible');
        el.classList.add('dm-toast-exit');

        setTimeout(function () {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
            // Remove from active list
            var idx = _toasts.indexOf(toastObj);
            if (idx !== -1) {
                _toasts.splice(idx, 1);
            }
        }, ANIMATION_DURATION);
    }

    DoMotions.Notification = {
        /**
         * Core show method.
         *
         * @param {string} message - Notification text
         * @param {string} [type='info'] - 'success' | 'error' | 'warning' | 'info'
         * @param {object} [options]
         * @param {number} [options.duration=3000] - Duration in ms before auto-dismiss
         * @param {string} [options.title] - Optional title above message
         * @returns {{ id: string, dismiss: function }}
         */
        show: function (message, type, options) {
            type = (type || 'info').toLowerCase();
            if (!_icons[type]) {
                type = 'info';
            }
            options = options || {};

            var duration = (typeof options.duration === 'number') ? options.duration : DEFAULT_DURATION;
            var container = _getContainer();

            var id = 'dm-toast-' + (++_counter);

            // Create toast element
            var toastEl = document.createElement('div');
            toastEl.id = id;
            toastEl.className = 'dm-toast dm-toast-' + type;

            // Accessibility attributes
            if (type === 'error' || type === 'warning') {
                toastEl.setAttribute('role', 'alert');
                toastEl.setAttribute('aria-live', 'assertive');
            } else {
                toastEl.setAttribute('role', 'status');
                toastEl.setAttribute('aria-live', 'polite');
            }

            // 1. Icon container
            var iconEl = document.createElement('div');
            iconEl.className = 'dm-toast-icon';
            iconEl.setAttribute('aria-hidden', 'true');
            iconEl.innerHTML = _icons[type];
            toastEl.appendChild(iconEl);

            // 2. Content container (Title + Message)
            var contentEl = document.createElement('div');
            contentEl.className = 'dm-toast-content';

            if (options.title) {
                var titleEl = document.createElement('div');
                titleEl.className = 'dm-toast-title';
                titleEl.textContent = String(options.title);
                contentEl.appendChild(titleEl);
            }

            var msgEl = document.createElement('div');
            msgEl.className = 'dm-toast-message';
            msgEl.textContent = String(message || '');
            contentEl.appendChild(msgEl);

            toastEl.appendChild(contentEl);

            // 3. Manual Close Button
            var closeBtn = document.createElement('button');
            closeBtn.className = 'dm-toast-close';
            closeBtn.type = 'button';
            closeBtn.setAttribute('aria-label', 'Close notification');
            closeBtn.innerHTML = _icons.close;
            toastEl.appendChild(closeBtn);

            var toastObj = {
                id: id,
                element: toastEl,
                timer: null,
                isDismissing: false,
                dismiss: function () {
                    _dismissToast(toastObj);
                }
            };

            closeBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                _dismissToast(toastObj);
            });

            // Auto-dismiss timer
            if (duration > 0) {
                toastObj.timer = setTimeout(function () {
                    _dismissToast(toastObj);
                }, duration);
            }

            // Append to container
            container.appendChild(toastEl);
            _toasts.push(toastObj);

            // Trigger enter animation on next frame
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    toastEl.classList.add('dm-toast-visible');
                });
            });

            return {
                id: id,
                dismiss: toastObj.dismiss
            };
        },

        success: function (message, options) {
            return this.show(message, 'success', options);
        },

        error: function (message, options) {
            return this.show(message, 'error', options);
        },

        warning: function (message, options) {
            return this.show(message, 'warning', options);
        },

        info: function (message, options) {
            return this.show(message, 'info', options);
        },

        /**
         * Dismiss all currently visible toasts immediately.
         */
        clearAll: function () {
            var copy = _toasts.slice();
            for (var i = 0; i < copy.length; i++) {
                _dismissToast(copy[i]);
            }
        }
    };
})();
