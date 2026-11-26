<p align="center">
  <img src="assets/icon.png" width="180" height="180" alt="FeatherMark icon" />
</p>

<h1 align="center">FeatherMark</h1>

<p align="center">
  <strong>A quiet, fast, local-first Markdown editor for Windows.</strong><br />
  <sub>Write with live preview, persistent tabs, recent files, and a polished native desktop experience — without sending your documents to the cloud.</sub>
</p>

<p align="center">
  <a href="https://github.com/NomanRafique01/FeatherMark/releases/latest">
    <img src="https://img.shields.io/badge/Download-Windows%20Installer-426439?style=flat-square&logo=windows&logoColor=white" alt="Download FeatherMark Windows installer" />
  </a>
  <img src="https://img.shields.io/badge/platform-Windows%20x64-0078d4?style=flat-square&logo=windows&logoColor=white" alt="Platform: Windows x64" />
  <img src="https://img.shields.io/badge/Electron-desktop-47848f?style=flat-square&logo=electron&logoColor=white" alt="Electron desktop app" />
  <a href="https://github.com/NomanRafique01/FeatherMark/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/NomanRafique01/FeatherMark?style=flat-square" alt="MIT license" />
  </a>
</p>

---

## Table of Contents

- [Why FeatherMark](#why-feathermark)
- [Download](#download)
- [Features](#features)
- [Installation](#installation)
- [File associations](#file-associations)
- [Privacy and local storage](#privacy-and-local-storage)
- [Development](#development)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [FAQ](#faq)
- [Feedback](#feedback)
- [License](#license)

## Why FeatherMark

Most Markdown tools either feel like a developer IDE or depend on a browser-first workflow. FeatherMark is designed to stay out of the way: open a document, write in a calm editor, and see the rendered result beside it.

| | Typical online editor | **FeatherMark** |
|---|---|---|
| Where files are processed | Remote service or browser tab | **Your own Windows machine** |
| Privacy | Documents may leave the device | **Local files stay local** |
| Internet required | Often | **No runtime connection required** |
| Writing workflow | Browser-based | **Native desktop editor** |
| Session continuity | Depends on account or browser storage | **Local tabs, recents, and settings** |
| Cost | Subscriptions are common | **Free and open source under MIT** |

## Download

FeatherMark is distributed as a Windows x64 installer through GitHub Releases. Requires Windows 10 or Windows 11, 64-bit; no runtime internet connection.

<p align="center">
  <a href="https://github.com/NomanRafique01/FeatherMark/releases/download/v2.0.1/FeatherMark-Setup-2.0.1.exe">
    <img src="https://img.shields.io/badge/Download%20v2.0.1-latest%20Windows%20installer-426439?style=for-the-badge&logo=windows&logoColor=white" alt="Download FeatherMark v2.0.1, the latest Windows installer" />
  </a>
  <a href="https://github.com/NomanRafique01/FeatherMark/releases/download/v0.1.0/FeatherMark-Setup-0.1.0.exe">
    <img src="https://img.shields.io/badge/Download%20v0.1.0-legacy%20Windows%20installer-555555?style=for-the-badge&logo=windows&logoColor=white" alt="Download the legacy FeatherMark v0.1.0 Windows installer" />
  </a>
</p>

### Which version should I get?

> [!TIP]
> **Install v2.0.1.** It is the current release, and the recommended download for every new
> machine or upgrade. Take v0.1.0 only if you specifically need the pre-v2 editor — it is kept
> for reference and is no longer maintained.

| Version | Status | Installer | What you get |
|---|---|---|---|
| **v2.0.1** | **Recommended — latest** | [`FeatherMark-Setup-2.0.1.exe`](https://github.com/NomanRafique01/FeatherMark/releases/download/v2.0.1/FeatherMark-Setup-2.0.1.exe) (83.8 MB) | Editable rendered Markdown, synchronized source/rendered editing, tabs, outline, find and replace, themes, session restore, GitHub-style rendering, plus the fixed NSIS installer with a live per-file extraction log |
| v0.1.0 | Legacy — prerelease | [`FeatherMark-Setup-0.1.0.exe`](https://github.com/NomanRafique01/FeatherMark/releases/download/v0.1.0/FeatherMark-Setup-0.1.0.exe) (83.8 MB) | The original FeatherMark editor: tabs, live preview, outline, find and replace, and themes — without the rendered-mode editing and GitHub-style rendering added in v2 |

Both installers are machine-wide NSIS setup wizards with an install-location picker, desktop and Start Menu shortcuts, and Markdown file associations. Your `.md` files stay plain text and are never modified by installing or uninstalling.

The differences worth knowing before you pick the legacy build: v0.1.0 registers a generic
"Markdown document" ProgID that v2.0.1 removes on install, and its uninstaller leaves your
settings and caches behind. Only v2.0.1 starts FeatherMark brand new and streams the extraction
log.

Verifying v2.0.1:

```text
SHA-256  b2934087d7648aeb2bd67b56df10b5ba2d08d7a7ab23e13aa4d514fe95662800
```

Older v2.0.0 builds were superseded by v2.0.1 and are not published. Every release, including release notes and checksums, is listed on the [releases page](https://github.com/NomanRafique01/FeatherMark/releases).

## Features

### Focused writing

- **Live Markdown preview** — write in the editor and see formatted Markdown beside it.
- **Editable rendered Markdown** — format headings, lists, task items, links, images, code, quotes, and tables directly in the rendered document.
- **Plain text and Markdown modes** — switch editing formats while keeping the same document and save path.
- **Editor, preview, and split modes** — choose the layout that fits the current task.
- **Tabs** — work across multiple documents without losing your place.
- **Find and replace** — search the current document with keyboard-friendly controls.
- **Document outline** — jump through headings in long Markdown files.
- **Light, dark, and system themes** — keep the workspace comfortable in any environment.

### Local-first state

- **Recent files** persist in a local JSON settings file and survive restarts.
- **Session restore** remembers open tabs, cursor position, and scroll position.
- **First-run initialization** creates clean default settings on a new installation.
- **Development isolation** keeps source-checkout data separate from installed-user data.
- **No cloud-backed document storage** — FeatherMark works with files on your machine.

### Windows integration

- **Markdown file associations** for `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mkd`, and `.mdwn`.
- **Open with FeatherMark** from Windows Explorer.
- **Default-app support** through Windows file-association settings.
- **Desktop and Start Menu shortcuts** created by the installer.
- **Fast startup surface** with no blank startup window.

## Installation

1. Pick a version in [Download](#download) above, or open the [latest GitHub Release](https://github.com/NomanRafique01/FeatherMark/releases/latest).
2. Download `FeatherMark-Setup-2.0.1.exe` — recommended for every new install and upgrade.
3. Run the installer and choose the installation directory.
4. Launch FeatherMark from the desktop or Start Menu shortcut.

The installer registers FeatherMark with Windows so you can choose it from **Open with** for Markdown files. Windows may request administrator permission for the machine-wide installation.

On v2.0.1, the Install step lists each application file as it is extracted, so progress is
visible instead of a stalled bar.

Every v2.0.1 install starts FeatherMark brand new — it clears the previous settings,
recent-files list, restored-tab session, and caches for the installing Windows user. Other
Windows users keep their own state until they run an installer. Your Markdown documents are
ordinary files on disk and are never removed by installing or uninstalling. A full uninstall
also removes the application, shortcuts, and file associations.

## File associations

FeatherMark supports these common Markdown extensions:

`.md` · `.markdown` · `.mdown` · `.mkdn` · `.mkd` · `.mdwn`

To choose FeatherMark manually after installation:

1. Right-click a Markdown file in Windows Explorer.
2. Select **Open with** → **Choose another app**.
3. Select **FeatherMark**.
4. Enable **Always use this app** if you want FeatherMark to become the default.

## Privacy and local storage

FeatherMark does not upload documents or use remote storage for its editor state. Recent files, preferences, window state, and session data are stored locally in the application user-data directory.

Installed builds use the Windows per-user application data directory. Source-checkout development builds use a separate development directory so testing data does not leak into a fresh installation.

## Development

### Prerequisites

- Windows 10 or Windows 11, 64-bit
- Node.js 18 or later
- npm

### Setup

```bash
git clone https://github.com/NomanRafique01/FeatherMark.git
cd FeatherMark
npm install
```

### Run locally

```bash
npm start
```

### Build the renderer

```bash
npm run build:renderer
```

### Build the Windows installer

```bash
npm run dist
```

Before packaging, `npm run dist` runs `scripts/patch-nsis-extraction.mjs`, which points
electron-builder's NSIS template at `Nsis7z::ExtractWithDetails` so the installer lists files
as it extracts them. It re-applies itself after a fresh `npm ci` and stops the build with an
explanation if a future electron-builder changes that template.

The completed installer is written to `dist/` using the versioned name:

```text
dist/FeatherMark-Setup-<version>.exe
```

## Project structure

```text
FeatherMark/
├── assets/                 # Application artwork and Windows icon assets
├── build/                  # NSIS installer hooks (custom.nsh macros)
├── scripts/                # Build-time packaging scripts
├── renderer/               # Preact UI, editor, preview, themes, and styles
│   ├── components/         # Reusable desktop UI components
│   ├── app.jsx             # Renderer entry point and application state
│   └── markdown.js         # Markdown parsing and rendering rules
├── store/settings.js       # Local JSON settings, recents, and session state
├── main.js                 # Electron main process and filesystem access
├── preload.js              # Context-isolated renderer API
├── electron-builder.yml    # Windows NSIS packaging and file associations
├── package.json            # Scripts and dependencies
└── LICENSE                 # MIT License
```

## Roadmap

| Area | Status |
|---|---|
| Core Markdown editing and preview | ✅ Available |
| Tabs, recent files, and session restore | ✅ Available |
| Windows installer and file associations | ✅ Available |
| Expanded Markdown authoring tools | 🚧 Planned |
| More export and publishing workflows | 🚧 Planned |
| Cross-platform packaging | 🗺️ Under consideration |

## FAQ

<details>
<summary><b>Does FeatherMark require an internet connection?</b></summary>

No. The editor and its local state are designed to work without a runtime cloud connection. Internet access is only needed to download the installer or updates.
</details>

<details>
<summary><b>Where are recent files stored?</b></summary>

Recent files are stored locally in FeatherMark's JSON settings file inside the Windows application user-data directory. They are not stored remotely.
</details>

<details>
<summary><b>Can FeatherMark open Markdown files from Windows Explorer?</b></summary>

Yes. The installer registers common Markdown extensions, and FeatherMark handles files launched from **Open with** or by double-clicking an associated file.
</details>

<details>
<summary><b>Is FeatherMark free?</b></summary>

Yes. FeatherMark is open source and released under the MIT License.
</details>

<details>
<summary><b>Which operating systems are supported?</b></summary>

The current installer targets 64-bit Windows 10 and Windows 11.
</details>

## Feedback

Found a bug or have an idea? Please [open an issue](https://github.com/NomanRafique01/FeatherMark/issues) with:

- your Windows version,
- the FeatherMark version,
- the steps to reproduce the problem, and
- any relevant error message or screenshot.

## License

FeatherMark is released under the [MIT License](LICENSE). You are free to use, modify, and redistribute it under the terms of that license.

---

<p align="center">
  <sub>Built with care by <a href="https://github.com/NomanRafique01">Noman Rafique</a>.</sub>
</p>
