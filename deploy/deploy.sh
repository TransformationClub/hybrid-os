#!/bin/bash
set -euo pipefail

# Hybrid OS - Deployment Script
# Usage: ./deploy/deploy.sh [rollback]

APP_DIR="/var/www/hybrid-os"
LOG_PREFIX="[deploy]"

cd "$APP_DIR"

# Rollback mode
if [ "${1:-}" = "rollback" ]; then
    if [ -d ".next.prev" ]; then
        echo "$LOG_PREFIX Rolling back to previous build..."
        rm -rf .next
        mv .next.prev .next
        pm2 reload hybrid-os
        echo "$LOG_PREFIX Rollback complete."
    else
        echo "$LOG_PREFIX No previous build found. Cannot rollback."
        exit 1
    fi
    exit 0
fi

echo "$LOG_PREFIX Starting deployment..."

# Pull latest code
echo "$LOG_PREFIX Pulling latest code..."
git pull origin main

# Install dependencies
echo "$LOG_PREFIX Installing dependencies..."
npm ci --omit=dev

# Backup current build for rollback
if [ -d ".next" ]; then
    echo "$LOG_PREFIX Backing up current build..."
    rm -rf .next.prev
    mv .next .next.prev
fi

# Build
echo "$LOG_PREFIX Building..."
npm run build

# Reload PM2 (zero-downtime)
echo "$LOG_PREFIX Reloading app..."
pm2 reload hybrid-os

# Verify health
echo "$LOG_PREFIX Checking health..."
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health || true)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "$LOG_PREFIX Health check passed. Deployment successful!"
else
    echo "$LOG_PREFIX Health check failed (HTTP $HTTP_STATUS). Rolling back..."
    if [ -d ".next.prev" ]; then
        rm -rf .next
        mv .next.prev .next
        pm2 reload hybrid-os
        echo "$LOG_PREFIX Rolled back to previous build."
    fi
    exit 1
fi

# Cleanup old backup after successful deploy
# Keep .next.prev around for manual rollback if needed

echo "$LOG_PREFIX Done."
