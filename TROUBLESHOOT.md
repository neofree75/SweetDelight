# Riešenie problémov s produktami na hostingu

## Diagnostika

### Krok 1: Spustite diagnostický skript na hostingu

```bash
ssh user@bakery.erpnext.sk
cd /var/www/SweetDelight
./diagnose-hosting.sh
```

Tento skript skontroluje:
- ✅ Či beží Node.js server na porte 5001
- ✅ Či API endpoints fungujú lokálne (localhost:5001)
- ✅ Či nginx konfigurácia je správne nastavená
- ✅ Či externé API volania (cez nginx) fungujú
- ✅ Či response je JSON alebo HTML (to by indikovalo problém s nginx)

### Krok 2: Manuálne testy

```bash
# 1. Test lokálneho API (priamo na Node.js)
curl http://localhost:5001/api/test

# 2. Test produkty lokálne
curl http://localhost:5001/api/products | jq 'length'

# 3. Test cez nginx (externé)
curl https://bakery.erpnext.sk/api/test

# 4. Test produkty cez nginx
curl https://bakery.erpnext.sk/api/products | jq 'length'
```

## Bežné problémy a riešenia

### Problém 1: API vracia HTML namiesto JSON

**Symptómy:**
- `curl https://bakery.erpnext.sk/api/test` vracia HTML (index.html)
- V browser console vidíte HTML response pre API request

**Príčina:**
Nginx nie je správne nakonfigurovaný - `location /api` chýba alebo je PO `location /`

**Riešenie:**
1. Skontrolujte nginx konfiguráciu:
```bash
sudo cat /etc/nginx/sites-available/sweetdelight.conf | grep -A 10 "location"
```

2. Zabezpečte, že `location /api` je PRED `location /`:
```nginx
location /api {
    proxy_pass http://127.0.0.1:5001;
    # ...
}

location / {
    try_files $uri $uri/ /index.html;
}
```

3. Test a reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Problém 2: API vracia prázdny array `[]`

**Symptómy:**
- API volanie funguje (status 200, JSON)
- Response je `[]` (prázdny array)
- Na localhost funguje, na hostingu nie

**Príčina:**
- ERPNext pripojenie nefunguje
- Zlé credentials v environment variables
- ERPNext server nie je dostupný

**Riešenie:**
1. Skontrolujte environment variables:
```bash
# Na hostingu
cd /var/www/SweetDelight
cat .env | grep ERPNEXT
```

2. Test ERPNext connection:
```bash
curl http://localhost:5001/api/debug/config
```

3. Skontrolujte server logs:
```bash
tail -50 ~/.pm2/logs/SweetDelight-out.log
# alebo
tail -50 /var/log/pm2/SweetDelight-out.log
```

4. Manuálne test ERPNext API:
```bash
curl -X GET "https://marselabakery.erpnext.sk/api/resource/Website%20Item" \
  -H "Authorization: token YOUR_KEY:YOUR_SECRET"
```

### Problém 3: Frontend nevidí produkty (ale API funguje)

**Symptómy:**
- API vracia produkty (`curl` funguje)
- V browseri sa produkty nenačítavajú
- Browser console ukazuje chybu

**Riešenie:**
1. Otvorte browser console (F12)
2. Pozrite sa na Network tab - skontrolujte:
   - Status code API requestu
   - Response body
   - Content-Type header
3. Pridaný logging v `Shop.tsx` vám ukáže presný problém

### Problém 4: Produkty sa načítavajú na localhost, nie na hostingu

**Kontrolný checklist:**
- [ ] Node.js server beží na hostingu: `lsof -i:5001`
- [ ] Nginx je nakonfigurovaný správne: `sudo nginx -t`
- [ ] Environment variables sú nastavené: `cat .env`
- [ ] API funguje lokálne na hostingu: `curl http://localhost:5001/api/test`
- [ ] API funguje cez nginx: `curl https://bakery.erpnext.sk/api/test`
- [ ] ERPNext credentials sú správne: `curl http://localhost:5001/api/debug/config`

## Kontrola nginx konfigurácie

```bash
# Nájdite config súbor
sudo find /etc/nginx -name "*sweetdelight*" -o -name "*default*"

# Skontrolujte config
sudo cat /etc/nginx/sites-available/sweetdelight.conf

# Test syntaxe
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Skontrolujte status
sudo systemctl status nginx
```

## Kontrola Node.js servera

```bash
# Skontrolujte, či beží
lsof -i:5001

# Skontrolujte PM2 (ak používate)
pm2 list
pm2 logs SweetDelight

# Restart servera
pm2 restart SweetDelight
# alebo ak beží inak:
systemctl restart sweetdelight
```

## Kontrola ERPNext pripojenia

```bash
# Debug endpoint
curl http://localhost:5001/api/debug/config

# Website Items endpoint
curl http://localhost:5001/api/debug/website-items

# Produkty endpoint
curl http://localhost:5001/api/debug/products
```

## Odporúčané kroky

1. **Spustite diagnostický skript:**
   ```bash
   ./diagnose-hosting.sh
   ```

2. **Skontrolujte nginx config** - zabezpečte správne poradie location blokov

3. **Test API endpoints** - najprv lokálne, potom cez nginx

4. **Skontrolujte browser console** - pozrite sa na chyby a response

5. **Skontrolujte server logs** - hľadajte ERPNext connection errors

6. **Verifikujte environment variables** - ERPNext credentials musia byť správne

## Kontakt pre ďalšiu pomoc

Ak problém pretrváva:
1. Spustite `./diagnose-hosting.sh`
2. Skopírujte output
3. Skontrolujte server logs: `tail -100 ~/.pm2/logs/SweetDelight-out.log`
4. Poskytnite obe informácie pre debugging

