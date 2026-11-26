; FeatherMark — custom NSIS include (electron-builder `nsis.include`).
; customInstall runs after registerFileAssociations, so these writes win.
; The ProgID friendly name is what the "Open with" / default-apps UI shows for
; each entry; electron-builder writes the fileAssociations description there,
; and a stale value from another Markdown app can shadow ours in HKCU.
!macro customInstall
  DeleteRegKey HKCU "Software\Classes\Markdown Document"
  WriteRegStr SHELL_CONTEXT "Software\Classes\Markdown document" "" "FeatherMark"
!macroend
