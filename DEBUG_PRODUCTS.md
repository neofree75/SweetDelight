# Debug: Prečo sa produkty nenačítavajú

API funguje (vracia JSON), ale vracia prázdny array `[]`. To znamená problém s ERPNext pripojením alebo dátami.

## Rýchle kontroly

### 1. Spustite diagnostický skript na hostingu

```bash
ssh frappe@ubuntu-8gb-hel1-1
cd /var/www/SweetDelight
chmod +x test-erpnext-connection.sh
./test-erpnext-connection.sh
```

Tento skript:
- ✅ Skontroluje environment variables
- ✅ Otestuje `/api/debug/config` endpoint
- ✅ Testuje ERPNext Website Items API priamo
- ✅ Zobrazí koľko Website Items je published
- ✅ Ukáže príklady Website Items

### 2. Skontrolujte server logs

```bash
pm2 logs SweetDelight --lines 50
```

Hľadajte:
- `[getItems]` logy - ukážu, koľko Website Items sa našlo
- Chyby pri načítavaní z ERPNext
- Fallback na Item doctype

### 3. Test ERPNext API priamo

```bash
# Z hostingu, test Website Items API
curl -X GET "https://marselabakery.erpnext.sk/api/resource/Website%20Item" \
  -H "Authorization: token YOUR_KEY:YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -G --data-urlencode 'filters=[["published","=",1]]' \
  --data-urlencode 'fields=["name","item_code","published"]'
```

## Bežné problémy a riešenia

### Problém 1: Žiadne published Website Items

**Symptómy:**
- `/api/debug/website-items` vracia `total: 0`
- Website Items existujú, ale nie sú published

**Riešenie:**
1. Otvorte ERPNext: https://marselabakery.erpnext.sk
2. Prejdite na Website Item doctype
3. Skontrolujte, či máte Website Items
4. Nastavte `published = 1` pre Website Items, ktoré chcete zobraziť

### Problém 2: Website Items nie sú namapované na Item

**Symptómy:**
- Website Items existujú
- Ale Item doctype záznamy neexistujú alebo sú disabled

**Riešenie:**
1. Skontrolujte, či každý Website Item má `item_code`
2. Skontrolujte, či Item s týmto `item_code` existuje v Item doctype
3. Skontrolujte, či Item nie je `disabled = 1`

### Problém 3: ERPNext credentials sú nesprávne

**Symptómy:**
- `/api/debug/config` ukazuje `validation: { valid: false }`
- Priame API volania zlyhávajú

**Riešenie:**
1. Skontrolujte `.env` súbor na hostingu:
   ```bash
   cat /var/www/SweetDelight/.env | grep ERPNEXT
   ```

2. Overte credentials v ERPNext:
   - Prejdite na: https://marselabakery.erpnext.sk/app/user
   - Skontrolujte API Key a API Secret
   - Znovu vygenerujte, ak je to potrebné

### Problém 4: Fallback na Item doctype nefunguje

**Symptómy:**
- Website Items sa nenačítavajú
- Fallback na Item doctype tiež vracia 0 produktov

**Riešenie:**
1. Skontrolujte, či existujú Items s `custom_is_eshop = 1`
2. Alebo Items s `published = 1`
3. Skontrolujte server logs pre detaily fallback procesu

## Debug endpoints

Na hostingu môžete volať tieto endpoints:

```bash
# 1. Config check
curl http://localhost:5001/api/debug/config | jq '.'

# 2. Website Items priamo
curl http://localhost:5001/api/debug/website-items | jq '.'

# 3. Products (s detailnými logmi)
curl http://localhost:5001/api/products | jq 'length'

# 4. Debug products (bez cache)
curl http://localhost:5001/api/debug/products | jq '.'
```

## Čo kontrolovať v ERPNext

1. **Website Item doctype:**
   - Otvorte: https://marselabakery.erpnext.sk/app/website-item
   - Skontrolujte, koľko záznamov má `published = 1`
   - Skontrolujte, či majú správne `item_code`

2. **Item doctype:**
   - Otvorte: https://marselabakery.erpnext.sk/app/item
   - Skontrolujte, či Items zodpovedajúce Website Items existujú
   - Skontrolujte, či nie sú `disabled = 1`

3. **API Access:**
   - Skontrolujte, či API Key má prístup k Website Item a Item doctypes
   - Skontrolujte permissions pre API Key usera

## Next steps

Po spustení `test-erpnext-connection.sh` budete vedieť:
- ✅ Koľko Website Items je v ERPNext
- ✅ Koľko z nich je published
- ✅ Či ERPNext credentials fungujú
- ✅ Či je problém s mappingom na Item doctype

Použite výsledky na ďalšie riešenie problému.

