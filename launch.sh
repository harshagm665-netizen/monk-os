#!/bin/bash
# launch.sh - Starts both the FastAPI Backend and the Vite/React Frontend on Raspberry Pi

echo "========================================"
echo " Launching Monk OS..."
echo "========================================"

# Start the FastAPI Backend in the background
echo "-> Starting Python Backend on Port 8000..."
cd os_backend
source venv/bin/activate
# Host 0.0.0.0 exposes the server to the local network so you can access it from other devices
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Start the React Frontend in the background
echo "-> Starting React Frontend..."
# Expose the frontend to the local network using --host
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo "========================================"
echo " Services are running in the background."
echo " Backend PID: $BACKEND_PID"
echo " Frontend PID: $FRONTEND_PID"
echo " Press [CTRL+C] to gracefully shut down."
echo "========================================"

# Catch the Ctrl+C signal to kill both servers cleanly when exiting
trap "echo -e '\nShutting down Monk OS...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT TERM

# Wait for background jobs to finish (keeps the script running)
wait
