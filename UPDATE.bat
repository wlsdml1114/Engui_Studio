@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title EnguiStudio Project Update

echo.
echo ========================================
echo    EnguiStudio Project Update
echo ========================================
echo.
echo This script will:
echo 1. Pull latest changes from Git repository
echo 2. Update dependencies
echo 3. Generate Prisma client
echo 4. Run database migration if needed
echo.

timeout /t 2 /nobreak >nul

:: Check if this is a Git repository
echo [INFO] Checking Git repository...
if not exist ".git" (
    echo [ERROR] This is not a Git repository.
    echo.
    echo Solution:
    echo 1. Make sure you're in the project root directory
    echo 2. Or clone the repository first
    echo.
    pause
    exit /b 1
)

:: Check for uncommitted changes
echo [INFO] Checking for uncommitted changes...

:: Simple check - if git status says "working tree clean", we're good
git status 2>nul | findstr /C:"working tree clean" >nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] No uncommitted changes found.
) else (
    echo [WARNING] You have uncommitted changes:
    git status --porcelain
    echo.
    echo Options:
    echo 1. Commit your changes first
    echo 2. Stash your changes temporarily
    echo 3. Continue update ^(may overwrite your changes^)
    echo.

    set /p continue_update="Do you want to continue with update? (y/n): "
    if /i not "!continue_update!"=="y" (
        echo [INFO] Update cancelled.
        pause
        exit /b 0
    )
)

echo [OK] Git repository check passed.
echo.

:: Pull latest changes
echo [INFO] Pulling latest changes from repository...
git pull origin main
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Git pull had issues, but continuing...
    echo [INFO] You may need to resolve merge conflicts manually.
) else (
    echo [OK] Repository updated successfully.
)
echo.

:: Update dependencies
echo [INFO] Updating dependencies...
echo [INFO] This may take a few minutes...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to update dependencies.
    echo.
    echo Solution:
    echo 1. Clear npm cache: npm cache clean --force
    echo 2. Delete node_modules folder and try again
    echo 3. Check your internet connection
    echo.
    pause
    exit /b 1
)
echo [OK] Dependencies updated successfully.
echo.

:: Generate Prisma client
echo [INFO] Generating Prisma client...
npx prisma generate
if %ERRORLEVEL% NEQ 0 (
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

:: Check database schema changes
echo [INFO] Checking for database schema changes...
npx prisma db push
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Database push had issues, but schema may still be updated.
) else (
    echo [OK] Database is up to date.
)
echo.

:: Summary
echo.
echo ========================================
echo    Project Update Complete!
echo ========================================
echo.
echo Updated components:
echo ✓ Git repository
echo ✓ Node.js dependencies
echo ✓ Prisma client
echo ✓ Database schema
echo.
echo Your project is now up to date!
echo You can now run start-windows.bat to start the development server.
echo.
pause