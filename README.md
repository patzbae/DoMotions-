# DoMotions

**Adobe After Effects Motion Design Toolkit**

Version: **0.1.0**

---

## Requirements

- Adobe After Effects CC 2020 or later (v17.0+)
- CEP 9 or later (Creative Extensions Platform) — the manifest targets `CSXS 9.0`, so the panel loads on AE 2020 through the latest release.

## Installation

1. **Enable unsigned extensions** — open Registry Editor and navigate to the key
   whose version matches the CEP runtime of your After Effects version:

   | After Effects | Registry key |
   |---------------|--------------|
   | 2019 / 2020   | `HKEY_CURRENT_USER\Software\Adobe\CSXS.9`  |
   | 2021          | `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` |
   | 2022 – latest | `HKEY_CURRENT_USER\Software\Adobe\CSXS.11` (or `CSXS.12`) |

   Create a new **String** value named `PlayerDebugMode` and set it to `1`.
   (If unsure, create the `PlayerDebugMode` value under every `CSXS.*` key present.)

2. **Copy the extension** — place the entire `DoMotions` folder into:

   ```
   %APPDATA%\Adobe\CEP\extensions\
   ```

3. **Restart After Effects.**

4. **Open the panel** — go to `Window > Extensions > DoMotions`.

---

## Project Structure

```
DoMotions/
├── CSXS/
│   └── manifest.xml          # CEP extension manifest
├── config/
│   └── defaults.json         # Default settings
├── css/
│   └── styles.css            # Panel stylesheet
├── icons/                    # SVG icons for modules & UI
├── js/
│   ├── lib/
│   │   └── CSInterface.js    # Adobe CSInterface library
│   ├── core/
│   │   ├── registry.js       # Plugin Registry
│   │   ├── settings-manager.js
│   │   ├── icon-manager.js
│   │   ├── bridge.js         # ExtendScript bridge
│   │   ├── command-bus.js    # Command dispatcher
│   │   └── ui.js             # UI Manager
│   ├── modules/
│   │   ├── easing/           # Easing module
│   │   ├── anchor/           # Anchor point module
│   │   ├── layer/            # Layer utilities module
│   │   ├── graph/            # Graph editor module
│   │   ├── text/             # Text tools module
│   │   ├── utilities/        # General utilities module
│   │   └── settings/         # Settings panel module
│   └── main.js               # Application entry point
├── jsx/
│   └── hostscript.jsx        # ExtendScript host scripts
├── .debug                    # Chrome DevTools debug config
└── README.md
```

---

## Adding a New Module

1. Create a new directory under `js/modules/<module-name>/`.
2. Create `module.js` exporting an object that conforms to the module interface (`id`, `label`, `icon`, `init()`, `render()`, `destroy()`).
3. Optionally create `commands.js` to define command handlers for the Command Bus.
4. If the module needs ExtendScript functions, add them to `jsx/hostscript.jsx`.
5. Add `<script>` tags for the new files in `index.html` (before `js/main.js`, after existing modules).
6. The module will be automatically discovered by the Plugin Registry on next load.

---

## Debugging

Open Chrome or any Chromium-based browser and navigate to:

```
http://localhost:8088
```

This connects to the CEP panel via Chrome DevTools remote debugging (configured in the `.debug` file).

---

## Architecture Overview

| Component            | Role                                                                 |
|----------------------|----------------------------------------------------------------------|
| **Plugin Registry**  | Central catalog of all modules; handles discovery and lifecycle.     |
| **Command Bus**      | Decoupled command dispatch — modules publish/subscribe to commands.  |
| **Settings Manager** | Reads/writes persistent settings; merges with `config/defaults.json`.|
| **Module Lifecycle**  | Each module implements `init → render → destroy` for clean setup/teardown. |
