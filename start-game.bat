@echo off
title Board Arena Online Host (game.thaikub.xyz)
cd /d "%~dp0"
echo ===================================================
echo   Starting Board Arena Server + Cloudflare Tunnel
echo   Domain: https://game.thaikub.xyz
echo ===================================================
start "BoardArena-Server" /min cmd /c node server.js
timeout /t 2 /nobreak >nul
start "BoardArena-Tunnel" /min cmd /c .\cloudflared.exe tunnel --config config.yml run boardarena
echo.
echo Server and Tunnel are running in background!
echo Website: https://game.thaikub.xyz
echo Local:   http://localhost:3000
echo ===================================================
