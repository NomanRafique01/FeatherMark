# FeatherMark v2.0.0

FeatherMark v2 is a major writing-workflow release: edit Markdown as source or as a rendered document, keep files synchronized, and work with README-style content locally in a focused Windows desktop app.

## Highlights

- **Editable rendered Markdown mode** — format headings, quotes, code blocks, lists, task lists, links, images, and tables directly in the rendered editor.
- **Synchronized source and rendered editing** — switch between Plain text and Markdown editing without losing the current document, cursor position, or save path.
- **Improved GitHub-style Markdown rendering** — render local README images, remote images, badges, tables, task lists, strikethrough, heading anchors, and fenced code blocks more faithfully.
- **Safer local file workflow** — preserve image dimensions, resolve local image paths relative to the document, and keep document data on the Windows machine.
- **More reliable sessions** — restore minimized windows correctly, keep session snapshots current, and make exit/save confirmation flows dependable.
- **Refined Windows packaging** — ship a polished NSIS installer with stable file associations, correct app metadata, shortcuts, and versioned installer artifacts.

## Included in the release

- Windows x64 installer: `FeatherMark-Setup-2.0.0.exe`
- Markdown file associations for `.md`, `.markdown`, `.mdown`, `.mkdn`, `.mkd`, and `.mdwn`
- Light, dark, and system themes
- Tabs, recent files, session restore, find and replace, outline navigation, drag-and-drop opening, and split/editor/preview layouts

## Compatibility

- Windows 10 or Windows 11, 64-bit
- No runtime internet connection required

## Upgrade notes

FeatherMark v2 continues to use local files and local application state. Existing Markdown documents remain plain-text files and can be opened by other editors at any time.

## Checksums

Checksums are published with the Windows installer release assets when the GitHub Release is created.

Thank you for using FeatherMark. If you find a problem, please [open an issue](https://github.com/NomanRafique01/FeatherMark/issues) with your Windows version, FeatherMark version, reproduction steps, and any relevant screenshot or error message.
