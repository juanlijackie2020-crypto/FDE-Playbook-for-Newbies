@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js LTS, then run this file again.
 pause
 exit /b 1
)
echo Open http://127.0.0.1:4173 in Edge or Chrome.
node server.mjs
pause
