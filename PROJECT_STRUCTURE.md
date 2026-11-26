# Feathermark — Project Structure

```
feathermark/
├── main.js                     # Electron main process (window, menu, IPC handlers)
├── preload.js                  # contextBridge — secure IPC only, no direct Node access
├── package.json
├── electron-builder.yml        # Windows NSIS packaging + file associations
├── build/
│   └── feathermark-custom.nsh  # NSIS hooks: detail visibility, legacy ProgID + uninstall cleanup
├── scripts/
│   └── patch-nsis-extraction.mjs  # Streams extracted file names (run by `npm run dist`)
│
├── renderer/
│   ├── index.html
│   ├── app.jsx                 # Preact root, tab state, layout shell
│   ├── tokens.css               # Design tokens (color variables, light/dark)
│   ├── style.css                 # Global styles, typography, layout
│   │
│   ├── components/
│   │   ├── TabBar.jsx            # Tab list, drag-reorder, close/new/unsaved dot
│   │   ├── Editor.jsx            # CodeMirror 6 wrapper, keybindings, auto-pair
│   │   ├── Preview.jsx           # markdown-it render + scroll-sync
│   │   ├── Toolbar.jsx           # Optional formatting toolbar (bold/italic/link/etc.)
│   │   ├── StatusBar.jsx         # Word/char count, reading time, cursor pos
│   │   ├── Outline.jsx           # TOC sidebar, built from headings
│   │   └── FindReplace.jsx       # Find & replace overlay
│   │
│   ├── markdown.js              # markdown-it instance + GFM plugin config
│   └── theme.js                 # OS theme detection + manual override logic
│
├── store/
│   └── settings.js              # Recent files, session state, user prefs (JSON file)
│
└── assets/
    └── icons/                   # App icon, tray icon (if added later)
```

## Notes

- **main.js** owns all file-system access (open/save/export/watch). Renderer never touches `fs` directly.
- **preload.js** exposes a minimal typed API (`window.feathermark.openFile()`, `.saveFile()`, etc.) via `contextBridge`.
- **store/settings.js** is a flat JSON file (e.g. `~/.feathermark/settings.json`) — no database.
- **tokens.css** is imported once in `index.html`, before `style.css`, so every component can use the CSS variables from `DESIGN_TOKENS.md`.
- Components stay presentational where possible; tab/file state lives in `app.jsx` and is passed down as props (no state library needed at this scale).
