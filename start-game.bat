@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-game.ps1" %*
if errorlevel 1 (
  echo.
  echo Start failed. Check the output above.
  pause
)
