@echo off
title Captivia - Demarrage
cd /d "%~dp0"
echo.
echo === Captivia - Lancement en local ===
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:3001
echo.
call npm run dev
pause
