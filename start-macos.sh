#!/bin/bash

# EnguiStudio Server Start Script
# For macOS and Linux

echo ""
echo "========================================"
echo "   EnguiStudio Server Start"
echo "========================================"
echo ""

sleep 2

# Change to script directory
cd "$(dirname "$0")"

echo "[INFO] Current directory: $(pwd)"
echo ""

# Check Node.js installation
echo "[INFO] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo ""
    echo "Solution:"
    echo "1. Install Node.js from https://nodejs.org"
    echo "2. Or use a package manager like Homebrew: brew install node"
    echo ""
    exit 1
fi

echo "[OK] Node.js is installed."
echo ""

# Check AWS CLI installation
echo "[INFO] Checking AWS CLI installation..."
if ! command -v aws &> /dev/null; then
    echo "[WARNING] AWS CLI is not installed."
    echo ""
    echo "AWS CLI is required for S3 storage functionality."
    echo "[INFO] Installing AWS CLI automatically..."
    echo ""
    
    echo "[INFO] Checking Homebrew installation..."
    if ! command -v brew &> /dev/null; then
        echo "[INFO] Homebrew not found. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [ $? -ne 0 ]; then
            echo "[ERROR] Failed to install Homebrew."
            echo ""
            echo "Manual installation required:"
            echo "1. Install Homebrew from https://brew.sh"
            echo "2. Then install AWS CLI: brew install awscli"
            echo ""
            exit 1
        fi
        
        # Add Homebrew to PATH for current session
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f "/usr/local/bin/brew" ]]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
    
    echo "[INFO] Installing AWS CLI via Homebrew..."
    brew install awscli
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install AWS CLI via Homebrew."
        echo ""
        echo "Manual installation required:"
        echo "1. Install AWS CLI: brew install awscli"
        echo "2. Or download from: https://awscli.amazonaws.com/AWSCLIV2.pkg"
        echo ""
        exit 1
    fi
    
    echo "[INFO] AWS CLI installation completed."
    echo "[INFO] Please restart this script to continue."
    echo ""
    exit 0
else
    echo "[OK] AWS CLI is installed."
fi
echo ""

