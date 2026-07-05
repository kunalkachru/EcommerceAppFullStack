# Oracle Cloud Infrastructure (OCI) — generic deploy guide

**Last updated:** 2026-07-03

Deploy the **Express API** (`server/`) on an OCI Compute VM. This guide is **generic** — use your own tenancy, IP, SSH keys, and repo URL. No instance-specific values are stored here.

**Recommended for this project:** [Railway](./RAILWAY_DEPLOY.md) (managed, CLIP-friendly RAM). Use OCI when you have adequate VM resources and want full control.

Related: [DEPLOYMENT.md](./DEPLOYMENT.md) · [CONFIGURATION.md](./CONFIGURATION.md)

---

## When OCI is a good fit

| VM RAM | Commerce (auth, cart, catalog) | CLIP / photo search | Notes |
|--------|-------------------------------|---------------------|--------|
| **≥ 4 GB** | ✅ | ✅ Recommended | Match Railway-style full demo |
| **2 GB** | ✅ | ⚠️ Possible with tuning + swap | Set `NODE_OPTIONS=--max-old-space-size=1536` |
| **~512 MB (E2.1.Micro)** | ⚠️ Barely | ❌ Not practical | `dnf` / `npm` often OOM; use `SKIP_CLIP_WARMUP=1` for experiments only |

Always add **2+ GB swap** on small shapes before `npm install`.

---

## Overview (two paths)

| Path | Best for |
|------|----------|
| **A — Bare metal (dnf + systemd + nginx)** | Traditional VM, step-by-step control |
| **B — Docker on OCI** | Reproducible deploy, easier upgrades |

Both expose port **80/443** via nginx (or OCI Load Balancer) proxying to Node **5001**.

Mobile app: point `config/cloud-api.json` at your public host, rebuild APK — see [APPETIZE_BROWSERSTACK.md](./APPETIZE_BROWSERSTACK.md).

---

## Prerequisites (any path)

1. OCI Compute instance — **Oracle Linux 9** or **Ubuntu 22.04+** recommended.
2. SSH access as `opc` (Oracle Linux) or `ubuntu` (Ubuntu image).
3. OCI **Security List / NSG** ingress: TCP **22**, **80**, **443** (and **5001** only if testing without nginx).
4. Generate secrets locally — **never commit** `server/.env`:

```bash
openssl rand -base64 48   # JWT_SECRET
```

---

## Path A — Bare metal (dnf, Node, systemd, nginx)

### A1 — SSH from your machine

```bash
chmod 600 /path/to/your-private-key.pem
ssh -i /path/to/your-private-key.pem opc@YOUR_PUBLIC_IP
```

Optional `~/.ssh/config`:

```
Host my-oci-api
    HostName YOUR_PUBLIC_IP
    User opc
    IdentityFile /path/to/your-private-key.pem
    IdentitiesOnly yes
```

### A2 — Sanity check

```bash
whoami && uname -a && free -h && swapon --show
```

### A3 — Swap (small VMs)

```bash
sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

### A4 — Packages (install in small batches on low-RAM VMs)

**Avoid** full `sudo dnf update -y` on memory-constrained instances — it can freeze the VM.

Oracle Linux 9:

```bash
sudo dnf install -y git make gcc-c++
sudo dnf install -y nginx firewalld
sudo dnf install -y vips-devel

curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs
node -v && npm -v
```

Ubuntu equivalent:

```bash
sudo apt-get update
sudo apt-get install -y git build-essential nginx libvips-dev
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
```

### A5 — Firewall (Oracle Linux + firewalld)

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### A6 — Clone and install

```bash
sudo mkdir -p /opt/ecommerce
sudo chown "$USER:$USER" /opt/ecommerce
git clone https://github.com/YOUR_ORG/YOUR_REPO.git /opt/ecommerce
cd /opt/ecommerce/server
npm install
```

Replace the git URL with **your fork** or private repo (use deploy keys or HTTPS token as needed).

### A7 — Environment file

```bash
nano /opt/ecommerce/server/.env
chmod 600 /opt/ecommerce/server/.env
```

```env
PORT=5001
NODE_ENV=production
JWT_SECRET=YOUR_RANDOM_SECRET
SEARCH_RUNTIME=baseline
```

| Variable | Full demo (CLIP) | Commerce-only (low RAM) |
|----------|------------------|-------------------------|
| `SKIP_CLIP_WARMUP` | omit or `0` | `1` |

**Do not** set `OPENAI_API_KEY` on the server for public demos — users supply LLM keys in the mobile app ([CONFIGURATION.md](./CONFIGURATION.md)).

Optional index patch for `SKIP_CLIP_WARMUP` (if not already in code):

```bash
INDEX=/opt/ecommerce/server/src/index.js
grep -q SKIP_CLIP_WARMUP "$INDEX" || \
  sed -i 's/warmVisualSearchIndex();/if (process.env.SKIP_CLIP_WARMUP !== "1") warmVisualSearchIndex();/' "$INDEX"
