@echo off
echo Starting Monk OS Backend...
start "Monk OS Backend" cmd /k "cd os_backend && venv\Scripts\python.exe main.py"

echo Starting Monk OS Frontend...
start "Monk OS Frontend" cmd /k "npm run dev"

echo Both services are starting up!
