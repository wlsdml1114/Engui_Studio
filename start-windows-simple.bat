@echo off
chcp 65001 >nul
title EnguiStudio Server Start (Simple)

echo.
echo ========================================
echo    EnguiStudio Server Start
echo    Simple Version
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
    echo [INFO] Installing AWS CLI automatically...
    echo.
    
    echo [INFO] Downloading AWS CLI installer...
    curl -L -o AWSCLIV2.msi "https://awscli.amazonaws.com/AWSCLIV2.msi"
    
    if exist "AWSCLIV2.msi" (
        echo [OK] AWS CLI installer downloaded successfully.
        echo [INFO] Installing AWS CLI...
        msiexec.exe /i AWSCLIV2.msi /quiet /norestart
        if %errorlevel% equ 0 (
            echo [OK] AWS CLI installed successfully.
        ) else (
            echo [WARNING] Silent installation failed, opening installer...
            start AWSCLIV2.msi
            echo [INFO] Please complete the installation and restart this script.
            pause
            exit /b 0
        )
        del AWSCLIV2.msi
        echo [INFO] AWS CLI installation completed.
        echo [INFO] Please restart this script to continue.
        pause
        exit /b 0
    ) else (
        echo [ERROR] Failed to download AWS CLI installer.
        pause
        exit /b 1
    )
) else (
    echo [OK] AWS CLI is installed.
)
echo.

REM Check FFmpeg installation
echo [INFO] Checking FFmpeg installation...

REM First check if ffmpeg is in system PATH
ffmpeg -version >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] FFmpeg is installed in system PATH.
    goto :ffmpeg_ok
)

REM Check if ffmpeg is in local ffmpeg folder
if exist "ffmpeg\ffmpeg.exe" (
    echo [OK] FFmpeg is installed locally in ffmpeg folder.
    goto :ffmpeg_ok
)

REM If not found, try to install
if not exist "ffmpeg" mkdir ffmpeg
    
    echo [INFO] Downloading FFmpeg...
    curl -L -o ffmpeg.zip "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    
    if exist "ffmpeg.zip" (
        echo [OK] FFmpeg downloaded successfully.
        echo [INFO] Extracting FFmpeg...
        
        REM Try PowerShell extraction
        powershell -Command "try { Expand-Archive -Path 'ffmpeg.zip' -DestinationPath 'ffmpeg' -Force } catch { exit 1 }"
        if %errorlevel% equ 0 (
            echo [OK] FFmpeg extracted successfully.
        ) else (
            echo [WARNING] PowerShell extraction failed, trying alternative method...
            powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('ffmpeg.zip', 'ffmpeg')"
            if %errorlevel% equ 0 (
                echo [OK] FFmpeg extracted successfully via alternative method.
            ) else (
                echo [ERROR] All extraction methods failed.
                echo [INFO] Opening Windows Explorer for manual extraction...
                explorer .
                echo [INFO] Please extract ffmpeg.zip manually and restart this script.
                pause
                exit /b 1
            )
        )
        
        REM Organize FFmpeg files
        for /d %%i in (ffmpeg\ffmpeg-*) do (
            if exist "%%i\bin\ffmpeg.exe" (
                move "%%i\bin\*" "ffmpeg\"
                if exist "%%i\doc" move "%%i\doc\*" "ffmpeg\doc\" 2>nul
                if exist "%%i\presets" move "%%i\presets\*" "ffmpeg\presets\" 2>nul
                rmdir /s /q "%%i"
            )
        )
        
        del ffmpeg.zip
        echo [INFO] FFmpeg installation completed.
    ) else (
        echo [ERROR] Failed to download FFmpeg.
        pause
        exit /b 1
    )

:ffmpeg_ok
echo.

REM Check dependencies installation
echo [INFO] Checking dependencies installation...
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
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
npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma client.
    pause
    exit /b 1
)
echo [OK] Prisma client generated successfully.
echo.

REM Initialize database
echo [INFO] Checking database status...
if exist "prisma\db\database.db" (
    echo [OK] Database already exists.
) else (
    echo [INFO] Creating new database...
    npx prisma db push
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create database.
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

start http://localhost:3000
npm run dev

popd
pause
