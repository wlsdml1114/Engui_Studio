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

REM Check if PowerShell execution policy allows script execution
powershell -Command "Get-ExecutionPolicy" | findstr /i "Restricted" >nul
if %errorlevel% equ 0 (
    echo [WARNING] PowerShell execution policy is set to Restricted.
    echo [INFO] This may prevent the script from running.
    echo [INFO] You may need to run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    echo.
    pause
)

REM Run PowerShell script
powershell -ExecutionPolicy Bypass -File "start-windows.ps1"

pause
