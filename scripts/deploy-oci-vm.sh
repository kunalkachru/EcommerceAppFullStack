#!/usr/bin/env bash
# Generic OCI VM deploy — run ON the VM (Oracle Linux 9) or via SSH.
# No instance-specific defaults. Set env vars before running.
#
# Example:
#   export PUBLIC_HOST=api.example.com
#   export GIT_REPO=https://github.com/your-org/EcommerceAppFullStack.git
#   export SKIP_CLIP_WARMUP=0
#   bash scripts/deploy-oci-vm.sh
set -euo pipefail

PUBLIC_HOST="${PUBLIC_HOST:?Set PUBLIC_HOST to your public IP or domain}"
GIT_REPO="${GIT_REPO:-https://github.com/kunalkachru/EcommerceAppFullStack.git}"
APP_DIR="${APP_DIR:-/opt/ecommerce}"
DEPLOY_USER="${DEPLOY_USER:-opc}"
SKIP_CLIP="${SKIP_CLIP_WARMUP:-0}"
NODE_HEAP_MB="${NODE_HEAP_MB:-2048}"
LOG_PREFIX="[deploy-oci-vm]"

log() { echo "${LOG_PREFIX} $*"; }

wait_dnf() {
  for i in $(seq 1 120); do
    pgrep -f '/bin/dnf' >/dev/null || return 0
    [ $((i % 6)) -eq 0 ] && log "waiting for dnf..."
    sleep 10
  done
  log "WARN: dnf still running after 20min"
}

install_one() {
  local pkg="$1"
  if rpm -q "$pkg" >/dev/null 2>&1; then
    log "skip $pkg (installed)"
    return 0
  fi
  wait_dnf
  log "install $pkg"
  sudo dnf install -y "$pkg"
}

log "=== packages ==="
free -h
install_one git
install_one make
install_one gcc-c++
install_one nginx
install_one firewalld
install_one vips-devel

log "=== nodejs 22 ==="
if ! command -v node >/dev/null 2>&1; then
  wait_dnf
  curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
  install_one nodejs
fi
node -v
npm -v

log "=== firewall ==="
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

log "=== clone $GIT_REPO ==="
sudo mkdir -p "$APP_DIR"
sudo chown "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$GIT_REPO" "$APP_DIR"
fi

INDEX="$APP_DIR/server/src/index.js"
grep -q SKIP_CLIP_WARMUP "$INDEX" || \
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
SKIP_CLIP_WARMUP=${SKIP_CLIP}
EOF
  chmod 600 .env
fi

log "=== systemd ==="
sudo tee /etc/systemd/system/ecommerce-api.service > /dev/null <<UNIT
[Unit]
Description=EcommerceAppFullStack API
After=network.target

[Service]
Type=simple
User=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}/server
EnvironmentFile=${APP_DIR}/server/.env
Environment=NODE_OPTIONS=--max-old-space-size=${NODE_HEAP_MB}
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
    server_name ${PUBLIC_HOST};
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
curl -sf http://127.0.0.1:5001/health && echo
curl -sf http://127.0.0.1/health && echo
systemctl is-active ecommerce-api
journalctl -u ecommerce-api -n 10 --no-pager
log "DONE — public: http://${PUBLIC_HOST}/health"
