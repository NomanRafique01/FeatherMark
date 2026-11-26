# FeatherMark v2.0.1

This patch makes the Windows installer cleaner, safer, and transparent while it installs.

## Installer improvements

- **Live extraction log** — the Install page now lists each application file as it is
  unpacked, so you can watch FeatherMark install instead of staring at a stalled bar.
- **Fixed: installer build** — the previous packaging recipe overrode electron-builder's NSIS
  script, which aborted the build and would have shipped without an uninstaller. The installer
  is back on electron-builder's supported assisted template, so the uninstaller is built and
  embedded again.
- **Brand-new installs** — every install starts FeatherMark from defaults: it clears the
  previous settings, recent-files list, restored-tab session, and caches for the installing
  Windows user. Markdown documents are plain files on disk and are never removed.
- **Complete uninstall** — uninstall removes the installed application, shortcuts, file
  associations, settings, session data, and FeatherMark's local runtime cache.
- **Per-user isolation** — FeatherMark uses the current Windows user's app-data directory and
  never reads another Windows user's profile.

## Included in the release

- Windows x64 installer: `FeatherMark-Setup-2.0.1.exe`
- Existing FeatherMark v2.0 editor, Markdown rendering, themes, tabs, recents, session
  restore, and Windows file associations

## Compatibility

- Windows 10 or Windows 11, 64-bit
- No runtime internet connection required
