@echo off
setlocal
cd /d "%~dp0"
title Wingman Portable

echo === Wingman Portable ===
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required.
  echo Install Node 20+ (LTS) from https://nodejs.org then run again.
  pause
  exit /b 1
)

if not exist package.json (
  echo This release package is missing package.json.
  echo Rebuild the portable package and try again.
  pause
  exit /b 1
)

if not exist dist\index.html (
  echo This release package is missing the built frontend in dist\.
  echo Rebuild the portable package and try again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies (first run)...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Wingman preview and local backend...
call npm run preview:full
pause
