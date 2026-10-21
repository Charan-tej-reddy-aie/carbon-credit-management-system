#!/bin/bash
# ==============================================================================
# Fast Update Script for CarbonX on Azure VM
# Rebuilds Backend and Frontend without touching MySQL database data
# ==============================================================================

set -e

echo "=========================================================="
echo "🔄 Updating CarbonX on Azure VM"
echo "=========================================================="

# Navigate to project directory
if [ -d "$HOME/carbon-credit-management-system" ]; then
    cd "$HOME/carbon-credit-management-system"
else
    cd "$(dirname "$0")"
fi

# 1. Pull latest code from GitHub
echo "[1/2] Pulling latest code from GitHub repository..."
git pull origin main

# 2. Rebuild only Backend and Frontend containers
echo "[2/2] Rebuilding Backend API and Frontend Portal..."
sudo docker compose up -d --build backend frontend

echo "=========================================================="
echo "✅ AZURE VM UPDATED SUCCESSFULLY!"
echo "=========================================================="
sudo docker compose ps
echo "=========================================================="
