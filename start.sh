#!/bin/bash
echo "🚀 Starting Monk OS on Raspberry Pi 4..."

# Step 0: System Prerequisites
echo "🔍 Checking System Dependencies..."


if ! command -v avahi-daemon &> /dev/null; then
    echo "📦 avahi-daemon not found. Installing for mDNS (.local) broadcasting..."
    sudo apt-get update && sudo apt-get install -y avahi-daemon
    sudo systemctl enable avahi-daemon
    sudo systemctl restart avahi-daemon
fi

if ! command -v chromium-browser &> /dev/null; then
    echo "📦 chromium-browser not found. Installing via apt..."
    sudo apt-get update && sudo apt-get install -y chromium-browser
fi

# Step 1: Initialize the Python Backend
echo "📦 Setting up Python Backend..."
cd os_backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "Installing Python dependencies (this may take a moment on first run)..."

# Ensure we have permissions over our own venv
sudo chown -R $USER:$USER venv/

# Force remove the conflicting opencv-python and install contrib (for cv2.face)
pip uninstall -y opencv-python opencv-python-headless
pip install -r requirements.txt

# Start FastAPI on port 8000 in the background (which now statically serves the React UI)
echo "Starting Backend Server & UI..."
python main.py &
BACKEND_PID=$!
cd ..

echo "✅ Monk AI Core running with PID: $BACKEND_PID"

# Step 3: Wait for servers to wake up
echo "⏳ Waiting 8 seconds for servers to initialize..."
sleep 8

# Step 4: Open Chromium Browser automatically
echo "🌐 Launching Monk OS in Chromium..."
# Using --kiosk opens it in full screen without tabs/URL bar (ideal for robot displays)
# You can remove --kiosk if you want a normal window
if command -v chromium-browser &> /dev/null; then
    chromium-browser --app=http://localhost:8000
else
    echo "❌ ERROR: chromium-browser STILL not found! Attempting normal chromium..."
    if command -v chromium &> /dev/null; then
        chromium --app=http://localhost:8000
    else
        echo "❌ ERROR: No chromium browser found! You may need to open http://localhost:8000 manually."
    fi
fi

# Step 5: Cleanup trap
# This ensures that if you close the script in the terminal, it safely shuts down the servers
trap "echo 'Shutting down Monk OS...'; kill $BACKEND_PID 2>/dev/null; exit" INT TERM EXIT

# Wait indefinitely to keep the script running in terminal
wait
