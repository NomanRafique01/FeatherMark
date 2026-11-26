; FeatherMark - custom NSIS include (electron-builder `nsis.include`).
; Only the supported hook macros live here; the installer itself is
; electron-builder's stock assisted template so the uninstaller keeps being
; built and installed correctly.

!macro customHeader
  ; The stock template sets `ShowInstDetails nevershow` in common.nsh. This
  ; macro is inserted after that include, so `show` wins and the Install page
  ; exposes the streaming extraction log.
  ShowInstDetails show
!macroend

!macro customInstall
  ; Remove the legacy ProgID from early builds. New installers register the
  ; FeatherMark.Markdown ProgID directly through electron-builder.
  DeleteRegKey HKCU "Software\Classes\Markdown Document"
  DeleteRegKey HKLM "Software\Classes\Markdown Document"

  ; Every install starts brand new: drop the previous settings, recents,
  ; session restore and caches. Markdown documents themselves are plain files
  ; on disk and are never touched here.
  ; APPDATA is switched to the installing user's context so no other Windows
  ; profile is ever read or deleted; other users keep their own state until
  ; they run an installer.
  ${if} $installMode == "all"
    SetShellVarContext current
  ${endIf}
  RMDir /r "$APPDATA\FeatherMark"
  RMDir /r "$LOCALAPPDATA\FeatherMark"
  ${if} $installMode == "all"
    SetShellVarContext all
  ${endIf}
!macroend

!macro customUnInstall
  ; electron-builder removes the APPDATA userData folder when
  ; deleteAppDataOnUninstall is enabled. Also remove Electron's local cache
  ; location so uninstall leaves no FeatherMark-owned runtime files behind.
  ${if} $installMode == "all"
    SetShellVarContext current
  ${endIf}
  RMDir /r "$LOCALAPPDATA\FeatherMark"
  ${if} $installMode == "all"
    SetShellVarContext all
  ${endIf}

  DeleteRegKey HKCU "Software\Classes\Markdown Document"
  DeleteRegKey HKLM "Software\Classes\Markdown Document"
!macroend
