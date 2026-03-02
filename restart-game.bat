@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restart-local-game.ps1" %*
if errorlevel 1 (
  echo.
  echo Restart failed. Check the output above.
  pause
)
