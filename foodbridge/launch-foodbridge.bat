@echo off
setlocal

cd /d "%~dp0"

set "PORT=3000"
set "CHROME_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"

node -e "const http=require('http');const req=http.get('http://localhost:%PORT%',()=>process.exit(0));req.on('error',()=>process.exit(1));req.setTimeout(1200,()=>{req.destroy();process.exit(1);});"
if errorlevel 1 (
  echo Starting FoodBridge dev server with auto-recovery monitor...
  start "FoodBridge Dev Server Monitor" cmd /k "cd /d ""%~dp0"" && npm run monitor"
  node -e "const http=require('http');let tries=0;const wait=()=>{const req=http.get('http://localhost:%PORT%',res=>{res.resume();process.exit(0);});req.on('error',()=>{if(++tries>30)process.exit(1);setTimeout(wait,500);});req.setTimeout(500,()=>{req.destroy();if(++tries>30)process.exit(1);setTimeout(wait,500);});};wait();"
) else (
  echo FoodBridge server is already running on port %PORT%.
)

if exist "%CHROME_EXE%" (
  start "" "%CHROME_EXE%" --new-window "http://localhost:%PORT%"
) else (
  start "" http://localhost:%PORT%
)

echo Done. Server is running with auto-recovery enabled.
endlocal
