@echo off
REM FoodBridge Dev Server Launcher
REM Starts the dev server automatically and opens the app in browser

cd /d "%~dp0"

echo Stopping any existing Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Starting FoodBridge server...
echo.

start cmd /k npm run dev

REM Wait a moment for server to start
timeout /t 3 /nobreak

REM Open browser to app
start http://localhost:3000

echo.
echo FoodBridge is running at http://localhost:3000
echo Press Ctrl+C in the server window to stop.
