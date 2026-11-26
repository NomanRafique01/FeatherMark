# FeatherMark v2.0.1

This patch makes the Windows installer cleaner, safer, and more transparent during installation.

## Installer improvements

- **Clean fresh installs** — a fresh install or reinstall starts with clean FeatherMark settings for the current Windows user instead of inheriting stale sessions or recent-file data.
- **Per-user isolation** — FeatherMark uses the current Windows user's app-data directory and never reads another Windows user's profile.
- **Complete uninstall** — uninstall removes the installed application, shortcuts, file associations, settings, session data, and FeatherMark's local runtime cache.
- **Upgrade-safe behavior** — in-place upgrades preserve the current user's FeatherMark settings and documents.
- **Smoother installation progress** — the installer uses ZIP-backed extraction and NSIS's native determinate progress page so progress advances left-to-right with visible extraction details.

## Included in the release

- Windows x64 installer: `FeatherMark-Setup-2.0.1.exe`
- Existing FeatherMark v2 editor, Markdown rendering, themes, tabs, recents, session restore, and Windows file associations

## Compatibility

- Windows 10 or Windows 11, 64-bit
- No runtime internet connection required
