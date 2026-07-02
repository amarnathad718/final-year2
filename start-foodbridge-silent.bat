@echo off
set PROJECT_DIR=d:\final year2\foodbridge

cd /d "%PROJECT_DIR%"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do goto openbrowser

start "FoodBridge Dev Server" /min cmd /c "cd /d \"%PROJECT_DIR%\" && npm run dev"

:waitforserver
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://localhost:3000 -TimeoutSec 2) | Out-Null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  timeout /t 2 /nobreak >nul
  goto waitforserver
)

:openbrowser
start "" chrome http://localhost:3000
exit /b
