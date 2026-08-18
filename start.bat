@echo off
setlocal enabledelayedexpansion
title Lusion Local Server

echo ====================================================
echo   Starting Lusion 3D Local Server...
echo ====================================================

set "PORT=8000"
set "PYTHON_EXE="

:: 1. Check PATH
where python >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_EXE=python"
    goto RUN_SERVER
)

:: 2. Check py launcher
where py >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_EXE=py"
    goto RUN_SERVER
)

:: 3. Check AppData Python paths
for /d %%i in ("%LOCALAPPDATA%\Python\pythoncore*") do (
    if exist "%%i\python.exe" (
        set "PYTHON_EXE=%%i\python.exe"
        goto RUN_SERVER
    )
)

for /d %%i in ("%LOCALAPPDATA%\Programs\Python\Python*") do (
    if exist "%%i\python.exe" (
        set "PYTHON_EXE=%%i\python.exe"
        goto RUN_SERVER
    )
)

:: 4. Check Program Files Python paths
for /d %%i in ("C:\Program Files\Python*") do (
    if exist "%%i\python.exe" (
        set "PYTHON_EXE=%%i\python.exe"
        goto RUN_SERVER
    )
)

:: 5. Fallback: Run with built-in Windows PowerShell (No Python needed!)
echo Python was not found in PATH. Using Windows built-in HTTP server...
start "" "http://localhost:%PORT%"
powershell -NoProfile -Command "Write-Host 'Server running at http://localhost:%PORT%/ (Press Ctrl+C to stop)'; \ = New-Object System.Net.HttpListener; \.Prefixes.Add('http://+:%PORT%/'); try { \.Start() } catch { \.Prefixes.Clear(); \.Prefixes.Add('http://localhost:%PORT%/'); \.Start() }; while (\.IsListening) { \ = \.GetContext(); \ = \.Request; \ = \.Response; \ = \.Url.LocalPath.TrimStart('/'); if (\ -eq '') { \ = 'index.html' }; \ = Join-Path (Get-Location) \; if (Test-Path \ -PathType Leaf) { \ = [System.IO.File]::ReadAllBytes(\); \ = [System.IO.Path]::GetExtension(\).ToLower(); switch(\){ '.html'{\.ContentType='text/html; charset=utf-8'} '.js'{\.ContentType='application/javascript; charset=utf-8'} '.css'{\.ContentType='text/css; charset=utf-8'} '.json'{\.ContentType='application/json'} '.png'{\.ContentType='image/png'} '.jpg'{\.ContentType='image/jpeg'} '.jpeg'{\.ContentType='image/jpeg'} '.gif'{\.ContentType='image/gif'} '.svg'{\.ContentType='image/svg+xml'} '.woff2'{\.ContentType='font/woff2'} '.buf'{\.ContentType='application/octet-stream'} '.ogg'{\.ContentType='audio/ogg'} default{\.ContentType='application/octet-stream'} }; \.ContentLength64 = \.Length; \.OutputStream.Write(\, 0, \.Length) } else { \.StatusCode = 404 }; \.Close() }"
goto END

:RUN_SERVER
echo Using Python: !PYTHON_EXE!
start "" "http://localhost:%PORT%"
"!PYTHON_EXE!" -m http.server %PORT%

:END
pause