@echo off
REM ========================================================================
REM  Old Eden - Self-Executable Launcher for Windows
REM ========================================================================
REM  This script automatically:
REM    1. Checks for Node.js installation
REM    2. Installs dependencies (first run only)
REM    3. Sets up environment configuration
REM    4. Launches the game server
REM ========================================================================

echo.
echo ========================================
echo   OLD EDEN - Game Launcher
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    echo Minimum required version: Node.js 20.0.0 or higher
    echo.
    pause
    exit /b 1
)

REM Display Node.js version
echo [OK] Node.js detected
node --version
echo.

REM Check if dependencies are installed
if not exist "node_modules\" (
    echo [SETUP] First time setup - Installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Failed to install dependencies!
        echo Please check your internet connection and try again.
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed successfully!
    echo.
) else (
    echo [OK] Dependencies already installed
    echo.
)

REM Check if .env file exists, if not copy from example
if not exist ".env" (
    if exist ".env.example" (
        echo [SETUP] Creating .env configuration file...
        copy .env.example .env >nul
        echo [OK] Configuration file created ^(.env^)
        echo.
        echo [INFO] You may want to edit .env file to configure:
        echo   - Database connections ^(MongoDB, Redis^)
        echo   - Blockchain settings ^(Polygon^)
        echo   - Server port ^(default: 3000^)
        echo.
    ) else (
        echo [WARNING] .env.example not found
        echo You may need to configure environment variables manually
        echo.
    )
) else (
    echo [OK] Configuration file exists ^(.env^)
    echo.
)

REM Check if port 3000 is busy (don't kill — other apps may be using it)
echo [CHECK] Checking port 3000 availability...
netstat -aon | findstr ":3000 " | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Port 3000 is busy — server will auto-rotate to next available port
    echo.
) else (
    echo [OK] Port 3000 is available
    echo.
)

REM Start the game server
echo ========================================
echo   STARTING OLD EDEN SERVER
echo ========================================
echo.
echo The game server will start on http://localhost:3000
echo ^(If port 3000 is busy, it will auto-rotate to the next available port^)
echo Press Ctrl+C to stop the server
echo.
echo ----------------------------------------
echo.

node src/core/index.js

REM If the server exits, pause so user can see any error messages
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Server exited with error code %ERRORLEVEL%
    echo Please check the output above for details.
    echo.
    pause
)
