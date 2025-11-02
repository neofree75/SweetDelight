# Server je v stave "errored" - Riešenie

PM2 status ukazuje, že server SweetDelight je v stave `errored`. To znamená, že sa nespustil alebo spadol pri štarte.

## Rýchle riešenie

### Krok 1: Skontrolujte logy

```bash
# Chybové logy (najdôležitejšie!)
pm2 logs SweetDelight --err --lines 100

# Output logy
pm2 logs SweetDelight --out --lines 50
```

### Krok 2: Automatický restart script

Spustite tento script, ktorý:
- Skontroluje logy
- Skontroluje build súbory
- Skontroluje .env súbor
- Reštartuje server

```bash
cd /var/www/SweetDelight
chmod +x check-and-restart-server.sh
./check-and-restart-server.sh
```

### Krok 3: Manuálny restart

Ak automatický script nepomôže:

```bash
cd /var/www/SweetDelight

# 1. Zmažte starý proces
pm2 delete SweetDelight

# 2. Skontrolujte build
ls -la dist/index.js

# 3. Ak neexistuje, build:
npm run build

# 4. Načítajte env variables
set -a
source .env
set +a

# 5. Spustite server
pm2 start dist/index.js --name SweetDelight --cwd /var/www/SweetDelight
pm2 save

# 6. Skontrolujte status
pm2 status
pm2 logs SweetDelight
```

## Bežné príčiny errored stavu

### 1. Chýbajúce environment variables

**Chyba:** `ERPNEXT_URL is not set` alebo podobné

**Riešenie:**
```bash
# Skontrolujte .env súbor
cat .env | grep ERPNEXT

# Uistite sa, že všetky premenné sú nastavené
```

### 2. Port už je obsadený

**Chyba:** `Port 5001 already in use`

**Riešenie:**
```bash
# Nájdite proces na porte 5001
lsof -i:5001

# Zabite ho
kill -9 $(lsof -t -i:5001)

# Reštartujte server
pm2 restart SweetDelight
```

### 3. Chýbajúce závislosti

**Chyba:** `Cannot find module` alebo `require is not defined`

**Riešenie:**
```bash
# Rebuild projektu
npm run build

# Reštartujte
pm2 restart SweetDelight
```

### 4. Syntax error v kóde

**Chyba:** `SyntaxError` alebo `TypeError`

**Riešenie:**
- Pozrite sa na logy pre presnú chybu
- Skontrolujte, či build prebehol úspešne
- Skontrolujte TypeScript chyby: `npm run check`

### 5. Node.js verzia

**Chyba:** `Syntax error` alebo `ES modules`

**Riešenie:**
```bash
# Skontrolujte Node verziu
node --version

# Malo by byť 20.x
# Ak nie, prepnite:
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# Reštartujte server
pm2 restart SweetDelight
```

## Debugging

### Zobrazenie všetkých logov naraz

```bash
pm2 logs SweetDelight --lines 200
```

### Real-time monitoring

```bash
pm2 monit
```

### Manuálny start (pre debugging)

```bash
cd /var/www/SweetDelight
set -a
source .env
set +a
node dist/index.js
```

Toto vám ukáže presnú chybu v real-time.

### Kontrola build súborov

```bash
# Skontrolujte, či build existuje
ls -la dist/index.js

# Skontrolujte veľkosť (mal by byť niekoľko MB)
# Ak je 0 bytes alebo neexistuje, rebuild:
npm run build
```

## Po oprave

Keď server beží (`status: online`):

1. Test API:
   ```bash
   curl http://localhost:5001/api/test
   ```

2. Skontrolujte produkty:
   ```bash
   curl http://localhost:5001/api/products | jq 'length'
   ```

3. Skontrolujte nginx:
   ```bash
   curl https://bakery.erpnext.sk/api/test
   ```

## Kontakt

Ak problém pretrváva:
1. Spustite `pm2 logs SweetDelight --err --lines 100`
2. Skopírujte posledných 50 riadkov error logov
3. Poskytnite ich pre debugging

