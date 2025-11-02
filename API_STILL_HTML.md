# API stále vracia HTML - Riešenie

Server je teraz `online`, ale API stále vracia HTML namiesto JSON. To znamená, že **nginx nie je správne nakonfigurovaný** - nginx neforwarduje `/api` requesty na Node.js server.

## Rýchle riešenie

### Krok 1: Spustite nginx fix script

```bash
cd /var/www/SweetDelight
chmod +x fix-nginx-api-routing.sh
./fix-nginx-api-routing.sh
```

Tento script:
- ✅ Skontroluje nginx konfiguráciu
- ✅ Opraví `location /api` ak chýba alebo je v zlom poradí
- ✅ Otestuje konfiguráciu
- ✅ Reloadne nginx
- ✅ Otestuje API endpoints

### Krok 2: Manuálna kontrola nginx config

Ak automatický script nepomôže:

```bash
# Zobrazte aktuálnu konfiguráciu
sudo cat /etc/nginx/sites-available/sweetdelight.conf | grep -A 10 "location"
```

**Správna konfigurácia by mala vyzerať takto:**

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

# React routes (SPA) - MUSÍ byť POSLEDNÍ
location / {
    try_files $uri $uri/ /index.html;
}
```

### Krok 3: Opravte manuálne (ak potrebné)

```bash
sudo nano /etc/nginx/sites-available/sweetdelight.conf
```

**Kľúčové body:**
1. `location /api` **MUSÍ** byť PRED `location /`
2. `proxy_pass` musí byť `http://127.0.0.1:5001` (BEZ `/api/` na konci)
3. `location /api` BEZ trailing slash (nie `/api/`)

Potom:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Krok 4: Overte, že to funguje

```bash
# Test priamo na Node.js server (bypass nginx)
curl http://localhost:5001/api/test

# Test cez nginx
curl https://bakery.erpnext.sk/api/test
```

Očakávaný výsledok: Oba by mali vrátiť JSON, nie HTML.

## Bežné problémy

### Problém 1: `location /api` je PO `location /`

**Príčina:** Nginx matchuje location bloky v poradí. Ak `location /` je prvý, zachytí všetko vrátane `/api`.

**Riešenie:** Presuňte `location /api` PRED `location /`.

### Problém 2: `location /api/` s trailing slash

**Príčina:** `location /api/` matchuje len `/api/xxx`, nie `/api/xxx` bez trailing slash.

**Riešenie:** Použite `location /api` bez trailing slash.

### Problém 3: `proxy_pass http://127.0.0.1:5001/api/;`

**Príčina:** Trailing slash v proxy_pass odstráni `/api` z URL.

**Riešenie:** Použite `proxy_pass http://127.0.0.1:5001;` bez `/api/`.

### Problém 4: Nginx cache

**Príčina:** Nginx môže cache-ovať staré odpovede.

**Riešenie:**
```bash
sudo systemctl restart nginx
# Alebo
sudo nginx -s reload
```

## Debugging

### Zobrazenie aktuálnej konfigurácie

```bash
sudo cat /etc/nginx/sites-available/sweetdelight.conf | grep -B 2 -A 15 "location /api"
```

### Test nginx syntaxe

```bash
sudo nginx -t
```

### Kontrola, či nginx beží

```bash
sudo systemctl status nginx
```

### Kontrola logov

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Po oprave

Keď API vracia JSON:

1. ✅ Test API endpoint:
   ```bash
   curl https://bakery.erpnext.sk/api/test
   ```

2. ✅ Test produkty:
   ```bash
   curl https://bakery.erpnext.sk/api/products | jq 'length'
   ```

3. ✅ Skontrolujte frontend - produkty by sa mali zobraziť!

## Poznámka o .env chybe

Vidíte `/.env: line 16: -: command not found` - to je kvôli pomlčkám v názve spoločnosti (`DEMO - Glam cake s. r. o.`), ale to neblokuje spustenie servera. Ak chcete, môžete to opraviť v `.env` súbore pomocou úvodzoviek:

```bash
ERPNEXT_COMPANY="DEMO - Glam cake s. r. o."
```

Ale nie je to kritické - server beží aj tak.

