#!/bin/bash
# ============================================================
# server-init.sh — Run once on a fresh Ubuntu 22.04/24.04 server
# Sets up all system dependencies for a white-label instance
# Usage: bash server-init.sh
# ============================================================
set -e

echo "=== Updating apt ==="
apt-get update -qq

echo "=== Installing system packages ==="
apt-get install -y \
  nginx postgresql postgresql-contrib redis-server supervisor \
  python3-venv python3-pip git certbot python3-certbot-nginx \
  curl unzip libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b

echo "=== Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== Creating OS users ==="
id wl-api &>/dev/null || useradd -m -s /bin/bash wl-api
id wl-crm &>/dev/null || useradd -m -s /bin/bash wl-crm
id wl-app &>/dev/null || useradd -m -s /bin/bash wl-app

echo "=== Creating directory structure ==="
mkdir -p /home/wl-api/{app/src,app/venv,logs}
mkdir -p /home/wl-crm/{app/src,logs}
mkdir -p /home/wl-app/{app/src,logs}

chown -R wl-api:wl-api /home/wl-api
chown -R wl-crm:wl-crm /home/wl-crm
chown -R wl-app:wl-app /home/wl-app

echo "=== Starting services ==="
systemctl enable redis-server nginx supervisor postgresql
systemctl start redis-server postgresql

echo "================================="
echo "✓ Server init complete"
echo "  Node:       $(node --version)"
echo "  PostgreSQL: $(psql --version)"
echo "  Nginx:      $(nginx -v 2>&1)"
echo "  Python:     $(python3 --version)"
echo "================================="
