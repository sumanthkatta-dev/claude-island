@echo off
set "APP=%~dp0island"
if exist "%APP%\node_modules\electron\dist\electron.exe" (
  start "" "%APP%\node_modules\electron\dist\electron.exe" "%APP%"
) else (
  echo Claude Island is not installed yet. Run "npm install" inside the island folder first.
  pause
)
