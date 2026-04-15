#!/bin/bash
# ============================================================
# deploy.sh — 1-click white-label deployment
# Run from bastion after server-init.sh has been executed.
#
# Usage:
#   ./infra/deploy.sh \
#     --server    89.167.50.68 \
#     --api-domain   api.clientdomain.com \
#     --crm-domain   crm.clientdomain.com \
#     --app-domain   app.clientdomain.com \
#     --brand-name   "ClientBrand" \
#     --admin-email  admin@clientdomain.com \
#     --admin-pass   <password> \
#     --db-name      client_db \
#     --db-user      client_user \
#     --db-pass      <db-password> \
#     --secret-key   <django-secret>
# ============================================================
set -e

# ── Parse arguments ──────────────────────────────────────────
SERVER="" ; API_DOMAIN="" ; CRM_DOMAIN="" ; APP_DOMAIN=""
BRAND_NAME="My Platform" ; ADMIN_EMAIL="" ; ADMIN_PASS=""
DB_NAME="wl_db" ; DB_USER="wl_user" ; DB_PASS=""
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")

while [[ $# -gt 0 ]]; do
  case $1 in
    --server)      SERVER="$2";      shift 2 ;;
    --api-domain)  API_DOMAIN="$2";  shift 2 ;;
    --crm-domain)  CRM_DOMAIN="$2";  shift 2 ;;
    --app-domain)  APP_DOMAIN="$2";  shift 2 ;;
    --brand-name)  BRAND_NAME="$2";  shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-pass)  ADMIN_PASS="$2";  shift 2 ;;
    --db-name)     DB_NAME="$2";     shift 2 ;;
    --db-user)     DB_USER="$2";     shift 2 ;;
    --db-pass)     DB_PASS="$2";     shift 2 ;;
    --secret-key)  SECRET_KEY="$2";  shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

[ -z "$SERVER" ] && echo "ERROR: --server required" && exit 1
[ -z "$API_DOMAIN" ] && echo "ERROR: --api-domain required" && exit 1
[ -z "$DB_PASS" ] && DB_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")

PARENT_DOMAIN=$(echo "$API_DOMAIN" | sed 's/^[^.]*\.//')
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "============================================="
echo "  Deploying: $BRAND_NAME"
echo "  Server:    $SERVER"
echo "  API:       $API_DOMAIN"
echo "  CRM:       $CRM_DOMAIN"
echo "  App:       $APP_DOMAIN"
echo "============================================="

SSH="ssh -i ~/.ssh/wefund-deploy root@$SERVER"

# ── Step 1: Sync API code ─────────────────────────────────────
echo "→ Syncing API..."
rsync -az -e "ssh -i ~/.ssh/wefund-deploy" \
  --exclude='__pycache__' --exclude='*.pyc' --exclude='.env' \
  "$REPO_DIR/api/" "root@$SERVER:/home/wl-api/app/src/"

# ── Step 2: Sync frontends ────────────────────────────────────
echo "→ Syncing frontends..."
rsync -az -e "ssh -i ~/.ssh/wefund-deploy" \
  --exclude='node_modules' --exclude='dist' --exclude='.env' \
  "$REPO_DIR/crm-frontend/" "root@$SERVER:/home/wl-crm/app/src/"
rsync -az -e "ssh -i ~/.ssh/wefund-deploy" \
  --exclude='node_modules' --exclude='dist' --exclude='.env' \
  "$REPO_DIR/client-frontend/" "root@$SERVER:/home/wl-app/app/src/"

# ── Step 3: Server-side setup ─────────────────────────────────
$SSH bash << ENDSSH
set -e

# Write .env for API
cat > /home/wl-api/app/src/.env << EOF
SECRET_KEY=$SECRET_KEY
DEBUG=False

ALLOWED_HOSTS_EXTRA=$API_DOMAIN
PARENT_HOST=$PARENT_DOMAIN
DEFAULT_HOST=api
MT5_SERVER_NAME=$BRAND_NAME

DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_HOST=localhost
DB_PORT=5432

CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
REDIS_CACHE_URL=redis://127.0.0.1:6379/1

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
DEFAULT_FROM_EMAIL=Support <support@$PARENT_DOMAIN>
SUPPORT_EMAIL_REPLY_DOMAIN=$PARENT_DOMAIN

WEBSITE_URL=https://$APP_DOMAIN
API_BASE_URL=https://$API_DOMAIN/api
MEET_URL=https://$APP_DOMAIN
EOF

# Write .env for frontends
echo "VITE_API_BASE_URL=https://$API_DOMAIN" > /home/wl-crm/app/src/.env
echo "VITE_API_BASE_URL=https://$API_DOMAIN" > /home/wl-app/app/src/.env
echo "VITE_JOURNAL_SHARE_BASE_URL=https://$APP_DOMAIN" >> /home/wl-app/app/src/.env

# Fix ownership
chown -R wl-api:wl-api /home/wl-api/
chown -R wl-crm:wl-crm /home/wl-crm/
chown -R wl-app:wl-app /home/wl-app/

# PostgreSQL setup
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true

# Python venv + dependencies
python3 -m venv /home/wl-api/app/venv
/home/wl-api/app/venv/bin/pip install --upgrade pip -q
/home/wl-api/app/venv/bin/pip install -r /home/wl-api/app/src/requirements.txt -q