```

### A8 — systemd

Adjust `NODE_OPTIONS` for RAM (384 for Micro, 1536–2048 for 2–4 GB):

```bash
sudo tee /etc/systemd/system/ecommerce-api.service > /dev/null <<'UNIT'
[Unit]
Description=EcommerceAppFullStack API
After=network.target

[Service]
Type=simple
User=opc
WorkingDirectory=/opt/ecommerce/server
EnvironmentFile=/opt/ecommerce/server/.env
Environment=NODE_OPTIONS=--max-old-space-size=2048
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=20

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now ecommerce-api
sudo systemctl status ecommerce-api
```

### A9 — nginx reverse proxy

Replace `YOUR_PUBLIC_IP_OR_DOMAIN`:

```bash
sudo tee /etc/nginx/conf.d/ecommerce-api.conf > /dev/null <<'NGINX'
server {
    listen 80;
    server_name YOUR_PUBLIC_IP_OR_DOMAIN;
    client_max_body_size 10M;
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
}
NGINX

sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
sudo setsebool -P httpd_can_network_connect 1 2>/dev/null || true
```

TLS: add Let’s Encrypt (`certbot`) or terminate TLS on OCI Load Balancer.

### A10 — Verify

On VM:

```bash
curl -s http://127.0.0.1:5001/health
curl -s http://127.0.0.1/health
journalctl -u ecommerce-api -n 30 --no-pager
```

From your laptop:

```bash
curl -s http://YOUR_PUBLIC_IP/health
curl -s http://YOUR_PUBLIC_IP/api/catalog/meta
```

### Automated script (optional)

Run **on the VM** (after cloning repo):

```bash
export PUBLIC_HOST=YOUR_PUBLIC_IP_OR_DOMAIN
export GIT_REPO=https://github.com/YOUR_ORG/YOUR_REPO.git
export SKIP_CLIP_WARMUP=0   # set 1 on very small VMs
bash /opt/ecommerce/scripts/deploy-oci-vm.sh
```

Or copy from laptop:

```bash
scp -i YOUR_KEY scripts/deploy-oci-vm.sh opc@YOUR_PUBLIC_IP:/tmp/
ssh -i YOUR_KEY opc@YOUR_PUBLIC_IP 'PUBLIC_HOST=YOUR_IP GIT_REPO=... bash /tmp/deploy-oci-vm.sh'
```

---

## Path B — Docker on OCI

### B1 — Install Docker on the VM

Oracle Linux 9:

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
# log out and back in
```

### B2 — Build and run (from repo root on VM or CI)

```bash
cd /opt/ecommerce/server
docker build -t ecommerce-api:latest .
docker run -d --name ecommerce-api \
  -p 5001:5001 \
  -e NODE_ENV=production \
  -e JWT_SECRET=YOUR_RANDOM_SECRET \
  -e SEARCH_RUNTIME=baseline \
  --restart unless-stopped \
  ecommerce-api:latest
```

Put nginx in front (same as A9) or map `-p 80:5001` for quick tests only.

### B3 — Docker Compose (optional)

Create `server/docker-compose.yml` locally (not required for Railway):

```yaml
services:
  api:
    build: .
    ports:
      - "5001:5001"
    env_file: .env
    restart unless-stopped
```

```bash
cd server && docker compose up -d --build
```

**RAM:** allocate enough for CLIP model load (~1–2 GB working set). Prefer **≥ 4 GB** VM for Docker + CLIP.

---

## OCI networking checklist

| Layer | Rule |
|-------|------|
| Security List / NSG | TCP 22, 80, 443 from your audience (or `0.0.0.0/0` for public demo) |
| OS firewall | `http`, `https`, `ssh` allowed |
| SELinux (Oracle Linux) | `httpd_can_network_connect` if nginx → Node |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Killed` during `dnf` / `npm` | OOM | Add swap; use larger shape; install one package at a time |
| SSH timeout after heavy job | Swap thrashing | Reboot from OCI Console; avoid full OS update on Micro |
| `/health` OK locally, fails externally | Security List | Open port 80 in OCI portal |
| CLIP never loads | Low RAM | Upgrade VM or `SKIP_CLIP_WARMUP=1` |
| API 401 on login | Fresh deploy | Register user or use test flow from [CLOUD_REGRESSION.md](./CLOUD_REGRESSION.md) |

---

## Feature matrix by RAM

| Feature | ≥ 4 GB | ~512 MB Micro |
|---------|--------|---------------|
| Auth, cart, orders | ✅ | ✅ (with swap) |
| Catalog | ✅ | ✅ |
| Rule-based text search | ✅ | ✅ |
| CLIP / photo search | ✅ | ❌ |
| Live LLM (user keys in app) | ✅ | ✅ (if API stays up) |

---

## Tear-down (when you delete the VM)

1. OCI Console → Compute → Instances → **Terminate**.
2. Release attached block volumes / elastic IPs if any.
3. Remove Security List rules if dedicated to this instance only.

No repo changes required — this guide stays generic for the next operator.
