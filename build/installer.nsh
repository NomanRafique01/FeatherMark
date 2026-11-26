; FeatherMark — custom NSIS include (electron-builder `nsis.include`).
; Remove the legacy ProgID from early builds. New installers register the
; FeatherMark.Markdown ProgID directly through electron-builder.
!macro customInstall
  DeleteRegKey HKCU "Software\Classes\Markdown Document"
  DeleteRegKey HKLM "Software\Classes\Markdown Document"
!macroend
