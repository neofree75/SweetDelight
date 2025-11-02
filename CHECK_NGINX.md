# Ako skontrolovať a opraviť nginx konfiguráciu

## Kde nájsť nginx konfiguráciu

### 1. Štandardné umiestnenie

Na väčšine Linux systémov je nginx konfigurácia v:
```
/etc/nginx/sites-available/    # Dostupné konfigurácie
/etc/nginx/sites-enabled/      # Aktívne konfigurácie (symlinky)
```

### 2. Hľadanie konfigurácie

```bash
# Nájdite všetky nginx konfigurácie
sudo find /etc/nginx -name "*.conf" -type f

# Alebo pozrite sites-enabled
ls -la /etc/nginx/sites-enabled/

# Pozrite default config
cat /etc/nginx/sites-enabled/default

# Alebo ak máte vlastný config
cat /etc/nginx/sites-available/sweet-delight
```

## Kontrola aktuálnej konfigurácie

### Krok 1: Pozrite si aktuálnu nginx konfiguráciu

```bash
# SSH do hostingu
ssh user@bakery.erpnext.sk

# Pozrite aktívne nginx konfigurácie
sudo cat /etc/nginx/sites-enabled/default

# Alebo
sudo cat /etc/nginx/sites-enabled/sweet-delight

# Alebo všetky configy
sudo cat /etc/nginx/nginx.conf
```

### Krok 2: Skontrolujte, či nginx beží

```bash
# Status nginx
sudo systemctl status nginx

# Alebo
sudo service nginx status
```

### Krok 3: Test nginx konfigurácie

```bash
# Test syntaxe
sudo nginx -t

# Ak je syntax OK, mali by ste vidieť:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

## Čo hľadať v konfigurácii

### ❌ Zlá konfigurácia (API routes sa nespracúvajú)

```nginx
server {
    location / {
        proxy_pass http://127.0.0.1:5001;
        # ... ostatné ...
    }
    
    # location /api/ chýba alebo je PO location /
}
```

### ✅ Správna konfigurácia (API routes fungujú)

```nginx
server {
    # DÔLEŽITÉ: /api/ MUSÍ byť PRED /
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://127.0.0.1:5001;
        # ... ostatné ...
    }
}
```

## Ako opraviť konfiguráciu

### Krok 1: Vytvorte/zmeňte konfiguráciu

```bash
# Backup existujúcej konfigurácie
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# Upravte konfiguráciu
sudo nano /etc/nginx/sites-available/default
# Alebo
sudo nano /etc/nginx/sites-available/sweet-delight
```

### Krok 2: Skopírujte správnu konfiguráciu

Pozri `nginx-config-example.conf` v tomto projekte alebo použite:

```nginx
server {
    listen 80;
    server_name bakery.erpnext.sk;

    # KRITICKÉ: /api/ pred / 
    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Krok 3: Test a restart

```bash
# Test syntaxe
sudo nginx -t

# Ak je OK, reload nginx
sudo systemctl reload nginx
# Alebo
sudo nginx -s reload

# Skontrolujte status
sudo systemctl status nginx
```

### Krok 4: Verifikácia

```bash
# Test lokálne na serveri
curl http://localhost:5001/api/test

# Test cez nginx (z hostingu)
curl http://localhost/api/test

# Test zvonka
curl https://bakery.erpnext.sk/api/test
```

## Riešenie problémov

### Problém: `nginx: command not found`
**Riešenie:** Nginx nie je nainštalovaný alebo nie je v PATH
```bash
which nginx
# Alebo
/usr/sbin/nginx -t
```

### Problém: `nginx: [error] invalid number of arguments`
**Riešenie:** Zlá syntaxe v config súbore
```bash
sudo nginx -t  # ukáže presnú chybu
```

### Problém: Permission denied
**Riešenie:** Použite sudo
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Problém: Stále vracia HTML pre API
**Riešenie:** 
1. Skontrolujte poradie `location` direktív - `/api/` MUSÍ byť pred `/`
2. Restart nginx: `sudo systemctl restart nginx`
3. Vymazajte cache: `sudo nginx -s reload`

## Alternatíva: Bez nginx (ak používate iný reverse proxy)

Ak nepoužívate nginx, skontrolujte:
- **Apache**: `/etc/apache2/sites-available/`
- **Caddy**: `Caddyfile` v root adresári
- **Cloudflare**: Rules v dashboard
- **Akýkoľvek iný reverse proxy**: Podobná logika - API routes musia byť pred root

## Quick check script

Môžete použiť `check-production.sh` na automatickú kontrolu:

```bash
chmod +x check-production.sh
./check-production.sh
```

