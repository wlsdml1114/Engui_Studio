# EnguiStudio Server Start Script
# PowerShell Version

# Set console encoding to UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Set window title
$Host.UI.RawUI.WindowTitle = "EnguiStudio Server Start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   EnguiStudio Server Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Green
Write-Host "1. Check and install required dependencies (Node.js, AWS CLI, FFmpeg)" -ForegroundColor Yellow
Write-Host "2. Set up the development environment" -ForegroundColor Yellow
Write-Host "3. Start the development server" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: If AWS CLI or FFmpeg needs to be installed," -ForegroundColor Cyan
Write-Host "the script will exit after installation and need to be run again." -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 2

# Change to script directory
Set-Location $PSScriptRoot

Write-Host "[INFO] Current directory: $(Get-Location)" -ForegroundColor Green
Write-Host ""

# Check for administrator privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Host "[WARNING] This script is not running as administrator." -ForegroundColor Yellow
    Write-Host "[INFO] Some installations may require administrator privileges." -ForegroundColor Yellow
    Write-Host "[INFO] If installation fails, please run this script as administrator." -ForegroundColor Yellow
    Write-Host ""
}

# Check Node.js installation
Write-Host "[INFO] Checking Node.js installation..." -ForegroundColor Green
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host "[ERROR] Node.js is not installed." -ForegroundColor Red
    Write-Host ""
    Write-Host "Solution:" -ForegroundColor Yellow
    Write-Host "1. Download and install Node.js from https://nodejs.org" -ForegroundColor Yellow
    Write-Host "2. Restart command prompt after installation" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Check AWS CLI installation
