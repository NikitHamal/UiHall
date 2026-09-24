@echo off
REM Launch UI Hall over http instead of opening the file directly.
REM
REM You do NOT need this to browse the hall - double-clicking ui-hall\index.html
REM works, because the data layer falls back to the generated data\corpus.js on
REM file://. Use this when you want a shareable URL, or a browser that is strict
REM about local media playback.
setlocal
cd /d "%~dp0"

set "NODE="
if exist "%USERPROFILE%\.workbuddy-ai\binaries\node\versions\22.22.2-3\node.exe" (
  set "NODE=%USERPROFILE%\.workbuddy-ai\binaries\node\versions\22.22.2-3\node.exe"
)
if not defined NODE (
  where node >nul 2>nul && set "NODE=node"
)
if not defined NODE (
  echo Node.js was not found. Either install it, or just open:
  echo    %~dp0ui-hall\index.html
  pause
  exit /b 1
)

set "PORT=8099"
echo Serving UI Hall at http://127.0.0.1:%PORT%/
echo Press Ctrl+C to stop.
start "" "http://127.0.0.1:%PORT%/"
"%NODE%" "tools\serve.mjs" %PORT%
