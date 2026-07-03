# OCI Micro Deploy Runbook (debug reference)

**Instance:** `instance-20260703-1335`  
**Region:** `eu-frankfurt-1`  
**Public IP:** `141.147.34.18`  
**Shape:** `VM.Standard.E2.1.Micro` (~498 Mi RAM visible to guest)  
**OS:** Oracle Linux 9.7  
**SSH user:** `opc`  
**Private key (Mac):** `~/Downloads/ssh-key-2026-07-03_latest.key`

This document lists **every command** used from first SSH through full API deploy, so you can replay or debug step-by-step.

---

## Phase 0 — Local Mac (SSH access)

### Fix key permissions

```bash
chmod 600 ~/Downloads/ssh-key-2026-07-03_latest.key
chmod 644 ~/Downloads/ssh-key-2026-07-03.key_latest.pub
```

**Note:** Private key filename is `ssh-key-2026-07-03_latest.key` (includes `.key`).  
Wrong path (`ssh-key-2026-07-03_latest` without extension) causes `Permission denied`.

### Connect

```bash
ssh -i ~/Downloads/ssh-key-2026-07-03_latest.key opc@141.147.34.18
```

### Optional SSH config (`~/.ssh/config`)

```
Host oci-ecommerce
    HostName 141.147.34.18
    User opc
    IdentityFile ~/Downloads/ssh-key-2026-07-03_latest.key
    IdentitiesOnly yes
```

### Find the right key among many (if unsure)

```bash
for k in ~/Downloads/*.key; do
  echo "Trying $k"
  ssh -i "$k" -o ConnectTimeout=8 -o BatchMode=yes -o StrictHostKeyChecking=no opc@141.147.34.18 echo OK && echo ">>> USE: $k" && break
done
```

---

## Phase 1 — VM sanity (first login)

```bash
whoami
free -h
uname -a
swapon --show
```

**Expected after swap setup:**

- `Mem: ~498Mi total`
- `Swap: ~2.5Gi total` (497 Mi default + 2 Gi `/swapfile2`)

---

## Phase 2 — Add swap (required on Micro)

**Do this before `npm install` / CLIP / heavy `dnf`.**

```bash
sudo dd if=/dev/zero of=/swapfile2 bs=1M count=2048
sudo chmod 600 /swapfile2
sudo mkswap /swapfile2
sudo swapon /swapfile2
echo '/swapfile2 none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

Swap persists across reboot via `/etc/fstab`.

---

## Phase 3 — Packages (DO NOT run full OS update)

### ❌ Avoid on Micro (caused SSH freeze / disconnect)

```bash
sudo dnf update -y   # DO NOT RUN on E2.1.Micro
```

### ✅ Install only what the API needs (one group at a time)

```bash
sudo dnf install -y git make gcc-c++
sudo dnf install -y nginx firewalld
sudo dnf install -y vips-devel
```

### Node.js 22

```bash
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo dnf install -y nodejs
node -v
npm -v
```

### VM firewall

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## Phase 4 — OCI Console (Security List)

**Must allow traffic to the VM** (Console → Instance → Primary VNIC → Subnet → Security list → Ingress):

| Source       | Protocol | Port |
|--------------|----------|------|
| `0.0.0.0/0`  | TCP      | 22   |
| `0.0.0.0/0`  | TCP      | 80   |
| `0.0.0.0/0`  | TCP      | 443  |

If SSH times out but port 22 is open, the VM may be swap-thrashing — **reboot** from Console.

---

## Phase 5 — Clone app

```bash
sudo mkdir -p /opt/ecommerce
sudo chown opc:opc /opt/ecommerce
cd /opt/ecommerce
git clone https://github.com/kunalkachru/EcommerceAppFullStack.git .
cd server
npm install
```

`npm install` may take 5–15 minutes on Micro.

---

## Phase 6 — Micro-safe env (skip CLIP warm-up)

Create `/opt/ecommerce/server/.env`:

```bash
openssl rand -base64 48   # paste output as JWT_SECRET
nano /opt/ecommerce/server/.env
```

```env
PORT=5001
NODE_ENV=production
JWT_SECRET=PASTE_RANDOM_SECRET_HERE
SEARCH_RUNTIME=baseline
SKIP_CLIP_WARMUP=1
```

Patch startup so CLIP does not load on boot (Micro OOM prevention):

```bash
INDEX=/opt/ecommerce/server/src/index.js
grep -q SKIP_CLIP_WARMUP "$INDEX" || \
  sed -i 's/warmVisualSearchIndex();/if (process.env.SKIP_CLIP_WARMUP !== "1") warmVisualSearchIndex();/' "$INDEX"
