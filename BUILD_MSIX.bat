@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0BUILD_MSIX.ps1"
if errorlevel 1 (
  echo.
  echo Derleme basarisiz oldu. Ayrintilar yukarida.
  pause
  exit /b 1
)
echo.
echo MSIX paketi hazir.
pause
