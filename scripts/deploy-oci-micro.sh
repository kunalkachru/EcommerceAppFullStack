#!/usr/bin/env bash
# OCI E2.1.Micro deploy — Oracle Linux 9. No dnf update. Skips CLIP warm-up.
set -euo pipefail

PUBLIC_IP="${PUBLIC_IP:-141.147.34.18}"
APP_DIR="/opt/ecommerce"
LOG_PREFIX="[deploy-oci-micro]"

log() { echo "${LOG_PREFIX} $*"; }

log "=== wait for other dnf (max 30 min) ==="
for i in $(seq 1 180); do
  if pgrep -f '/bin/dnf' >/dev/null 2>&1; then
    [ $((i % 6)) -eq 0 ] && log "dnf still running..."
    sleep 10
  else
    break
  fi
done

log "=== packages ==="
sudo dnf install -y git make gcc-c++
sudo dnf install -y nginx firewalld
sudo dnf install -y vips-devel

log "=== nodejs 22 ==="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
  sudo dnf install -y nodejs
fi
node -v
npm -v

log "=== firewall ==="
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

log "=== clone ==="
sudo mkdir -p "$APP_DIR"
sudo chown opc:opc "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone https://github.com/kunalkachru/EcommerceAppFullStack.git "$APP_DIR"
fi

log "=== skip CLIP warm-up ==="
INDEX="$APP_DIR/server/src/index.js"
grep -q 'SKIP_CLIP_WARMUP' "$INDEX" || \
  sed -i 's/warmVisualSearchIndex();/if (process.env.SKIP_CLIP_WARMUP !== "1") warmVisualSearchIndex();/' "$INDEX"

log "=== npm install ==="
cd "$APP_DIR/server"
npm install

log "=== .env ==="
if [ ! -f .env ]; then
  SECRET=$(openssl rand -base64 48)
  cat > .env <<EOF
PORT=5001
NODE_ENV=production
JWT_SECRET=${SECRET}
SEARCH_RUNTIME=baseline
SKIP_CLIP_WARMUP=1
EOF
  chmod 600 .env
fi

log "=== systemd ==="
sudo tee /etc/systemd/system/ecommerce-api.service > /dev/null <<'UNIT'
[Unit]
Description=EcommerceAppFullStack API
After=network.target

[Service]
Type=simple
User=opc
WorkingDirectory=/opt/ecommerce/server
EnvironmentFile=/opt/ecommerce/server/.env
Environment=NODE_OPTIONS=--max-old-space-size=384
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=20

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable ecommerce-api
sudo systemctl restart ecommerce-api
sleep 4

log "=== nginx ==="
sudo tee /etc/nginx/conf.d/ecommerce-api.conf > /dev/null <<NGINX
server {
    listen 80;
    server_name ${PUBLIC_IP};
    client_max_body_size 10M;
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 300s;
    }
}
NGINX

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
sudo setsebool -P httpd_can_network_connect 1 2>/dev/null || true

log "=== verify ==="
systemctl is-active ecommerce-api
curl -sf http://127.0.0.1:5001/health && echo
curl -sf http://127.0.0.1/health && echo
journalctl -u ecommerce-api -n 15 --no-pager
log "DONE"
