@echo off
chcp 65001 >nul
title EnguiStudio Server Start (PowerShell)

echo.
echo ========================================
echo    EnguiStudio Server Start
echo    PowerShell Version
echo ========================================
echo.

timeout /t 2 >nul

REM Check current execution policy
echo [INFO] Checking PowerShell execution policy...
for /f "tokens=*" %%i in ('powershell -Command "Get-ExecutionPolicy"') do set current_policy=%%i
echo [INFO] Current execution policy: %current_policy%

REM Try to run with Bypass first
echo [INFO] Attempting to run PowerShell script with execution policy bypass...
powershell -ExecutionPolicy Bypass -File "start-windows.ps1"
if %errorlevel% neq 0 (
    echo [WARNING] Failed to run with Bypass policy.
    echo [INFO] Trying to temporarily change execution policy...
    
    REM Try to set execution policy for current user
    powershell -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force"
    if %errorlevel% equ 0 (
        echo [OK] Execution policy changed successfully.
        echo [INFO] Running PowerShell script...
        powershell -File "start-windows.ps1"
    ) else (
        echo [ERROR] Failed to change execution policy.
        echo [INFO] Please run this command manually:
        echo Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
        echo.
        echo Or run the script as administrator.
    )
)

pause