# Check FFmpeg installation
echo "[INFO] Checking FFmpeg installation..."
if ! command -v ffmpeg &> /dev/null; then
    echo "[WARNING] FFmpeg is not installed."
    echo ""
    echo "FFmpeg is required for video thumbnail generation."
    echo "[INFO] Installing FFmpeg automatically..."
    echo ""
    
    echo "[INFO] Checking Homebrew installation..."
    if ! command -v brew &> /dev/null; then
        echo "[INFO] Homebrew not found. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [ $? -ne 0 ]; then
            echo "[ERROR] Failed to install Homebrew."
            echo ""
            echo "Manual installation required:"
            echo "1. Install Homebrew from https://brew.sh"
            echo "2. Then install FFmpeg: brew install ffmpeg"
            echo ""
            exit 1
        fi
        
        # Add Homebrew to PATH for current session
        if [[ -f "/opt/homebrew/bin/brew" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        elif [[ -f "/usr/local/bin/brew" ]]; then
            eval "$(/usr/local/bin/brew shellenv)"
        fi
    fi
    
    echo "[INFO] Installing FFmpeg via Homebrew..."
    brew install ffmpeg
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install FFmpeg via Homebrew."
        echo ""
        echo "Manual installation required:"
        echo "1. Install FFmpeg: brew install ffmpeg"
        echo "2. Or download from: https://ffmpeg.org/download.html"
        echo ""
        exit 1
    fi
    
    echo "[INFO] FFmpeg installation completed."
    echo "[INFO] Please restart this script to continue."
    echo ""
    exit 0
else
    echo "[OK] FFmpeg is installed."
fi
echo ""

# Check dependencies installation
echo "[INFO] Checking dependencies installation..."
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies... (This may take time on first run)"
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies."
        echo ""
        echo "Solution:"
        echo "1. Check your internet connection"
        echo "2. Clear npm cache: npm cache clean --force"
        echo "3. Delete node_modules folder and try again"
        echo ""
        exit 1
    fi
    echo "[OK] Dependencies installed successfully."
else
    echo "[OK] Dependencies are already installed."
fi
echo ""

# Generate Prisma client
echo "[INFO] Generating Prisma client..."
npx prisma generate
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to generate Prisma client."
    echo ""
    echo "Solution:"
    echo "1. Check Prisma schema file"
    echo "2. Check database connection"
    echo ""
    exit 1
fi
echo "[OK] Prisma client generated successfully."
echo ""

# Database migration and initialization
echo "[INFO] Checking database status..."
if [ -f "prisma/db/database.db" ]; then
    echo "[OK] Database already exists."
    echo "[INFO] Checking for schema changes..."
    
    # Create backup before migration
    backup_path="prisma/db/database_backup_$(date +%Y%m%d_%H%M%S).db"
    echo "[INFO] Creating database backup: $backup_path"
    cp "prisma/db/database.db" "$backup_path"
    
    # Run migration to apply schema changes
    echo "[INFO] Running database migration..."
    npx prisma db push
    if [ $? -eq 0 ]; then
        echo "[OK] Database migration completed successfully."
        echo "[INFO] Backup saved at: $backup_path"
    else
        echo "[ERROR] Database migration failed."
        echo "[INFO] Restoring from backup..."
        cp "$backup_path" "prisma/db/database.db"
        echo ""
        echo "Solution:"
        echo "1. Check database connection settings"
        echo "2. Check Prisma schema for syntax errors"
        echo "3. Manual migration may be required"
        echo ""
        exit 1
    fi
else
    echo "[INFO] Database does not exist."
    echo "[INFO] Creating new database..."
    npx prisma db push
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create database."
        echo ""
        echo "Solution:"
        echo "1. Check database connection settings"
        echo "2. Check Prisma schema"
        echo ""
        exit 1
    fi
    echo "[OK] Database created successfully."
fi
echo ""

# Ask user to choose server mode
echo ""
echo "========================================"
echo "   Choose Server Mode"
echo "========================================"
echo ""
echo "1. Normal mode  - Standard logging with full debug info"
echo "2. Minimal mode - Reduced logging (only errors and essential info) [DEFAULT]"
echo ""
echo "Auto-starting in Minimal mode in 10 seconds..."
echo "Press 1 for Normal mode or 2 for Minimal mode to start immediately"

# Timer countdown and input handling with timeout
choice=""
timeout=10

# Simple countdown with input handling
for i in $(seq $timeout -1 1); do
    echo -ne "\rTime remaining: $i seconds..."

    # Read with 1 second timeout, non-blocking
    read -t 1 -n 1 input 2>/dev/null

    if [ $? -eq 0 ] && [ -n "$input" ]; then
        case $input in
            1)
                echo -ne "\rSelected: Normal mode                    "
                choice="1"
                break
                ;;
            2)
                echo -ne "\rSelected: Minimal mode                   "
                choice="2"
                break
                ;;
        esac
    fi
done

# If no choice made, default to Minimal mode
if [ -z "$choice" ]; then
    echo -ne "\rAuto-selected: Minimal mode (timeout)           "
    choice="2"
fi

echo ""

# Determine which npm script to run
case $choice in
    1)
        script_name="dev"
        mode_name="Normal"
        mode_desc="with standard logging"
        ;;
    *)
        script_name="dev:minimal"
        mode_name="Minimal"
        mode_desc="with reduced logging"
        ;;
esac

echo ""
echo "[INFO] Starting development server in $mode_name mode $mode_desc..."
echo "[INFO] Browser will open automatically..."
echo ""
echo "========================================"
echo "   Development server started successfully!"
echo "   Mode: $mode_name"
echo "   Check http://localhost:3000 in your browser"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Open browser (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
# Open browser (Linux)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000
fi

# Start development server with chosen mode
npm run $script_name
