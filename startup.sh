#!/bin/bash
# startup.sh - Prepares the environment on the Raspberry Pi

echo "========================================"
echo " Starting Monk OS Setup on Raspberry Pi"
echo "========================================"

# 1. Setup Frontend
echo "[1/2] Installing Frontend Node Modules..."
npm install

# 2. Setup Backend
echo "[2/2] Setting up Python Virtual Environment..."
cd os_backend
# Ensure python3-venv is available on the Pi, usually standard on Raspberry Pi OS
python3 -m venv venv
source venv/bin/activate

# Install requirements
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    echo "Warning: requirements.txt not found. Installing default packages..."
    pip install fastapi uvicorn pydantic requests groq PyMuPDF pillow python-multipart
fi

cd ..

echo "========================================"
echo " Setup Complete!"
echo " First, ensure scripts are executable by running:"
echo " chmod +x launch.sh"
echo " Then start the servers by running:"
echo " ./launch.sh"
echo "========================================"
