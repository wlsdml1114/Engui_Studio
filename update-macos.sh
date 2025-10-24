#!/bin/bash

# EnguiStudio Project Update Script
# For macOS and Linux

echo ""
echo "========================================"
echo "   EnguiStudio Project Update"
echo "========================================"
echo ""
echo "This script will:"
echo "1. Pull latest changes from Git repository"
echo "2. Update dependencies"
echo "3. Generate Prisma client"
echo "4. Run database migration if needed"
echo ""

sleep 2

# Change to script directory
cd "$(dirname "$0")"

echo "[INFO] Current directory: $(pwd)"
echo ""

# Check if this is a Git repository
echo "[INFO] Checking Git repository..."
if [ ! -d ".git" ]; then
    echo "[ERROR] This is not a Git repository."
    echo ""
    echo "Solution:"
    echo "1. Make sure you're in the project root directory"
    echo "2. Or clone the repository first"
    echo ""
    exit 1
fi

# Check for uncommitted changes
echo "[INFO] Checking for uncommitted changes..."
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "[WARNING] You have uncommitted changes:"
    git status --porcelain
    echo ""
    echo "Options:"
    echo "1. Commit your changes first"
    echo "2. Stash your changes temporarily"
    echo "3. Continue update (may overwrite your changes)"
    echo ""

    read -p "Do you want to continue with update? (y/n): " continue_update
    if [ "$continue_update" != "y" ] && [ "$continue_update" != "Y" ]; then
        echo "[INFO] Update cancelled."
        exit 0
    fi
fi

echo "[OK] Git repository check passed."
echo ""

# Pull latest changes
echo "[INFO] Pulling latest changes from repository..."
if git pull origin main; then
    echo "[OK] Repository updated successfully."
else
    echo "[WARNING] Git pull had issues, but continuing..."
    echo "[INFO] You may need to resolve merge conflicts manually."
fi
echo ""

# Update dependencies
echo "[INFO] Updating dependencies..."
echo "[INFO] This may take a few minutes..."
if npm install; then
    echo "[OK] Dependencies updated successfully."
else
    echo "[ERROR] Failed to update dependencies."
    echo ""
    echo "Solution:"
    echo "1. Clear npm cache: npm cache clean --force"
    echo "2. Delete node_modules folder and try again"
    echo "3. Check your internet connection"
    echo ""
    exit 1
fi
echo ""

# Generate Prisma client
echo "[INFO] Generating Prisma client..."
if npx prisma generate; then
    echo "[OK] Prisma client generated successfully."
else
    echo "[ERROR] Failed to generate Prisma client."
    echo ""
    echo "Solution:"
    echo "1. Check Prisma schema file"
    echo "2. Check database connection"
    echo ""
    exit 1
fi
echo ""

# Check database schema changes
echo "[INFO] Checking for database schema changes..."
if npx prisma db push; then
    echo "[OK] Database is up to date."
else
    echo "[WARNING] Database push had issues, but schema may still be updated."
fi
echo ""

# Summary
echo ""
echo "========================================"
echo "   Project Update Complete!"
echo "========================================"
echo ""
echo "Updated components:"
echo "✓ Git repository"
echo "✓ Node.js dependencies"
echo "✓ Prisma client"
echo "✓ Database schema"
echo ""
echo "Your project is now up to date!"
echo "You can run ./start-macos.sh to start the development server."
echo ""
read -p "Press Enter to exit"