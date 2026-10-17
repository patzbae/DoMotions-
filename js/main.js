(function () {
    'use strict';

    window.DoMotions = window.DoMotions || {};

    if (DoMotions._bootstrapped) { return; }
    DoMotions._bootstrapped = true;

    document.addEventListener('DOMContentLoaded', function () {
        (async function bootstrap() {
            try {
                console.log('[DoMotions] Bootstrap starting…');

                // ── 1. CSInterface ──────────────────────────────
                var csInterface = new CSInterface();

                // ── 2. Settings Manager ─────────────────────────
                await DoMotions.SettingsManager.initialize();
                console.log('[DoMotions] Settings ready.');

                // ── 3. Icon Manager ─────────────────────────────
                var theme = DoMotions.SettingsManager.get('general.theme') || 'dark';
                DoMotions.IconManager.initialize(theme);
                console.log('[DoMotions] Icons ready.');

                // Apply the configured accent color to the CSS design system.
                var accent = DoMotions.SettingsManager.get('general.accentColor');
                if (accent) {
                    document.documentElement.style.setProperty('--accent-primary', accent);
                }

                // ── 4. Bridge ───────────────────────────────────
                await DoMotions.Bridge.initialize(csInterface);
                console.log('[DoMotions] Bridge ready.');

                // ── 5. Command Bus ──────────────────────────────
                DoMotions.CommandBus.initialize(DoMotions.Bridge);
                console.log('[DoMotions] CommandBus ready.');

                // ── 6. Context object ───────────────────────────
                var context = {
                    settings:     DoMotions.SettingsManager,
                    commandBus:   DoMotions.CommandBus,
                    bridge:       DoMotions.Bridge,
                    icons:        DoMotions.IconManager,
                    notification: DoMotions.Notification
                };

                // ── 7. Initialize all registered modules ────────
                await DoMotions.Registry.initializeAll(context);
                console.log('[DoMotions] Modules ready.');

                // ── 8. UI Manager ───────────────────────────────
                var accordionContainer = document.getElementById('dm-accordion');

                if (accordionContainer) {
                    DoMotions.UIManager.initialize(accordionContainer);
                    console.log('[DoMotions] UI ready.');

                    // ── 9. Restore last active module ───────────
                    var lastModule = DoMotions.SettingsManager.get('ui.lastActiveModule')
                                  || DoMotions.SettingsManager.get('general.lastActiveModule');
                    if (lastModule && DoMotions.Registry.get(lastModule)) {
                        DoMotions.UIManager.expand(lastModule);
                    } else {
                        // Expand the first visible module
                        var visible = DoMotions.Registry.getVisible();
                        if (visible.length > 0) {
                            DoMotions.UIManager.expand(visible[0].id);
                        }
                    }
                } else {
                    console.warn('[DoMotions] Accordion container not found in DOM. UI not initialized.');
                }

                // ── 10. Done ────────────────────────────────────
                console.log('DoMotions v0.1 initialized');

            } catch (err) {
                console.error('[DoMotions] Bootstrap failed:', err);
            }
        })();
    });
})();
