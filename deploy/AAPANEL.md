# Deploy on aaPanel — baajihub.com

**VPS IP:** `93.127.194.184`  
**Game domain:** `baajihub.com`  
**Admin domain:** `admin.baajihub.com` (recommended)

aaPanel Nginx uses port **80/443**. Docker must use **3080** and **3082** — aaPanel reverse-proxies to them.

---

## Step 1 — DNS (domain provider par)

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `93.127.194.184` | 300 |
| A | `admin` | `93.127.194.184` | 300 |

Wait 5–30 min. Check:
```bash
ping baajihub.com
# should show 93.127.194.184
```

---

## Step 2 — aaPanel: Docker install

1. Login: `https://93.127.194.184:21829`
2. Left menu → **Docker** → Install if not installed
3. **Security** → ensure ports **80, 443, 3080, 3082** allowed

---

## Step 3 — SSH: upload & deploy project

```bash
ssh root@93.127.194.184

cd /www/wwwroot
git clone YOUR_GITHUB_REPO_URL userbaaji
cd userbaaji

cp deploy/env.baajihub.example .env.production
nano .env.production
# Change POSTGRES_PASSWORD, JWT_SECRET, ADMIN_PASSWORD

chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Verify:
```bash
curl http://127.0.0.1:3080/api/health
# {"status":"ok",...}
```

---

## Step 4 — aaPanel: Game site (baajihub.com)

1. **Website** → **Add site**
2. Domain: `baajihub.com`
3. Type: **PHP** (or Static) — we only need reverse proxy
4. After create → site → **Settings** → **Reverse proxy** (or Config)

Add reverse proxy config (or paste in **Config file**):

```nginx
location / {
    proxy_pass http://127.0.0.1:3080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /socket.io/ {
    proxy_pass http://127.0.0.1:3080/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

5. **SSL** tab → **Let's Encrypt** → apply for `baajihub.com`
6. Enable **Force HTTPS**

---

## Step 5 — aaPanel: Admin site (admin.baajihub.com)

1. **Website** → **Add site** → `admin.baajihub.com`
2. Reverse proxy:

```nginx
location / {
    proxy_pass http://127.0.0.1:3082;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/ {
    proxy_pass http://127.0.0.1:3080/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
}
```

3. SSL → Let's Encrypt for `admin.baajihub.com`

---

## Step 6 — Fix "Inoperable" domain in Node project

Screenshot mein **userbaaji** Node project hai — uski zaroorat nahi agar Docker use kar rahe ho.

- Either **delete** that Node site and use Step 4–5 websites
- Or ignore it — Docker + reverse proxy alag chalega

"Inoperable" = DNS abhi IP par point nahi karta. DNS fix ke baad green ho jayega.

---

## Live URLs

| App | URL |
|-----|-----|
| Game | https://baajihub.com |
| Admin | https://admin.baajihub.com |
| API | https://baajihub.com/api/health |

**Admin login:** `admin@skyhigh.com` / (jo `.env.production` mein `ADMIN_PASSWORD` set kiya)

---

## Update code later

```bash
cd /www/wwwroot/userbaaji
git pull
./deploy/deploy.sh
```

## Logs

```bash
docker compose -f docker-compose.prod.yml logs -f server
```
