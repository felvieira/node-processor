!macro NSIS_HOOK_POSTINSTALL
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "node-processor"
  ${If} $0 != ""
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "node-processor" '"$INSTDIR\node-processor.exe" --background'
  ${ElseIf} $UpdateMode != 1
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "node-processor" '"$INSTDIR\node-processor.exe" --background'
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode != 1
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "node-processor"
  ${EndIf}
!macroend
