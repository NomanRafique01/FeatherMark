; FeatherMark — custom NSIS include (electron-builder `nsis.include`).
; The install page uses NSIS's native determinate progress UI. Keep the
; extraction details visible so users can see the current file work without
; replacing the progress bar with a custom marquee animation.
!macro customHeader
  ShowInstDetails show
!macroend

!macro customInit
  SetDetailsPrint both
!macroend

!macro customInstall
  ; Remove the legacy ProgID from early builds. New installers register the
  ; FeatherMark.Markdown ProgID directly through electron-builder.
  DeleteRegKey HKCU "Software\Classes\Markdown Document"
  DeleteRegKey HKLM "Software\Classes\Markdown Document"

  ; A fresh install/reinstall starts as a clean app. Never touch another
  ; Windows user's profile: APPDATA is switched to the current user context.
  ; Existing user state is preserved during a genuine in-place upgrade.
  ${ifNot} ${isUpdated}
    ${if} $installMode == "all"
      SetShellVarContext current
    ${endIf}
    RMDir /r "$APPDATA\FeatherMark"
    RMDir /r "$LOCALAPPDATA\FeatherMark"
    ${if} $installMode == "all"
      SetShellVarContext all
    ${endIf}
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
