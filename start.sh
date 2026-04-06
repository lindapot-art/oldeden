#!/bin/bash
# ========================================================================
#  Old Eden - Self-Executable Launcher for Linux/Mac
# ========================================================================
#  This script automatically:
#    1. Checks for Node.js installation
#    2. Installs dependencies (first run only)
#    3. Sets up environment configuration
#    4. Launches the game server
# ========================================================================

echo ""
echo "========================================"
echo "   OLD EDEN - Game Launcher"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo ""
    echo "Please download and install Node.js from:"
    echo "https://nodejs.org/"
    echo ""
    echo "Minimum required version: Node.js 20.0.0 or higher"
    echo ""
    exit 1
fi

# Display Node.js version
echo "[OK] Node.js detected"
node --version
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "[SETUP] First time setup - Installing dependencies..."
    echo "This may take a few minutes..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] Failed to install dependencies!"
        echo "Please check your internet connection and try again."
        exit 1
    fi
    echo ""
    echo "[OK] Dependencies installed successfully!"
    echo ""
else
    echo "[OK] Dependencies already installed"
    echo ""
fi

# Check if .env file exists, if not copy from example
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[SETUP] Creating .env configuration file..."
        cp .env.example .env
        echo "[OK] Configuration file created (.env)"
        echo ""
        echo "[INFO] You may want to edit .env file to configure:"
        echo "  - Database connections (MongoDB, Redis)"
        echo "  - Blockchain settings (Polygon)"
        echo "  - Server port (default: 3000)"
        echo ""
    else
        echo "[WARNING] .env.example not found"
        echo "You may need to configure environment variables manually"
        echo ""
    fi
else
    echo "[OK] Configuration file exists (.env)"
    echo ""
fi

# Start the game server
echo "========================================"
echo "   STARTING OLD EDEN SERVER"
echo "========================================"
echo ""
echo "The game server will start on http://localhost:3000"
echo "Press Ctrl+C to stop the server"
echo ""
echo "----------------------------------------"
echo ""

node src/core/index.js

# If the server exits with an error, display the exit code
if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Server exited with error code $?"
    echo ""
fi
