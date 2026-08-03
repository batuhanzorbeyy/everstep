@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js bulunamadi. Once Node.js 22 LTS veya daha yeni bir surum kurun.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Everstep ilk kez hazirlaniyor. Kilitli bagimliliklar kuruluyor...
  call npm ci --no-fund
  if errorlevel 1 (
    echo Kurulum sirasinda hata olustu.
    pause
    exit /b 1
  )
)

call npm run security:check
if errorlevel 1 (
  echo Guvenlik kontrolu basarisiz oldu. Uygulama baslatilmadi.
  pause
  exit /b 1
)

echo Everstep baslatiliyor...
call npm run dev
if errorlevel 1 pause
