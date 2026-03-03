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

if not exist node_modules (
  echo Installing dependencies (first run)...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Wingman...
call npm run dev -- --host
pause