Write-Host "[INFO] Checking AWS CLI installation..." -ForegroundColor Green
try {
    $awsVersion = aws --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] AWS CLI is installed: $awsVersion" -ForegroundColor Green
    } else {
        throw "AWS CLI not found"
    }
} catch {
    Write-Host "[WARNING] AWS CLI is not installed." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "AWS CLI is required for S3 storage functionality." -ForegroundColor Yellow
    Write-Host "[INFO] Installing AWS CLI automatically..." -ForegroundColor Green
    Write-Host ""
    
    Write-Host "[INFO] Downloading AWS CLI installer..." -ForegroundColor Green
    Write-Host "[INFO] This may take a few minutes depending on your internet connection..." -ForegroundColor Yellow
    
    try {
        $downloadUrl = "https://awscli.amazonaws.com/AWSCLIV2.msi"
        $installerPath = "AWSCLIV2.msi"
        
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing -TimeoutSec 300
        Write-Host "[OK] AWS CLI installer downloaded successfully." -ForegroundColor Green
        
        Write-Host "[INFO] Installing AWS CLI..." -ForegroundColor Green
        Write-Host "[INFO] This may require administrator privileges..." -ForegroundColor Yellow
        
        # Check if AWS CLI is already installed
        try {
            $existingVersion = aws --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[INFO] AWS CLI is already installed: $existingVersion" -ForegroundColor Green
                Write-Host "[INFO] Skipping installation." -ForegroundColor Green
                Remove-Item $installerPath -Force
                Write-Host "[INFO] Please restart this script to continue." -ForegroundColor Yellow
                Read-Host "Press Enter to exit"
                exit 0
            }
        } catch {
            # Continue with installation
        }
        
        # Try silent installation first
        Write-Host "[INFO] Attempting silent installation..." -ForegroundColor Green
        $silentProcess = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $installerPath, "/quiet", "/norestart" -Wait -PassThru
        if ($silentProcess.ExitCode -eq 0) {
            Write-Host "[OK] AWS CLI installed successfully via silent installation." -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Silent installation failed (Exit Code: $($silentProcess.ExitCode)), trying with UI..." -ForegroundColor Yellow
            
            # Try passive installation
            Write-Host "[INFO] Attempting passive installation..." -ForegroundColor Green
            $passiveProcess = Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", $installerPath, "/passive", "/norestart" -Wait -PassThru
            if ($passiveProcess.ExitCode -eq 0) {
                Write-Host "[OK] AWS CLI installed successfully via UI installation." -ForegroundColor Green
            } else {
                Write-Host "[ERROR] All installation methods failed (Exit Code: $($passiveProcess.ExitCode))." -ForegroundColor Red
                Write-Host ""
                Write-Host "Diagnostic information:" -ForegroundColor Yellow
                Write-Host "- Installer file: $installerPath" -ForegroundColor Yellow
                Write-Host "- File size: $((Get-Item $installerPath).Length) bytes" -ForegroundColor Yellow
                Write-Host "- Running as admin: $isAdmin" -ForegroundColor Yellow
                Write-Host "- Silent install exit code: $($silentProcess.ExitCode)" -ForegroundColor Yellow
                Write-Host "- Passive install exit code: $($passiveProcess.ExitCode)" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Possible solutions:" -ForegroundColor Yellow
                Write-Host "1. Run this script as administrator" -ForegroundColor Yellow
                Write-Host "2. Run AWSCLIV2.msi manually as administrator" -ForegroundColor Yellow
                Write-Host "3. Uninstall existing AWS CLI first" -ForegroundColor Yellow
                Write-Host "4. Check Windows Event Viewer for detailed error" -ForegroundColor Yellow
                Write-Host "5. Try downloading installer again" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "[INFO] Opening AWS CLI installer..." -ForegroundColor Green
                Start-Process $installerPath
                Write-Host "[INFO] Please complete the installation manually and restart this script." -ForegroundColor Yellow
                Read-Host "Press Enter to exit"
                exit 0
            }
        }
        
        Write-Host "[INFO] Cleaning up installer..." -ForegroundColor Green
        Remove-Item $installerPath -Force
        
        Write-Host "[INFO] AWS CLI installation completed." -ForegroundColor Green
        
        # Verify installation
        Write-Host "[INFO] Verifying AWS CLI installation..." -ForegroundColor Green
        try {
            $newVersion = aws --version 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] AWS CLI verified: $newVersion" -ForegroundColor Green
            } else {
                Write-Host "[WARNING] AWS CLI installation may not be complete." -ForegroundColor Yellow
                Write-Host "[INFO] You may need to restart your command prompt or add AWS CLI to PATH." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "[WARNING] Could not verify AWS CLI installation." -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "   AWS CLI Installation Complete!" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Green
        Write-Host "1. Close this window" -ForegroundColor Yellow
        Write-Host "2. Run this script again to continue" -ForegroundColor Yellow
        Write-Host "3. AWS CLI will be available in the new session" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "The script will now exit to allow PATH updates to take effect." -ForegroundColor Green
        Write-Host ""
        Read-Host "Press Enter to close this window"
        exit 0
    } catch {
        Write-Host "[ERROR] Failed to download AWS CLI installer: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual installation required:" -ForegroundColor Yellow
        Write-Host "1. Download AWS CLI from https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Yellow
        Write-Host "2. Run the installer" -ForegroundColor Yellow
        Write-Host "3. Restart command prompt" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# Check FFmpeg installation
Write-Host "[INFO] Checking FFmpeg installation..." -ForegroundColor Green

# First check if ffmpeg is in system PATH
try {
    $ffmpegVersion = ffmpeg -version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] FFmpeg is installed in system PATH." -ForegroundColor Green
        $ffmpegInstalled = $true
    } else {
        $ffmpegInstalled = $false
    }
} catch {
    $ffmpegInstalled = $false
}

# Check if ffmpeg is in local ffmpeg folder
if (-not $ffmpegInstalled) {
    if (Test-Path "ffmpeg\ffmpeg.exe") {
        Write-Host "[OK] FFmpeg is installed locally in ffmpeg folder." -ForegroundColor Green
        $ffmpegInstalled = $true
    }
}

