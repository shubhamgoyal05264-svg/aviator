# VPS Production Deploy Guide

## Requirements

- Ubuntu 22.04 VPS (min 2 GB RAM)
- Ports **80** and **8080** open in firewall

## One-time VPS setup

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Install Docker
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh

# Firewall (optional)
ufw allow 22
ufw allow 80
ufw allow 8080
ufw enable
```

## Deploy

```bash
# Upload code (git clone or scp)
cd /var/www
git clone YOUR_REPO_URL skyhigh
cd skyhigh

# Configure
cp deploy/env.production.example .env.production
nano .env.production   # change POSTGRES_PASSWORD and JWT_SECRET

# Deploy
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

## URLs after deploy

| App | URL |
|-----|-----|
| Game | `http://YOUR_VPS_IP` |
| Admin | `http://YOUR_VPS_IP:8080` |
| API health | `http://YOUR_VPS_IP/api/health` |

**Admin login:** `admin@skyhigh.com` / `Admin123!` (change via `ADMIN_PASSWORD` in `.env.production` before first deploy)

## Useful commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart after code update
git pull
./deploy/deploy.sh

# Stop everything
docker compose -f docker-compose.prod.yml down
```

## Custom domain + HTTPS (optional)

1. Point DNS A record to VPS IP
2. Install certbot on host and proxy, or use Caddy/Traefik
3. Set in `.env.production`:
   ```
   VITE_API_URL=https://yourdomain.com
   VITE_SOCKET_URL=https://yourdomain.com
   ```
4. Rebuild: `./deploy/deploy.sh`

## Architecture

```
Port 80  → Nginx → Client (React) + /api + /socket.io → Server
Port 8080 → Nginx → Admin panel + /api proxy → Server
Internal → PostgreSQL + Redis (Docker network only)
```
