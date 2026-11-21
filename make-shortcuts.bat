@echo off
rem Adds "Usage Island" shortcuts (with the pill icon) to your Start menu and Desktop.
set "APP=%~dp0island"
if not exist "%APP%\node_modules\electron\dist\electron.exe" (
  echo Usage Island is not installed yet. Run "npm install" inside the island folder first.
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$app=$env:APP; $exe=Join-Path $app 'node_modules\electron\dist\electron.exe'; $q=[char]34; $ws=New-Object -ComObject WScript.Shell; foreach($dir in @([Environment]::GetFolderPath('Programs'),[Environment]::GetFolderPath('Desktop'))){ $s=$ws.CreateShortcut((Join-Path $dir 'Usage Island.lnk')); $s.TargetPath=$exe; $s.Arguments=$q+$app+$q; $s.WorkingDirectory=$app; $s.IconLocation=(Join-Path $app 'usage-island.ico'); $s.Description='Usage Island'; $s.Save(); Write-Host ('Created: '+(Join-Path $dir 'Usage Island.lnk')) }"
echo.
echo Done. Search "Usage Island" in the Start menu, or use the Desktop icon.
pause
