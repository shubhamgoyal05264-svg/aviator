# 🚀 SkyHigh Aviator — aaPanel par Live Deploy (Beginner Guide)

> **Yeh guide bilkul zero se hai.** Agar tumne kabhi project deploy nahi kiya, yahi file follow karo step-by-step.
>
> **Tumhara setup:**
> - Domain: **baajilive.com**
> - Admin domain: **admin.baajilive.com**
> - VPS IP: **93.127.194.184** (apna IP check karo agar alag ho)
> - Panel: **aaPanel** (`https://93.127.194.184:21829`)
> - Project: SkyHigh Aviator (ye repo)

---

## 📋 Pehle samjho — ye sab kya hai?

| Shabd | Simple matlab |
|-------|----------------|
| **VPS** | Internet par rent ki hui computer (server). Tumhara game 24/7 yahi chalega. |
| **IP** | Server ka address number, jaise `93.127.194.184` |
| **Domain** | Naam jo log type karte hain — `baajilive.com` |
| **DNS** | Domain ko IP se jodne wala system |
| **aaPanel** | Server control karne ka web dashboard (buttons, sites, SSL) |
| **Docker** | App ko box mein pack karke chalata hai (database + server + game ek saath) |
| **SSH** | Apne computer se server par commands likhne ka tarika |
| **SSL/HTTPS** | Padlock wala secure `https://` |
| **Reverse Proxy** | aaPanel domain sunta hai, andar Docker ko request bhejta hai |

### Live hone ke baad kya dikhega?

| Kya | URL |
|-----|-----|
| Game (players) | `https://baajilive.com` |
| Admin panel (tum) | `https://admin.baajilive.com` |
| API test | `https://baajilive.com/api/health` |

---

## ✅ Poora checklist (print kar lo)

```
[ ] Step 1 — GitHub par code upload
[ ] Step 2 — Domain DNS set (baajilive.com → VPS IP)
[ ] Step 3 — aaPanel login + Docker install
[ ] Step 4 — SSH se server connect
[ ] Step 5 — Code clone + .env.production setup
[ ] Step 6 — ./deploy/deploy.sh chalao
[ ] Step 7 — aaPanel mein baajilive.com site + reverse proxy
[ ] Step 8 — aaPanel mein admin.baajilive.com site + reverse proxy
[ ] Step 9 — SSL (HTTPS) dono domains par
[ ] Step 10 — Browser mein test + admin login
```

---

# STEP 1 — Apna code GitHub par daalo

Server par code lana sabse aasaan GitHub se hai.

## 1.1 GitHub account

1. Browser kholo → https://github.com
2. Sign up (free) agar account nahi hai

## 1.2 Naya repository banao

1. GitHub par **+** → **New repository**
2. Name: `skyhigh-aviator` (kuch bhi)
3. **Private** select karo (recommended)
4. **Create repository**

## 1.3 Apne computer (Windows) par code push karo

**PowerShell** kholo (Windows Search → PowerShell):

```powershell
cd "C:\Users\DELL\OneDrive\Desktop\makaaz-project\aviator-projects\aviator-projects\skyhigh-crash---provably-fair-aviator"
```

Git pehli baar ho to:
```powershell
git config --global user.email "tumhara@email.com"
git config --global user.name "Tumhara Naam"
```

Code upload:
```powershell
git add .
git commit -m "Ready for production deploy"
git branch -M main
git remote add origin https://github.com/TUMHARA_USERNAME/skyhigh-aviator.git
git push -u origin main
```

> `TUMHARA_USERNAME` apna GitHub username likho.  
> Password ki jagah GitHub **Personal Access Token** maangega — GitHub → Settings → Developer settings → Tokens → Generate.

**✅ Done jab:** GitHub par saari files dikh rahi hon.

---

# STEP 2 — Domain DNS set karo (baajilive.com)

Domain jahan khareeda (GoDaddy, Hostinger, Namecheap, etc.) → login → **DNS Management** / **Manage DNS**.

