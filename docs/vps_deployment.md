# VPS Deployment Guide — Ubuntu (16 GB RAM / 128 GB SSD)

Complete step-by-step guide to deploy PsyicHub on a bare Ubuntu VPS
with Ollama + Airavata as the LLM runtime.

> **Target spec:** Ubuntu 22.04 LTS, 16 GB RAM, 128 GB SSD

---

## Table of Contents

1. [Initial Server Setup](#1-initial-server-setup)
2. [Install System Dependencies](#2-install-system-dependencies)
3. [Install Ollama + LLM Models](#3-install-ollama--llm-models)
4. [Deploy the Backend](#4-deploy-the-backend)
5. [Deploy the Frontend](#5-deploy-the-frontend)
6. [Set Up Nginx Reverse Proxy](#6-set-up-nginx-reverse-proxy)
7. [SSL with Let's Encrypt](#7-ssl-with-lets-encrypt)
8. [Create systemd Services](#8-create-systemd-services)
9. [Firewall Configuration](#9-firewall-configuration)
10. [Monitoring & Maintenance](#10-monitoring--maintenance)
11. [Local Development Workflow](#11-local-development-workflow)

---

## 1. Initial Server Setup

### SSH into your VPS

```bash
ssh root@YOUR_VPS_IP
```

### Create a deploy user (don't run the app as root)

```bash
adduser psyichub
usermod -aG sudo psyichub
```

### Set up SSH key authentication (from your local machine)

```bash
# On your local machine
ssh-copy-id psyichub@YOUR_VPS_IP
```

### Switch to the deploy user

```bash
su - psyichub
```

### Update the system

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget build-essential software-properties-common rsync
```

---

## 2. Install System Dependencies

### Python 3.10

```bash
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.10 python3.10-venv python3.10-dev python3-pip
```

Verify:

```bash
python3.10 --version
# Python 3.10.x
```

### Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify:

```bash
node --version && npm --version
```

### Tesseract OCR + Poppler (PDF processing)

```bash
sudo apt install -y tesseract-ocr poppler-utils
```

---

## 3. Install Ollama + LLM Models

### Install Ollama

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Pull LLM Models

```bash
# Primary & fallback model (Airavata — used for clinical humanization and RAG reasoning)
ollama pull hf.co/therandomuser03/Airavata-Q4_K_M-GGUF:Q4_K_M

# Vision model (used for TAT card auto-annotation)
ollama pull llava:7b
```

> **Storage note:** Airavata Q4_K_M is ~4 GB, LLaVA 7B is ~4.1 GB.
> With 128 GB SSD you have plenty of room. At runtime Airavata uses ~5-6 GB RAM,
> leaving ~10 GB for the NLP engines.

### Verify Ollama is running

```bash
ollama list
# Should show the Airavata and llava models
```

### Make Ollama start on boot

Ollama installs its own systemd service automatically. Verify:

```bash
sudo systemctl status ollama
# Should show "active (running)"
```

If it's not enabled:

```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

### Configure Ollama to listen on localhost only (security)

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf > /dev/null <<EOF
[Service]
Environment="OLLAMA_HOST=127.0.0.1:11434"
EOF

sudo systemctl daemon-reload
sudo systemctl restart ollama
```

---

## 4. Deploy the Backend

### Transfer project files to the server

From your local machine, copy the project to the VPS using `rsync` or `scp`:

```bash
# Using rsync (recommended — skips .git, venv, __pycache__ automatically)
rsync -av --exclude='.git' --exclude='backend/venv' --exclude='**/__pycache__' \
  /path/to/PsyicHub/ psyichub@YOUR_VPS_IP:/home/psyichub/PsyicHub/

# Or using scp (simple, slower)
scp -r /path/to/PsyicHub psyichub@YOUR_VPS_IP:/home/psyichub/
```

### Create virtual environment

```bash
cd /home/psyichub/PsyicHub/backend
python3.10 -m venv venv
source venv/bin/activate
```

### Install Python dependencies

```bash
pip install --upgrade pip

# Install PyTorch CPU (saves ~1.5 GB vs GPU version on a CPU-only VPS)
pip install torch==2.2.2 torchvision==0.17.2 torchaudio==2.2.2 \
  --extra-index-url https://download.pytorch.org/whl/cpu

# Install remaining deps
pip install --no-cache-dir -r requirements.txt

# spaCy model
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.7.1/en_core_web_lg-3.7.1-py3-none-any.whl

# NLTK data (downloads all required corpora)
python scripts/download_nltk.py
```

### Create the environment file

```bash
cp /home/psyichub/PsyicHub/backend/.env.example /home/psyichub/PsyicHub/backend/.env
```

Edit `/home/psyichub/PsyicHub/backend/.env` and fill in all required values — see `docs/config.md` for the full reference. At minimum set:

```env
DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:5432/psyichub
OLLAMA_BASE_URL=http://127.0.0.1:11434
USE_GPU=false
CT_SECRET_KEY=<generate a strong random key>
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Seed the database

```bash
cd /home/psyichub/PsyicHub/backend
source venv/bin/activate

# Apply schema
python scripts/verify_db.py

# Seed initial pricing data
python scripts/seed_db.py

# Create super admin (run SUPERADMIN.sql in pgAdmin or psql)
# psql -U DB_USER -d psyichub -f /home/psyichub/PsyicHub/SUPERADMIN.sql
```

### Test that the backend starts

```bash
cd /home/psyichub/PsyicHub/backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Wait for "Application startup complete", then `Ctrl+C` to stop.

> **Note:** The `data_store/` directory (uploads, reports, sessions, audio_temp)
> is auto-created on first startup by the backend. No manual directory creation is needed.

---

## 5. Deploy the Frontend

### Build the production frontend

```bash
cd /home/psyichub/PsyicHub/frontend
npm ci

# Create production env
cat > .env.production <<EOF
VITE_API_BASE_URL=https://yourdomain.com/api
EOF

npm run build
```

This creates a `dist/` folder with the static production build.

---

## 6. Set Up Nginx Reverse Proxy

Nginx serves the frontend static files and proxies `/api` requests to the backend.

### Install Nginx

```bash
sudo apt install -y nginx
```

### Create the site configuration

```bash
sudo tee /etc/nginx/sites-available/psyichub > /dev/null <<'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # ── Frontend (static files) ──────────────────────────────────
    root /home/psyichub/PsyicHub/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Backend API proxy ────────────────────────────────────────
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Long timeouts for ML inference (can take 30-60s)
        proxy_read_timeout 120s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 120s;

        # Large response bodies (PDF reports, audio uploads)
        client_max_body_size 50M;
    }

    # ── Serve generated PDFs ─────────────────────────────────────
    location /api/reports/pdf/ {
        proxy_pass http://127.0.0.1:8000/api/reports/pdf/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # ── Security headers ─────────────────────────────────────────
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;
}
EOF
```

### Enable the site

```bash
sudo ln -sf /etc/nginx/sites-available/psyichub /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

> **Replace `yourdomain.com`** with your actual domain name, or use the VPS IP
> address for testing. If using an IP, remove `www.yourdomain.com` from `server_name`.

---

## 7. SSL with Let's Encrypt

### Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Get certificate (auto-configures Nginx)

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will:
- Obtain the certificate
- Modify the Nginx config to use HTTPS
- Set up auto-renewal

### Verify auto-renewal

```bash
sudo certbot renew --dry-run
```

> **Skip this step** if you're testing with just an IP address (no domain).
> SSL requires a domain name.

---

## 8. Create systemd Services

systemd ensures the backend auto-restarts on crash and starts on boot.

### Backend service

```bash
sudo tee /etc/systemd/system/psyichub-backend.service > /dev/null <<EOF
[Unit]
Description=PsyicHub Backend (FastAPI)
After=network.target ollama.service postgresql.service
Wants=ollama.service

[Service]
Type=simple
User=psyichub
Group=psyichub
WorkingDirectory=/home/psyichub/PsyicHub/backend
Environment="PATH=/home/psyichub/PsyicHub/backend/venv/bin:/usr/local/bin:/usr/bin"
EnvironmentFile=/home/psyichub/PsyicHub/backend/.env
ExecStart=/home/psyichub/PsyicHub/backend/venv/bin/uvicorn \
    app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 1 \
    --timeout-keep-alive 120
Restart=always
RestartSec=10

# Memory limit (leave headroom for Ollama)
MemoryMax=10G

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=psyichub

[Install]
WantedBy=multi-user.target
EOF
```

> **Why `--workers 1`?** Each worker loads all ML models into RAM (~6-8 GB).
> With 16 GB total and Ollama using ~5-6 GB, you only have room for 1 worker.
> This is fine — a single uvicorn worker handles concurrent async requests correctly
> for ML inference workloads.

### Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable psyichub-backend
sudo systemctl start psyichub-backend
```

### Check status and logs

```bash
sudo systemctl status psyichub-backend
sudo journalctl -u psyichub-backend -f   # live logs
```

---

## 9. Firewall Configuration

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Block direct access to backend port (Nginx proxies it)
sudo ufw deny 8000

# Block direct access to Ollama
sudo ufw deny 11434

# Block direct access to PostgreSQL
sudo ufw deny 5432

sudo ufw enable
sudo ufw status
```

Expected output:

```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
8000                       DENY        Anywhere
11434                      DENY        Anywhere
5432                       DENY        Anywhere
```

---

## 10. Monitoring & Maintenance

### View backend logs

```bash
# Live tail
sudo journalctl -u psyichub-backend -f

# Last 100 lines
sudo journalctl -u psyichub-backend -n 100

# Ollama logs
sudo journalctl -u ollama -f
```

### Restart services

```bash
sudo systemctl restart psyichub-backend
sudo systemctl restart ollama
sudo systemctl restart nginx
```

### Update the application

Transfer updated files from your local machine:

```bash
# From your local machine
rsync -av --exclude='.git' --exclude='backend/venv' --exclude='**/__pycache__' \
  /path/to/PsyicHub/ psyichub@YOUR_VPS_IP:/home/psyichub/PsyicHub/

# SSH into VPS and apply updates
ssh psyichub@YOUR_VPS_IP

# Update backend deps (if requirements.txt changed)
cd /home/psyichub/PsyicHub/backend
source venv/bin/activate
pip install -r requirements.txt

# Rebuild frontend (if frontend changed)
cd /home/psyichub/PsyicHub/frontend
npm ci
VITE_API_BASE_URL=https://yourdomain.com/api npm run build

# Restart backend
sudo systemctl restart psyichub-backend
# Nginx serves static files — no restart needed for frontend-only changes
```

### Monitor disk usage

```bash
df -h                                        # Overall disk
du -sh /home/psyichub/PsyicHub/             # Project size
du -sh /usr/share/ollama/.ollama/models/     # Ollama models
du -sh /home/psyichub/PsyicHub/backend/data_store/  # Runtime data
```

### Monitor memory

```bash
free -h
htop
```

Expected memory breakdown at runtime:

| Process | RAM Usage |
|---------|-----------|
| Ollama + Airavata Q4_K_M | ~5-6 GB |
| PsyicHub backend (all engines loaded) | ~4-6 GB |
| Nginx + PostgreSQL + OS overhead | ~1 GB |
| **Total** | **~10-13 GB** (within 16 GB) |

### Set up log rotation (prevent disk fill)

```bash
sudo tee /etc/logrotate.d/psyichub > /dev/null <<EOF
/home/psyichub/PsyicHub/logs/*.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
```

---

## 11. Local Development Workflow

When developing locally, point your app to your **desktop Ollama** instance:

### Backend `.env` (local)

```env
DATABASE_URL=postgresql://postgres:user@localhost:5432/psyichub
OLLAMA_BASE_URL=http://localhost:11434
USE_GPU=false
```

### Frontend `.env.local`

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Starting locally

```bash
# Terminal 1: Backend
cd backend && .\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend && npm run dev

# Ollama runs as a desktop app — just make sure it's open
```

### Deploying changes to VPS

```bash
# From your local machine — sync changed files
rsync -av --exclude='.git' --exclude='backend/venv' --exclude='**/__pycache__' \
  /path/to/PsyicHub/ psyichub@YOUR_VPS_IP:/home/psyichub/PsyicHub/

# SSH in and restart
ssh psyichub@YOUR_VPS_IP
cd /home/psyichub/PsyicHub/frontend && npm ci && VITE_API_BASE_URL=https://yourdomain.com/api npm run build
sudo systemctl restart psyichub-backend
```

---

## Quick Reference

| Service | URL | Port |
|---------|-----|------|
| Frontend | `https://yourdomain.com` | 80/443 (Nginx) |
| Backend API | `https://yourdomain.com/api/` | proxied → 8000 |
| Ollama | `http://127.0.0.1:11434` | localhost only |
| PostgreSQL | `localhost:5432` | localhost only |
| SSH | `ssh psyichub@YOUR_VPS_IP` | 22 |

| Command | What it does |
|---------|-------------|
| `sudo systemctl status psyichub-backend` | Check backend health |
| `sudo journalctl -u psyichub-backend -f` | Live backend logs |
| `sudo systemctl restart psyichub-backend` | Restart after code update |
| `sudo certbot renew` | Renew SSL certificate |
| `htop` | Monitor CPU/RAM |
