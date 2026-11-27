; FeatherMark - custom NSIS include (electron-builder `nsis.include`).
; Only the supported hook macros live here; the installer itself is
; electron-builder's stock assisted template so the uninstaller keeps being
; built and installed correctly.

; Per-extension wiring that electron-builder's stock APP_ASSOCIATE does not do:
; adds the ProgID to the "Open with" candidate list, sets the per-user class
; default, and clears any stale UserChoice so FeatherMark becomes the default.
!macro FM_BECOME_DEFAULT_EXT EXT
  WriteRegStr SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "FeatherMark.Markdown" ""
  WriteRegStr HKCU "Software\Classes\.${EXT}" "" "FeatherMark.Markdown"
  ; A UserChoice left over from another editor outranks everything registered
  ; here; Explorer only falls back to the registered default once it is gone.
  ; Deleting it needs no elevation, writing a new one would need the protected
  ; association hash — so delete-and-fallback is the only silent path.
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.${EXT}\UserChoice"
!macroend

!macro FM_REVERT_DEFAULT_EXT EXT
  DeleteRegValue SHELL_CONTEXT "Software\Classes\.${EXT}\OpenWithProgids" "FeatherMark.Markdown"
  ; Only drop the per-user default if it is still ours.
  ReadRegStr $R0 HKCU "Software\Classes\.${EXT}" ""
  ${if} $R0 == "FeatherMark.Markdown"
    DeleteRegValue HKCU "Software\Classes\.${EXT}" ""
  ${endif}
!macroend

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

  ; ---- Markdown defaults + "Open with" presence ----
  ; electron-builder's registerFileAssociations already wrote the
  ; FeatherMark.Markdown ProgID and the SHELL_CONTEXT class mapping; this adds
  ; the OpenWithProgids entries, clears overriding UserChoices, and registers
  ; the executable itself so the picker shows FeatherMark with its icon.
  !insertmacro FM_BECOME_DEFAULT_EXT md
  !insertmacro FM_BECOME_DEFAULT_EXT markdown
  !insertmacro FM_BECOME_DEFAULT_EXT mdown
  !insertmacro FM_BECOME_DEFAULT_EXT mkdn
  !insertmacro FM_BECOME_DEFAULT_EXT mkd
  !insertmacro FM_BECOME_DEFAULT_EXT mdwn

  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}" "FriendlyAppName" "FeatherMark"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\DefaultIcon" "" "$appExe,0"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell" "" "open"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\shell\open\command" "" '"$appExe" "%1"'
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".md" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".markdown" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".mdown" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".mkdn" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".mkd" ""
  WriteRegStr SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}\SupportedTypes" ".mdwn" ""

  WriteRegStr SHELL_CONTEXT "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXECUTABLE_FILENAME}" "" "$appExe"
  WriteRegStr SHELL_CONTEXT "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXECUTABLE_FILENAME}" "Path" "$INSTDIR"

  ; Tell the running shells to re-read the association tables.
  !insertmacro UPDATEFILEASSOC

  ; Windows refuses to honor registry-only defaults: double-click looks for a
  ; hash-protected UserChoice first, and only the Settings UI may mint one
  ; (that hash is derived from the user's SID, so no installer can forge it).
  ; Open the Default apps page pre-selected on .md so confirming FeatherMark
  ; is a single click; Windows then writes the UserChoice legitimately.
  ${StdUtils.ExecShellAsUser} $R2 "ms-settings:defaultapps?fileExtention=.md" "open" ""
  ${if} $R2 != 0
    ; Windows 10 builds that do not know the fileExtention query parameter.
    ${StdUtils.ExecShellAsUser} $R2 "ms-settings:defaultapps" "open" ""
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

  ; electron-builder's unregisterFileAssociations removes the ProgID and
  ; restores the backed-up class default; drop everything the installer added
  ; on top of it.
  !insertmacro FM_REVERT_DEFAULT_EXT md
  !insertmacro FM_REVERT_DEFAULT_EXT markdown
  !insertmacro FM_REVERT_DEFAULT_EXT mdown
  !insertmacro FM_REVERT_DEFAULT_EXT mkdn
  !insertmacro FM_REVERT_DEFAULT_EXT mkd
  !insertmacro FM_REVERT_DEFAULT_EXT mdwn

  DeleteRegKey SHELL_CONTEXT "Software\Classes\Applications\${APP_EXECUTABLE_FILENAME}"
  DeleteRegKey SHELL_CONTEXT "Software\Microsoft\Windows\CurrentVersion\App Paths\${APP_EXECUTABLE_FILENAME}"

  !insertmacro UPDATEFILEASSOC
!macroend