## 2.1 Ye 2 records add karo

| Type | Name / Host | Value / Points to | TTL |
|------|-------------|-------------------|-----|
| **A** | `@` | `93.127.194.184` | 300 (ya Auto) |
| **A** | `admin` | `93.127.194.184` | 300 |

**Matlab:**
- `baajilive.com` → tumhare VPS par jayega
- `admin.baajilive.com` → admin panel ke liye

> Agar tumhara VPS IP alag hai to apna IP use karo. aaPanel homepage par IP likha hota hai.

## 2.2 Wait karo

DNS update mein **5 minute se 24 ghante** lag sakte hain (usually 10–30 min).

## 2.3 Check karo (apne PC par PowerShell)

```powershell
ping baajilive.com
```

`93.127.194.184` reply aana chahiye.

Online check: https://dnschecker.org → `baajilive.com` type karo → sab jagah tumhara IP dikhna chahiye.

**✅ Done jab:** ping sahi IP dikhaye.

---

# STEP 3 — aaPanel mein Docker install karo

## 3.1 aaPanel kholo

Browser mein:
```
https://93.127.194.184:21829
```

Login karo (jo password VPS kharidte waqt mila).

## 3.2 Docker install

1. Left sidebar → **Docker** (ya **App Store** → Docker)
2. **Install** / **One-click install** dabao
3. 2–5 minute wait — **Installed** dikhe

## 3.3 Firewall / Security

Left sidebar → **Security**:

| Port | Kyun |
|------|------|
| 22 | SSH (server access) |
| 80 | Website HTTP |
| 443 | Website HTTPS |
| 21829 | aaPanel |
| 3080 | Game (Docker internal) |
| 3082 | Admin (Docker internal) |

Har port ke saamne **Allow** / **Release** karo.

**✅ Done jab:** Docker installed + ports open.

---

# STEP 4 — SSH se server par connect karo

SSH = server par remote terminal.

## 4.1 Windows PowerShell se connect

```powershell
ssh root@93.127.194.184
```

- Pehli baar `yes` type karo
- Password: VPS provider ka root password

**✅ Done jab:** prompt aisa dikhe:
```
root@server:~#
```

## 4.2 Server update (optional but recommended)

```bash
apt update && apt upgrade -y
```

---

# STEP 5 — Project download + settings file

> Ab tum **server ke andar** ho (SSH). Saari commands yahi chalengi.

## 5.1 Project folder mein jao

```bash
cd /www/wwwroot
```

## 5.2 GitHub se code copy karo

```bash
git clone https://github.com/TUMHARA_USERNAME/skyhigh-aviator.git baajilive
cd baajilive
```

> Private repo ho to:
> ```bash
> git clone https://ghp_TUMHARA_TOKEN@github.com/TUMHARA_USERNAME/skyhigh-aviator.git baajilive
> ```

## 5.3 Files check karo

```bash
ls
```

Dikhna chahiye: `client`, `admin`, `server`, `deploy`, `docker-compose.prod.yml`

## 5.4 Production settings file banao

```bash
cp deploy/env.baajilive.example .env.production
nano .env.production
```

### Nano editor kaise use karein

- Arrow keys se move
- Text edit karo
- **Save:** `Ctrl + O` → Enter
- **Exit:** `Ctrl + X`

### Kya change karna hai (ZAROORI)

File kholo aur ye values badlo:

```env
POSTGRES_PASSWORD=YahanMazbootPassword123!
JWT_SECRET=niche_wala_command_se_copy_karo
ADMIN_PASSWORD=Admin@Baaji2024!
```

**JWT_SECRET generate karo** (server par alag terminal ya save se pehle):

```bash
openssl rand -hex 32
```

Jo lamba random text aaye woh `JWT_SECRET=` ke baad paste karo.

