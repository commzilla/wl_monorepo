#!/bin/bash
# Beta Dashboard Deployment Script
# Run this from the wefund-frontend project root

set -e

# ---- CONFIGURATION ----
SERVER_USER="root"
SERVER_HOST="49.13.89.241"
REMOTE_PATH="/var/www/beta-dashboard"
# ------------------------

echo "==> Building project..."
npm run build

echo "==> Creating remote directory..."
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${REMOTE_PATH}"

echo "==> Uploading dist folder..."
rsync -avz --delete dist/ ${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}/dist/

echo "==> Uploading nginx config..."
scp beta-deploy/nginx-beta.conf ${SERVER_USER}@${SERVER_HOST}:/etc/nginx/sites-enabled/beta-dashboard.conf

echo "==> Testing & reloading nginx..."
ssh ${SERVER_USER}@${SERVER_HOST} "nginx -t && systemctl reload nginx"

echo ""
echo "==> Done! Beta deployed to https://beta-dashboard.we-fund.com"