```

---

## Phase 7 — systemd service

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
Environment=NODE_OPTIONS=--max-old-space-size=384
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=20

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable ecommerce-api
sudo systemctl start ecommerce-api
sudo systemctl status ecommerce-api
```

---

## Phase 8 — nginx reverse proxy

```bash
sudo tee /etc/nginx/conf.d/ecommerce-api.conf > /dev/null <<'NGINX'
server {
    listen 80;
    server_name 141.147.34.18;
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
sudo setsebool -P httpd_can_network_connect 1
```

---

## Phase 9 — Verify

### On the VM

```bash
curl -s http://127.0.0.1:5001/health
curl -s http://127.0.0.1:5001/api/catalog/meta
curl -s http://127.0.0.1/health
journalctl -u ecommerce-api -n 30 --no-pager
free -h
```

### From your Mac

```bash
curl -s http://141.147.34.18/health
curl -s http://141.147.34.18/api/catalog/meta
```

### Register test user

```bash
curl -s -X POST http://141.147.34.18/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"secret123"}'
```

---

## Phase 10 — One-shot deploy script (remote)

Copy `scripts/deploy-oci-micro.sh` to the VM and run in background:

```bash
# From Mac
scp -i ~/Downloads/ssh-key-2026-07-03_latest.key \
  scripts/deploy-oci-micro.sh opc@141.147.34.18:/tmp/

# On VM
chmod +x /tmp/deploy-oci-micro.sh
nohup /tmp/deploy-oci-micro.sh > /tmp/deploy.log 2>&1 &
tail -f /tmp/deploy.log
```

---

## Troubleshooting

### SSH `Permission denied (publickey)`

- Use `ssh-key-2026-07-03_latest.key` (with `.key` extension)
- `chmod 600` on private key

### SSH `Connection reset` / `banner exchange timeout`

- Usually VM overloaded (`dnf update` or CLIP on 498 Mi RAM)
- OCI Console → **More actions → Reboot** → wait 3–5 min
- Do **not** run `sudo dnf update -y` again

### SSH `Connection refused` right after reboot

- Wait 2–5 minutes for sshd to start

### `Killed` during `npm start` or API boot

- Confirm `SKIP_CLIP_WARMUP=1` in `.env`
- Confirm index.js patch applied
- Check swap: `free -h` should show ~2.5 Gi swap

### `curl` works on VM but not from Mac

- OCI Security List: open TCP **80**
- `sudo firewall-cmd --list-services` should include `http`

### Check stuck `dnf`

```bash
ps aux | grep dnf
sudo rm -f /var/run/dnf.pid   # only if no dnf process running
```

### API logs

```bash
journalctl -u ecommerce-api -f
```

### Restart API

```bash
sudo systemctl restart ecommerce-api
```

---

## OCI CLI (optional — not configured yet)

`oci` CLI was **not** installed on the dev Mac at deploy time. To manage Security Lists from terminal later:

1. Install: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm
2. `oci setup config` (tenancy OCID, user OCID, region `eu-frankfurt-1`, API key)
3. Then ingress rules can be added via `oci network security-list update`

Until then, Security List changes are done in the **OCI web portal**.

---

## What works on Micro vs not

| Feature              | Micro cloud |
|----------------------|-------------|
| Auth, cart, orders   | ✅          |
| Catalog              | ✅          |
| Text search (rules)  | ✅          |
| CLIP / photo search  | ❌ (use local emulator) |

---

## Agent / automation SSH (from project Mac)

```bash
ssh -i "/Users/kunalkachru/Downloads/ssh-key-2026-07-03_latest.key" \
  -o BatchMode=yes opc@141.147.34.18 'command here'
```
