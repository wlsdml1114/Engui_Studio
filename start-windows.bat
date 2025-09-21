@echo off
chcp 65001 >nul
title EnguiStudio Server Start

echo.
echo ========================================
echo    EnguiStudio Server Start
echo ========================================
echo.

timeout /t 2 >nul

pushd "%~dp0"

echo [INFO] Current directory: %CD%
echo.

REM Check Node.js installation
echo [INFO] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Solution:
    echo 1. Download and install Node.js from https://nodejs.org
    echo 2. Restart command prompt after installation
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js is installed.
echo.

REM Check AWS CLI installation
echo [INFO] Checking AWS CLI installation...
aws --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] AWS CLI is not installed.
    echo.
    echo AWS CLI is required for S3 storage functionality.
    echo.
    set /p install_aws="Do you want to install AWS CLI automatically? (y/n): "
    if /i "%install_aws%"=="y" (
        echo [INFO] Downloading AWS CLI installer...
        powershell -Command "Invoke-WebRequest -Uri 'https://awscli.amazonaws.com/AWSCLIV2.msi' -OutFile 'AWSCLIV2.msi'"
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to download AWS CLI installer.
            echo.
            echo Manual installation required:
            echo 1. Download AWS CLI from https://awscli.amazonaws.com/AWSCLIV2.msi
            echo 2. Run the installer
            echo 3. Restart command prompt
            echo.
            pause
            exit /b 1
        )
        
        echo [INFO] Installing AWS CLI...
        msiexec.exe /i AWSCLIV2.msi /quiet /norestart
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to install AWS CLI.
            echo.
            echo Manual installation required:
            echo 1. Run AWSCLIV2.msi manually
            echo 2. Restart command prompt
            echo.
            pause
            exit /b 1
        )
        
        echo [INFO] Cleaning up installer...
        del AWSCLIV2.msi
        
        echo [INFO] AWS CLI installation completed.
        echo [INFO] Please restart this script to continue.
        echo.
        pause
        exit /b 0
    ) else (
        echo [INFO] AWS CLI installation skipped.
        echo.
        echo Note: S3 storage features will not work without AWS CLI.
        echo You can install it later from: https://awscli.amazonaws.com/AWSCLIV2.msi
        echo.
    )
) else (
    echo [OK] AWS CLI is installed.
)
echo.

REM Check dependencies installation
echo [INFO] Checking dependencies installation...
if not exist "node_modules" (
    echo [INFO] Installing dependencies... (This may take time on first run)
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        echo.
        echo Solution:
        echo 1. Check your internet connection
        echo 2. Clear npm cache: npm cache clean --force
        echo 3. Delete node_modules folder and try again
        echo.
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] Dependencies are already installed.
)
echo.

REM Generate Prisma client
echo [INFO] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma client.
    echo.
    echo Solution:
    echo 1. Check Prisma schema file
    echo 2. Check database connection
    echo.
    pause
    exit /b 1
)
echo [OK] Prisma client generated successfully.
echo.

REM Initialize database (only on first run)
echo [INFO] Checking database status...
if exist "prisma\db\database.db" (
    echo [OK] Database already exists.
    echo [INFO] Using existing database.
) else (
    echo [INFO] Database does not exist.
    echo [INFO] Creating new database...
    call npx prisma db push
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create database.
        echo.
        echo Solution:
        echo 1. Check database connection settings
        echo 2. Check Prisma schema
        echo.
        pause
        exit /b 1
    )
    echo [OK] Database created successfully.
)
echo.

REM Start development server
echo [INFO] Starting development server...
echo [INFO] Browser will open automatically...
echo.
echo ========================================
echo    Development server started successfully!
echo    Check http://localhost:3000 in your browser
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

REM Open browser
start http://localhost:3000

REM Start development server
call npm run dev

popd
pause