# Django setup
cd /home/wl-api/app/src
chown -R wl-api:wl-api /home/wl-api/
mkdir -p static
sudo -u wl-api /home/wl-api/app/venv/bin/python manage.py migrate --noinput
sudo -u wl-api /home/wl-api/app/venv/bin/python manage.py collectstatic --noinput -v 0

# Build frontends
cd /home/wl-crm/app/src && sudo -u wl-crm npm install --silent && sudo -u wl-crm npm run build
mkdir -p /home/wl-crm/htdocs/$CRM_DOMAIN
cp -r dist/* /home/wl-crm/htdocs/$CRM_DOMAIN/
chown -R wl-crm:wl-crm /home/wl-crm/htdocs/
# Allow nginx (www-data) to read htdocs
chmod o+rx /home/wl-crm /home/wl-crm/htdocs
find /home/wl-crm/htdocs -type d -exec chmod o+rx {} \;
find /home/wl-crm/htdocs -type f -exec chmod o+r {} \;

cd /home/wl-app/app/src && sudo -u wl-app npm install --silent && sudo -u wl-app npm run build
mkdir -p /home/wl-app/htdocs/$APP_DOMAIN
cp -r dist/* /home/wl-app/htdocs/$APP_DOMAIN/
chown -R wl-app:wl-app /home/wl-app/htdocs/
# Allow nginx (www-data) to read htdocs
chmod o+rx /home/wl-app /home/wl-app/htdocs
find /home/wl-app/htdocs -type d -exec chmod o+rx {} \;
find /home/wl-app/htdocs -type f -exec chmod o+r {} \;

ENDSSH

# ── Step 4: Nginx configs ─────────────────────────────────────
echo "→ Configuring Nginx..."
$SSH bash << ENDSSH
cat > /etc/nginx/sites-available/$API_DOMAIN << 'NGINXEOF'
server {
    listen 80;
    server_name API_DOMAIN_PLACEHOLDER;
    client_max_body_size 50M;
    location /static/ { alias /home/wl-api/app/src/staticfiles/; }
    location /media/  { alias /home/wl-api/app/src/media/; }
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGINXEOF
sed -i "s/API_DOMAIN_PLACEHOLDER/$API_DOMAIN/" /etc/nginx/sites-available/$API_DOMAIN

cat > /etc/nginx/sites-available/$CRM_DOMAIN << 'NGINXEOF'
server {
    listen 80;
    server_name CRM_DOMAIN_PLACEHOLDER;
    root /home/wl-crm/htdocs/CRM_DOMAIN_PLACEHOLDER;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
}
NGINXEOF
sed -i "s/CRM_DOMAIN_PLACEHOLDER/$CRM_DOMAIN/g" /etc/nginx/sites-available/$CRM_DOMAIN

cat > /etc/nginx/sites-available/$APP_DOMAIN << 'NGINXEOF'
server {
    listen 80;
    server_name APP_DOMAIN_PLACEHOLDER;
    root /home/wl-app/htdocs/APP_DOMAIN_PLACEHOLDER;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
}
NGINXEOF
sed -i "s/APP_DOMAIN_PLACEHOLDER/$APP_DOMAIN/g" /etc/nginx/sites-available/$APP_DOMAIN

ln -sf /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/$CRM_DOMAIN /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/$APP_DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
ENDSSH

# ── Step 5: Supervisor configs ────────────────────────────────
echo "→ Configuring Supervisor..."
$SSH bash << 'ENDSSH'
cat > /etc/supervisor/conf.d/wl-api.conf << 'EOF'
[program:wl-api]
command=/home/wl-api/app/venv/bin/gunicorn backend.wsgi:application --bind 127.0.0.1:8000 --workers 3 --threads 2 --timeout 120
directory=/home/wl-api/app/src
user=wl-api
autostart=true
autorestart=true
stdout_logfile=/home/wl-api/logs/gunicorn.log
stderr_logfile=/home/wl-api/logs/gunicorn.err
environment=PYTHONUNBUFFERED=1

[program:wl-celery-worker]
command=/home/wl-api/app/venv/bin/celery -A backend worker --loglevel=info -Q celery,default,trades,risk
directory=/home/wl-api/app/src
user=wl-api
autostart=true
autorestart=true
stdout_logfile=/home/wl-api/logs/celery-worker.log
stderr_logfile=/home/wl-api/logs/celery-worker.err
environment=PYTHONUNBUFFERED=1

[program:wl-celery-beat]
command=/home/wl-api/app/venv/bin/celery -A backend beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
directory=/home/wl-api/app/src
user=wl-api
autostart=true
autorestart=true
stdout_logfile=/home/wl-api/logs/celery-beat.log
stderr_logfile=/home/wl-api/logs/celery-beat.err
environment=PYTHONUNBUFFERED=1
EOF
mkdir -p /home/wl-api/logs
chown -R wl-api:wl-api /home/wl-api/logs
supervisorctl reread && supervisorctl update
ENDSSH

echo "→ Starting services..."
$SSH "supervisorctl start wl-api wl-celery-worker wl-celery-beat 2>/dev/null; sleep 3; supervisorctl status"

echo "============================================="
echo "✓ Deployment complete!"
echo ""
echo "  API:       http://$API_DOMAIN/api/health/"
echo "  CRM:       http://$CRM_DOMAIN"
echo "  Dashboard: http://$APP_DOMAIN"
echo ""
echo "  Run certbot once DNS is pointed to $SERVER:"
echo "  certbot --nginx -d $API_DOMAIN -d $CRM_DOMAIN -d $APP_DOMAIN"
echo "============================================="
