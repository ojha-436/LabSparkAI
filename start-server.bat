@echo off
title LabSpark AI - Local Dev Server
echo ========================================================
echo   LabSpark AI Enterprise Workbench - Dev Server Launcher
echo ========================================================
echo.
echo Checking system environments to bypass Same-Origin policies...
echo.

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo [+] Node.js environment detected!
  echo [+] Launching Node.js http-server at http://localhost:8080
  echo.
  npx http-server -p 8080 -c-1 -o "LabSpark Virtual Lab.html"
  goto end
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
  echo [+] Python environment detected!
  echo [+] Launching Python HTTP server at http://localhost:8000
  echo.
  start "" "http://localhost:8000/LabSpark Virtual Lab.html"
  python -m http.server 8000
  goto end
)

echo [!] WARNING: Neither Node.js nor Python was found on your system PATH.
echo To run this modular frontend locally, please:
echo 1. Install Node.js (https://nodejs.org) OR Python.
echo 2. Run this launcher again, or open the workspace folder in your IDE (like VS Code with Live Server).
echo.
pause

:end
