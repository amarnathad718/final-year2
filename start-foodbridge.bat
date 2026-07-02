@echo off
cd /d "d:\final year2\foodbridge"
start "FoodBridge Chrome" chrome http://localhost:3000
call npm run dev
