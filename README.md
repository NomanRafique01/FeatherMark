<p align="center"> <img src="assets/icon.png" alt="FeatherMark icon" width="180" height="180" /> </p>

<h1 align="center">FeatherMark</h1>

<p align="center"> <strong>A quiet, fast, local-first Markdown editor for Windows.</strong><br /> Write with live preview, persistent tabs, recent files, and a polished native desktop experience — without sending your documents to the cloud. </p>

<p align="center"> <a href="https://github.com/NomanRafique01/FeatherMark/releases/latest"> <img src="https://img.shields.io/badge/Download-Windows%20Installer-426439?style=flat-square&amp;logo=windows&amp;logoColor=white" alt="Download FeatherMark Windows installer" /> </a> <img src="https://img.shields.io/badge/platform-Windows%20x64-0078d4?style=flat-square&amp;logo=windows&amp;logoColor=white" alt="Platform: Windows x64" /> <img src="https://img.shields.io/badge/Electron-desktop-47848f?style=flat-square&amp;logo=electron&amp;logoColor=white" alt="Electron desktop app" /> <a href="https://github.com/NomanRafique01/FeatherMark/blob/main/LICENSE"> <img src="https://img.shields.io/github/license/NomanRafique01/FeatherMark?style=flat-square" alt="MIT license" /> </a> </p>

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

<table>
<thead>
<tr>
<th></th>
<th>Typical online editor</th>
<th><strong>FeatherMark</strong></th>
</tr>
</thead>
<tbody>
<tr>
<td>Where files are processed</td>
<td>Remote service or browser tab</td>
<td><strong>Your own Windows machine</strong></td>
</tr>
<tr>
<td>Privacy</td>
<td>Documents may leave the device</td>
<td><strong>Local files stay local</strong></td>
</tr>
<tr>
<td>Internet required</td>
<td>Often</td>
<td><strong>No runtime connection required</strong></td>
</tr>
<tr>
<td>Writing workflow</td>
<td>Browser-based</td>
<td><strong>Native desktop editor</strong></td>
</tr>
<tr>
<td>Session continuity</td>
<td>Depends on account or browser storage</td>
<td><strong>Local tabs, recents, and settings</strong></td>
</tr>
<tr>
<td>Cost</td>
<td>Subscriptions are common</td>
<td><strong>Free and open source under MIT</strong></td>
</tr>
</tbody>
</table>

## Download

FeatherMark is distributed as a Windows x64 installer through GitHub Releases.

<p align="center"> <a href="https://github.com/NomanRafique01/FeatherMark/releases/latest"> <img src="https://img.shields.io/badge/Download%20FeatherMark-latest%20Windows%20installer-426439?style=for-the-badge&amp;logo=windows&amp;logoColor=white" alt="Download the latest FeatherMark Windows installer" /> </a> </p>

<table>
<thead>
<tr>
<th>Package</th>
<th>Description</th>
<th>Download</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>Windows installer</strong> (<code>.exe</code>)</td>
<td>NSIS setup wizard with an install-location picker, shortcuts, app icon, and real installation progress</td>
<td><a href="https://github.com/NomanRafique01/FeatherMark/releases/latest">Open the latest release</a></td>
</tr>
</tbody>
</table>

The current release artifact is named `FeatherMark-Setup-2.0.0.exe`.

> [!NOTE] The latest Windows installer is available from the [GitHub Releases page](https://github.com/NomanRafique01/FeatherMark/releases/latest).

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

1. Open the [latest GitHub Release](https://github.com/NomanRafique01/FeatherMark/releases/latest).
2. Download `FeatherMark-Setup-2.0.0.exe` or the installer for the release you selected.
3. Run the installer and choose the installation directory.
4. Launch FeatherMark from the desktop or Start Menu shortcut.

The installer registers FeatherMark with Windows so you can choose it from **Open with** for Markdown files. Windows may request administrator permission for the machine-wide installation.

Fresh installs and reinstalls start with clean FeatherMark settings for the current Windows user; FeatherMark never reads another Windows user's profile. A full uninstall removes the application, shortcuts, file associations, settings, session data, and FeatherMark's local runtime cache. In-place upgrades keep the current user's FeatherMark settings and documents untouched.

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

<table>
<thead>
<tr>
<th>Area</th>
<th>Status</th>
</tr>
</thead>
<tbody>
<tr>
<td>Core Markdown editing and preview</td>
<td>✅ Available</td>
</tr>
<tr>
<td>Tabs, recent files, and session restore</td>
<td>✅ Available</td>
</tr>
<tr>
<td>Windows installer and file associations</td>
<td>✅ Available</td>
</tr>
<tr>
<td>Expanded Markdown authoring tools</td>
<td>🚧 Planned</td>
</tr>
<tr>
<td>More export and publishing workflows</td>
<td>🚧 Planned</td>
</tr>
<tr>
<td>Cross-platform packaging</td>
<td>🗺️ Under consideration</td>
</tr>
</tbody>
</table>

## FAQ

<details>
<summary><b>Does FeatherMark require an internet connection?</b></summary>
</details>

No. The editor and its local state are designed to work without a runtime cloud connection. Internet access is only needed to download the installer or updates.

<details>
<summary><b>Where are recent files stored?</b></summary>
</details>

Recent files are stored locally in FeatherMark's JSON settings file inside the Windows application user-data directory. They are not stored remotely.

<details>
<summary><b>Can FeatherMark open Markdown files from Windows Explorer?</b></summary>
</details>

Yes. The installer registers common Markdown extensions, and FeatherMark handles files launched from **Open with** or by double-clicking an associated file.

<details>
<summary><b>Is FeatherMark free?</b></summary>
</details>

Yes. FeatherMark is open source and released under the MIT License.

<details>
<summary><b>Which operating systems are supported?</b></summary>
</details>

The current installer targets 64-bit Windows 10 and Windows 11.

## Feedback

Found a bug or have an idea? Please [open an issue](https://github.com/NomanRafique01/FeatherMark/issues) with:

- your Windows version,
- the FeatherMark version,
- the steps to reproduce the problem, and
- any relevant error message or screenshot.

## License

FeatherMark is released under the [MIT License](LICENSE). You are free to use, modify, and redistribute it under the terms of that license.

---

<p align="center"> Built with care by <a href="https://github.com/NomanRafique01">Noman Rafique</a>. </p>
