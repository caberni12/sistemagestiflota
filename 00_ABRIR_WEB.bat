@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PORT=8787
where python >nul 2>nul
if %errorlevel%==0 (
  start "" "http://127.0.0.1:%PORT%/combustible.html"
  python -m http.server %PORT% --bind 127.0.0.1
) else (
  echo Python no esta instalado. Abra index.html desde su servidor Web.
  pause
)
