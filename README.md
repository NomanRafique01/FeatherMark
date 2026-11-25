<p align="center">
  <img src="assets/icon.png" width="180" height="180" alt="FeatherMark icon" />
</p>

<h1 align="center">FeatherMark</h1>

<p align="center">
  <strong>A quiet, fast, local-first Markdown editor for Windows.</strong><br />
  <sub>Write with live preview, persistent tabs, recent files, and a polished native desktop experience — without sending your documents to the cloud.</sub>
</p>

<p align="center">
  <a href="https://github.com/NomanRafique01/FeatherMark/releases">
    <img src="https://img.shields.io/github/downloads/NomanRafique01/FeatherMark/total?style=flat-square&label=total%20installs&color=426439" alt="Total FeatherMark installer downloads" />
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

FeatherMark is distributed as a Windows x64 installer through GitHub Releases.

<p align="center">
  <a href="https://github.com/NomanRafique01/FeatherMark/releases/latest">
    <img src="https://img.shields.io/badge/Download%20FeatherMark-latest%20Windows%20installer-426439?style=for-the-badge&logo=windows&logoColor=white" alt="Download the latest FeatherMark Windows installer" />
  </a>
</p>

| Package | Description | Download |
|---|---|---|
| **Windows installer** (`.exe`) | NSIS setup wizard with an install-location picker, shortcuts, app icon, and real installation progress | [Open the latest release](https://github.com/NomanRafique01/FeatherMark/releases/latest) |

The current release artifact is named `FeatherMark-Setup-0.1.0.exe`.

> [!NOTE]
> The installer-download badge counts GitHub Release asset downloads. GitHub does not expose a reliable count of unique installations.

## Features

### Focused writing

- **Live Markdown preview** — write in the editor and see formatted Markdown beside it.
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

1. Open the [latest GitHub Release](https://github.com/NomanRafique01/FeatherMark/releases/latest).
2. Download `FeatherMark-Setup-0.1.0.exe` or the installer for the release you selected.
3. Run the installer and choose the installation directory.
4. Launch FeatherMark from the desktop or Start Menu shortcut.

The installer registers FeatherMark with Windows so you can choose it from **Open with** for Markdown files. Windows may request administrator permission for the machine-wide installation.

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

The completed installer is written to `dist/` using the versioned name:

```text
dist/FeatherMark-Setup-<version>.exe
```

## Project structure

```text
FeatherMark/
├── assets/                 # Application artwork and Windows icon assets
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
