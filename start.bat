@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"
start "" "http://localhost:8000"
powershell -NoProfile -ExecutionPolicy Bypass -File server.ps1
pause