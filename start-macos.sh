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

# Initialize database (only on first run)
echo "[INFO] Checking database status..."
if [ -f "prisma/db/database.db" ]; then
    echo "[OK] Database already exists."
    echo "[INFO] Using existing database."
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

# Start development server
echo "[INFO] Starting development server..."
echo "[INFO] Browser will open automatically..."
echo ""
echo "========================================"
echo "   Development server started successfully!"
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

# Start development server
npm run dev