# If not found, try to install
if (-not $ffmpegInstalled) {
    Write-Host "[WARNING] FFmpeg is not installed." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "FFmpeg is required for video thumbnail generation." -ForegroundColor Yellow
    Write-Host "[INFO] Installing FFmpeg automatically..." -ForegroundColor Green
    Write-Host ""
    
    Write-Host "[INFO] Creating ffmpeg directory..." -ForegroundColor Green
    if (-not (Test-Path "ffmpeg")) {
        New-Item -ItemType Directory -Path "ffmpeg" -Force | Out-Null
    }
    
    Write-Host "[INFO] Downloading FFmpeg..." -ForegroundColor Green
    Write-Host "[INFO] This may take several minutes depending on your internet connection..." -ForegroundColor Yellow
    
    try {
        $downloadUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
        $zipPath = "ffmpeg.zip"
        
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 600
        Write-Host "[OK] FFmpeg downloaded successfully." -ForegroundColor Green
        
        Write-Host "[INFO] Checking downloaded file..." -ForegroundColor Green
        $fileSize = (Get-Item $zipPath).Length
        Write-Host "[INFO] Downloaded file size: $fileSize bytes" -ForegroundColor Green
        
        if ($fileSize -lt 1000000) {
            Write-Host "[ERROR] Downloaded file is too small ($fileSize bytes). Download may have failed." -ForegroundColor Red
            Write-Host "[INFO] File contents:" -ForegroundColor Yellow
            Get-Content $zipPath
            Read-Host "Press Enter to exit"
            exit 1
        }
        
        Write-Host "[INFO] Extracting FFmpeg..." -ForegroundColor Green
        
        try {
            Expand-Archive -Path $zipPath -DestinationPath "ffmpeg" -Force
            Write-Host "[OK] FFmpeg extracted successfully." -ForegroundColor Green
        } catch {
            Write-Host "[WARNING] PowerShell extraction failed, trying alternative method..." -ForegroundColor Yellow
            try {
                Add-Type -AssemblyName System.IO.Compression.FileSystem
                [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, "ffmpeg")
                Write-Host "[OK] FFmpeg extracted successfully via alternative method." -ForegroundColor Green
            } catch {
                Write-Host "[ERROR] All extraction methods failed: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host ""
                Write-Host "Manual extraction required:" -ForegroundColor Yellow
                Write-Host "1. Extract ffmpeg.zip manually" -ForegroundColor Yellow
                Write-Host "2. Move contents to ffmpeg folder" -ForegroundColor Yellow
                Write-Host ""
                Write-Host "Opening Windows Explorer to help with manual extraction..." -ForegroundColor Green
                Start-Process "explorer.exe" -ArgumentList "."
                Write-Host ""
                $continue = Read-Host "Do you want to continue without FFmpeg? (y/n)"
                if ($continue -eq "y" -or $continue -eq "Y") {
                    Write-Host "[INFO] Continuing without FFmpeg. Video thumbnail features will not be available." -ForegroundColor Yellow
                    Write-Host "[INFO] You can install FFmpeg later manually." -ForegroundColor Yellow
                } else {
                    Read-Host "Press Enter to exit"
                    exit 1
                }
            }
        }
        
        Write-Host "[INFO] Organizing FFmpeg files..." -ForegroundColor Green
        
        # Move FFmpeg files to the correct location
        $ffmpegDirs = Get-ChildItem -Path "ffmpeg" -Directory | Where-Object { $_.Name -like "ffmpeg-*" }
        if ($ffmpegDirs) {
            Write-Host "[INFO] Moving FFmpeg files to correct location..." -ForegroundColor Green
            foreach ($dir in $ffmpegDirs) {
                if (Test-Path "$($dir.FullName)\bin\ffmpeg.exe") {
                    Write-Host "[INFO] Moving files from $($dir.Name)..." -ForegroundColor Green
                    Move-Item "$($dir.FullName)\bin\*" "ffmpeg\" -Force
                    if (Test-Path "$($dir.FullName)\doc") {
                        New-Item -ItemType Directory -Path "ffmpeg\doc" -Force | Out-Null
                        Move-Item "$($dir.FullName)\doc\*" "ffmpeg\doc\" -Force -ErrorAction SilentlyContinue
                    }
                    if (Test-Path "$($dir.FullName)\presets") {
                        New-Item -ItemType Directory -Path "ffmpeg\presets" -Force | Out-Null
                        Move-Item "$($dir.FullName)\presets\*" "ffmpeg\presets\" -Force -ErrorAction SilentlyContinue
                    }
                    Remove-Item $dir.FullName -Recurse -Force
                    Write-Host "[OK] FFmpeg files organized successfully." -ForegroundColor Green
                }
            }
        }
        
        Write-Host "[INFO] Cleaning up installer..." -ForegroundColor Green
        Remove-Item $zipPath -Force
        
        Write-Host "[INFO] FFmpeg installation completed." -ForegroundColor Green
        Write-Host "[INFO] FFmpeg is available in the ffmpeg folder." -ForegroundColor Green
        
        # Verify installation
        if (Test-Path "ffmpeg\ffmpeg.exe") {
            Write-Host "[OK] FFmpeg executable verified: ffmpeg\ffmpeg.exe" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] FFmpeg executable not found after installation." -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "   FFmpeg Installation Complete!" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "FFmpeg is now available locally in the ffmpeg folder." -ForegroundColor Green
        Write-Host "The application will automatically detect and use it." -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host "[ERROR] Failed to download FFmpeg: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Manual installation required:" -ForegroundColor Yellow
        Write-Host "1. Download FFmpeg from https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor Yellow
        Write-Host "2. Extract to ffmpeg folder" -ForegroundColor Yellow
        Write-Host "3. Add to PATH or use full path" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# Check dependencies installation
Write-Host "[INFO] Checking dependencies installation..." -ForegroundColor Green
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing dependencies... (This may take time on first run)" -ForegroundColor Green
    try {
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Dependencies installed successfully." -ForegroundColor Green
        } else {
            throw "npm install failed"
        }
    } catch {
        Write-Host "[ERROR] Failed to install dependencies." -ForegroundColor Red
        Write-Host ""
        Write-Host "Solution:" -ForegroundColor Yellow
        Write-Host "1. Check your internet connection" -ForegroundColor Yellow
        Write-Host "2. Clear npm cache: npm cache clean --force" -ForegroundColor Yellow
        Write-Host "3. Delete node_modules folder and try again" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "[OK] Dependencies are already installed." -ForegroundColor Green
}
Write-Host ""

# Generate Prisma client
Write-Host "[INFO] Generating Prisma client..." -ForegroundColor Green
try {
    npx prisma generate
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Prisma client generated successfully." -ForegroundColor Green
    } else {
        throw "prisma generate failed"
    }
} catch {
    Write-Host "[ERROR] Failed to generate Prisma client." -ForegroundColor Red
    Write-Host ""
    Write-Host "Solution:" -ForegroundColor Yellow
    Write-Host "1. Check Prisma schema file" -ForegroundColor Yellow
    Write-Host "2. Check database connection" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Initialize database (only on first run)
Write-Host "[INFO] Checking database status..." -ForegroundColor Green
if (Test-Path "prisma\db\database.db") {
    Write-Host "[OK] Database already exists." -ForegroundColor Green
    Write-Host "[INFO] Using existing database." -ForegroundColor Green
} else {
    Write-Host "[INFO] Database does not exist." -ForegroundColor Green
    Write-Host "[INFO] Creating new database..." -ForegroundColor Green
    try {
        npx prisma db push
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Database created successfully." -ForegroundColor Green
        } else {
            throw "prisma db push failed"
        }
    } catch {
        Write-Host "[ERROR] Failed to create database." -ForegroundColor Red
        Write-Host ""
        Write-Host "Solution:" -ForegroundColor Yellow
        Write-Host "1. Check database connection settings" -ForegroundColor Yellow
        Write-Host "2. Check Prisma schema" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# Start development server
Write-Host "[INFO] Starting development server..." -ForegroundColor Green
Write-Host "[INFO] Browser will open automatically..." -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Development server started successfully!" -ForegroundColor Cyan
Write-Host "   Check http://localhost:3000 in your browser" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Open browser
Start-Process "http://localhost:3000"

# Start development server
npm run dev
