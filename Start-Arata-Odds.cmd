@echo off
cd /d "%~dp0"
node backend\launch-local.mjs
if errorlevel 1 (
  pause
  exit /b 1
)
start "" "http://localhost:5173/"