**Mat change karo (already sahi hai):**
```env
VITE_API_URL=https://baajilive.com
VITE_SOCKET_URL=https://baajilive.com
HTTP_PORT=3080
ADMIN_PORT=3082
```

**✅ Done jab:** `.env.production` mein koi `change_this_...` text na bache.

---

# STEP 6 — Deploy script chalao (main step)

## 6.1 Script ready karo

```bash
chmod +x deploy/deploy.sh
```

## 6.2 Deploy start

```bash
./deploy/deploy.sh
```

### Kya hoga?

1. PostgreSQL database download + start
2. Redis start
3. Server build (Node.js)
4. Game website build (React)
5. Admin panel build (React)
6. Database tables create
7. Admin user create

**Pehli baar 10–20 minute** lag sakte hain. Terminal band mat karo.

### Agar error aaye

| Error | Solution |
|-------|----------|
| `POSTGRES_PASSWORD` / default password | Step 5.4 dubara — password change karo |
| `docker: command not found` | Step 3 — Docker install karo |
| `git: command not found` | `apt install -y git` |
| Out of memory | VPS kam se kam 2GB RAM honi chahiye |

## 6.3 Deploy success check

```bash
curl http://127.0.0.1:3080/api/health
```

**Sahi output:**
```json
{"status":"ok","time":"..."}
```

Containers check:
```bash
docker compose -f docker-compose.prod.yml ps
```

4 containers **running**: `postgres`, `redis`, `server`, `nginx`

**✅ Done jab:** health API `ok` de aur 4 containers running hon.

---

# STEP 7 — aaPanel: Game website (baajilive.com)

> Ab domain ko Docker se jodna hai. aaPanel sunega `baajilive.com`, andar Docker ko bhejega.

## 7.1 Nayi website add karo

1. aaPanel → **Website** (left menu)
2. **Add site** button
3. Fill karo:
   - **Domain:** `baajilive.com`
   - **Also add:** `www.baajilive.com` (optional)
   - **PHP Version:** koi bhi (use nahi hoga, proxy use karenge)
   - **Database:** No (Docker apna DB use karta hai)
4. **Submit**

## 7.2 Reverse Proxy lagao

1. Website list mein `baajilive.com` → **Settings** (gear icon)
2. **Reverse proxy** tab (ya **Config** / **Configuration file**)

### Option A — Reverse Proxy UI hai

- **Add reverse proxy**
- **Target URL:** `http://127.0.0.1:3080`
- Save

### Option B — Config file edit

**Config** tab kholo. `server { ... }` block ke andar ye paste karo:

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

**Save** → **Reload** Nginx (aaPanel usually auto reload karta hai).

## 7.3 Test (SSL se pehle)

Browser: `http://baajilive.com`

Aviator login screen aana chahiye.

**✅ Done jab:** game page khul jaye (http par).

---

# STEP 8 — aaPanel: Admin website (admin.baajilive.com)

## 8.1 Nayi site add karo

1. **Website** → **Add site**
2. Domain: `admin.baajilive.com`
3. Submit

## 8.2 Reverse proxy

Settings → Config ya Reverse proxy:

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
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Save + reload.

Test: `http://admin.baajilive.com` → Admin login page.

**✅ Done jab:** admin login page dikhe.

---

# STEP 9 — SSL / HTTPS (padlock) lagao

Bina SSL ke browser warning deta hai. **Let's Encrypt = free SSL.**

## 9.1 baajilive.com par SSL

1. Website → `baajilive.com` → **SSL**
2. **Let's Encrypt** select
3. Domain: `baajilive.com` (+ `www` agar add kiya)
4. **Apply** / **Apply Certificate**
5. **Force HTTPS** ON karo

## 9.2 admin.baajilive.com par SSL

Same steps `admin.baajilive.com` ke liye.

## 9.3 Test

- https://baajilive.com — padlock dikhe
- https://admin.baajilive.com — padlock dikhe
- https://baajilive.com/api/health — `{"status":"ok"}`

**✅ Done jab:** dono sites `https://` par khulen.

