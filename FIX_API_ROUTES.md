# Oprava API Routes na Produkcii

## Problém
API endpoints (`/api/*`) vracajú HTML namiesto JSON na `https://bakery.erpnext.sk`.

## Príčina
Catch-all route v `serveStatic` zachytáva všetky requests vrátane API routes a vracia `index.html`.

## Riešenie

### Krok 1: Redeploy aplikácie
Najprv musíte nasadiť nový kód na hosting:

```bash
# SSH do hostingu
ssh user@bakery.erpnext.sk

# Prejdite do adresára projektu
cd /var/www/SweetDelight  # alebo kam máte projekt

# Stiahnite nové zmeny
git pull origin replit-agent

# Zastavte server
pm2 stop SweetDelight  # alebo akýkoľvek iný spôsob ako zastaviť

# Rebuild aplikácie
npm run build

# Restart servera
pm2 start SweetDelight  # alebo akýkoľvek iný spôsob ako spustiť
```

### Krok 2: Skontrolujte, či API routes fungujú lokálne na hostingu

```bash
# Test na localhost:5001
curl http://localhost:5001/api/test

# Mal by vrátiť JSON:
# {"status":"ok","message":"API routes are working!","timestamp":"...","path":"/api/test"}
```

### Krok 3: Skontrolujte Reverse Proxy konfiguráciu

Ak používate nginx, skontrolujte konfiguráciu:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name bakery.erpnext.sk;

    # DÔLEŽITÉ: API routes musia byť PRED root location
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Všetko ostatné (SPA routing)
    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Kľúčové:** `location /api/` MUSÍ byť pred `location /` v nginx konfigurácii!

### Krok 4: Skontrolujte logy

```bash
# PM2 logy
pm2 logs SweetDelight --lines 50

# Alebo systémové logy
journalctl -u sweetdelight -n 50  # ak používate systemd
```

Hľadajte:
- `[registerRoutes] Registering API routes...`
- `[index] Found X registered API routes before static serving`

### Krok 5: Test endpointy

Po redeploy skúste:

```bash
# Test endpoint
curl https://bakery.erpnext.sk/api/test

# Debug config
curl https://bakery.erpnext.sk/api/debug/config

# Health check
curl https://bakery.erpnext.sk/api/health

# Products
curl https://bakery.erpnext.sk/api/products
```

## Možné problémy

### Problém: Stále vracia HTML
**Riešenie:** 
1. Skontrolujte, či beží nový build (kontrola logov)
2. Skontrolujte nginx konfiguráciu (poradie `location` direktív)
3. Restart nginx: `sudo systemctl restart nginx`
4. Vymazajte nginx cache: `sudo nginx -s reload`

### Problém: 404 Not Found
**Riešenie:**
- Skontrolujte, či server beží: `pm2 status`
- Skontrolujte port: `lsof -i:5001`
- Skontrolujte environment variables

### Problém: Environment variables nie sú nastavené
**Riešenie:**
```bash
# Skontrolujte .env súbor
cat .env

# Alebo PM2 ecosystem config
cat ecosystem.config.js  # ak používate
```

## Verifikácia

Po oprave by malo fungovať:

```bash
curl https://bakery.erpnext.sk/api/test
# Očakávaný výstup:
# {"status":"ok","message":"API routes are working!","timestamp":"2024-...","path":"/api/test"}
```

Ak stále vidíte HTML, problém je v reverse proxy konfigurácii, nie v Node.js kóde.

