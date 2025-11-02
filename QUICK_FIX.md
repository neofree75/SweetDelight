# Rýchle riešenie problémov na hostingu

## Zistené problémy

1. ❌ **Node.js server nebeží** - port 5001 je prázdny
2. ❌ **Nginx vracia HTML namiesto JSON** - `location /api/` nie je správne nastavené

## Riešenie (krok za krokom)

### Krok 1: Opravte nginx konfiguráciu

```bash
ssh frappe@ubuntu-8gb-hel1-1
sudo nano /etc/nginx/sites-available/sweetdelight.conf
```

**Zmeňte:**
```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5001/api/;
```

**Na:**
```nginx
location /api {
    proxy_pass http://127.0.0.1:5001;
```

**Celá sekcia by mala vyzerať takto:**
```nginx
# API backend - MUSÍ byť PRED location /
location /api {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Assets
location /assets {
    alias /var/www/SweetDelight/dist/public/assets;
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# React routes - MUSÍ byť POSLEDNÝ
location / {
    try_files $uri $uri/ /index.html;
}
```

Potom:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Krok 2: Spustite Node.js server

```bash
cd /var/www/SweetDelight

# Skontrolujte, či existuje build
ls -la dist/index.js

# Ak nie, build:
npm run build

# Spustite s PM2
pm2 start dist/index.js --name SweetDelight --cwd /var/www/SweetDelight
pm2 save

# Skontrolujte status
pm2 status
pm2 logs SweetDelight
```

### Krok 3: Overte, že to funguje

```bash
# Test lokálne
curl http://localhost:5001/api/test

# Test cez nginx
curl https://bakery.erpnext.sk/api/test
```

Očakávaný výsledok: JSON response, nie HTML.

## Automatické riešenie

Skopírujte `fix-hosting-issue.sh` na hosting a spustite:

```bash
# Z vášho počítača
scp fix-hosting-issue.sh frappe@ubuntu-8gb-hel1-1:/var/www/SweetDelight/

# Na hostingu
ssh frappe@ubuntu-8gb-hel1-1
cd /var/www/SweetDelight
chmod +x fix-hosting-issue.sh
./fix-hosting-issue.sh
```

## Kontrola po oprave

```bash
./diagnose-hosting.sh
```

Mali by ste vidieť:
- ✅ Node.js server beží
- ✅ API vracia JSON (nie HTML)
- ✅ Produkty sa načítavajú