---

# STEP 10 — Final test + login

## 10.1 Game test

1. https://baajilive.com kholo
2. **Register** → email, username, password
3. Login → game chalni chahiye (plane, bet, etc.)

## 10.2 Admin test

1. https://admin.baajilive.com
2. Login:
   - **Email:** `admin@skyhigh.com`
   - **Password:** jo `.env.production` mein `ADMIN_PASSWORD` likha (default example: `Admin123!` agar change nahi kiya)

3. Dashboard, users, game config dikhna chahiye

## 10.3 Agar game load ho lekin bet/login fail

SSH par logs dekho:
```bash
cd /www/wwwroot/baajilive
docker compose -f docker-compose.prod.yml logs server --tail 50
```

---

# Purana "Node project" / "Inoperable" domain

Agar aaPanel mein pehle se **userbaaji** ya koi Node project hai aur **Inoperable** dikhta hai:

- **Ignore karo** ya **delete** karo
- Hum **Docker + Website reverse proxy** use kar rahe hain
- "Inoperable" = DNS abhi connect nahi tha — Step 2 ke baad theek ho jata hai

---

# Architecture — dimaag mein ek picture

```
Player browser
    │
    ▼
https://baajilive.com  (aaPanel Nginx — port 443)
    │
    ▼ proxy
http://127.0.0.1:3080  (Docker Nginx)
    │
    ├── /           → Game (React files)
    ├── /api/*      → Node.js Server
    └── /socket.io  → WebSocket (live game)

Admin browser → admin.baajilive.com → :3082 → Admin React
Database + Redis → sirf Docker ke andar (bahar se access nahi)
```

---

# Baad mein code update kaise karein

**Apne PC par changes:**
```powershell
git add .
git commit -m "update"
git push
```

**VPS par (SSH):**
```bash
cd /www/wwwroot/baajilive
git pull
./deploy/deploy.sh
```

---

# Useful commands (yaad rakhne wale)

```bash
# Sab logs live dekho
docker compose -f docker-compose.prod.yml logs -f

# Sirf server logs
docker compose -f docker-compose.prod.yml logs -f server

# Restart sab
docker compose -f docker-compose.prod.yml restart

# Band karna
docker compose -f docker-compose.prod.yml down

# Dubara start (build ke bina)
docker compose -f docker-compose.prod.yml up -d
```

---

# Problems & Solutions

| Problem | Kya karo |
|---------|----------|
| Domain nahi khul raha | DNS check (Step 2), 30 min wait |
| `502 Bad Gateway` | Docker chal raha? `curl http://127.0.0.1:3080/api/health` |
| SSL fail | DNS pehle sahi IP par ho, phir SSL try karo |
| Login fail | Server logs dekho, DB running? |
| Game slow / crash | VPS RAM badhao (2GB minimum) |
| WebSocket disconnect | Step 7.2 mein `/socket.io/` proxy check karo |
| Admin API error | Step 8.2 mein `/api/` proxy check karo |

---

# Quick copy-paste (experienced ho to)

```bash
# VPS par ek saath
cd /www/wwwroot
git clone https://github.com/USER/REPO.git baajilive
cd baajilive
cp deploy/env.baajilive.example .env.production
nano .env.production   # passwords change
chmod +x deploy/deploy.sh
./deploy/deploy.sh
curl http://127.0.0.1:3080/api/health
```

Phir aaPanel: 2 sites + reverse proxy + SSL (Step 7–9).

---

# Tumhari live links (sab complete hone ke baad)

| | URL |
|---|-----|
| 🎮 Game | https://baajilive.com |
| 👑 Admin | https://admin.baajilive.com |
| 🔧 API | https://baajilive.com/api/health |

**Admin:** `admin@skyhigh.com` + tumhara `ADMIN_PASSWORD`

---

> **Help chahiye?** Kis step par ho aur kya error aa raha hai — screenshot + step number bhej dena.
