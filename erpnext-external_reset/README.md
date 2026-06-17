# ERPNext – Odstúpenie od zmluvy (`external_reset.api.withdrawal.create_withdrawal`)

Súbory pre Frappe/ERPNext aplikáciu **`external_reset`** (tú istú, kde už beží
`external_reset.api.register.register_user`). Implementujú API metódu, ktorá
v jednom kroku **založí záznam** o odstúpení od zmluvy a **pošle e-maily**
(potvrdenie zákazníkovi + notifikáciu cukrárni).

E-shop SweetDelight už túto metódu volá z
`server/erpnext-service.ts → createWithdrawalRequest()` na endpointe:

```
POST /api/method/external_reset.api.withdrawal.create_withdrawal
```

## Obsah

```
external_reset/
├── api/
│   └── withdrawal.py                      # whitelisted metóda create_withdrawal
└── external_reset/                        # modul "External Reset"
    └── doctype/
        ├── withdrawal_request/            # hlavný doctype "Withdrawal Request"
        │   ├── withdrawal_request.json
        │   └── withdrawal_request.py
        └── withdrawal_request_item/       # child table "Withdrawal Request Item"
            ├── withdrawal_request_item.json
            └── withdrawal_request_item.py
```

## Kontrakt

**Vstup** (JSON body, posiela e-shop):

```json
{
  "orderId": "SAL-ORD-2026-00123",
  "email": "zakaznik@email.sk",
  "fullName": "Ján Novák",
  "iban": "SK00 0000 ...",
  "reason": "nepovinné",
  "items": [
    { "item_code": "ABC", "item_name": "Zákusok", "qty": 2, "rate": 3.5 }
  ]
}
```

**Výstup**: `{"message": {"name": "WDR-2026-00001", "request_id": "WDR-2026-00001"}}`
(Frappe whitelisted metódy vracajú návratovú hodnotu pod kľúčom `message`.)

Metóda **nezávisle overí** objednávku a e-mail (`Sales Order.contact_email`),
takže funguje bezpečne aj keď ju volá guest.

## Nasadenie

> Predpoklad: prístup k serveru cez `bench`, app `external_reset` je nainštalovaná.

1. **Skopíruj súbory** do app `external_reset` v bench prostredí (zachovaj štruktúru):
   ```
   frappe-bench/apps/external_reset/external_reset/api/withdrawal.py
   frappe-bench/apps/external_reset/external_reset/external_reset/doctype/withdrawal_request/*
   frappe-bench/apps/external_reset/external_reset/external_reset/doctype/withdrawal_request_item/*
   ```
   Adresár `external_reset/api/` už existuje (je tam `register.py`) – pridáva sa len `withdrawal.py`.

2. **Over modul.** Pole `"module": "External Reset"` v oboch `*.json` musí zodpovedať
   názvu modulu v `external_reset/modules.txt`. Ak má app iný modul, uprav hodnotu
   `module` v oboch JSON súboroch naň.

3. **Načítaj nový doctype**:
   ```bash
   bench --site <site> migrate
   bench --site <site> clear-cache
   bench restart            # alebo: bench --site <site> reload-doctype "Withdrawal Request"
   ```

4. **Nastav e-mail cukrárne** (príjemca notifikácií). Buď:
   - uprav `DEFAULT_SHOP_EMAIL` v `api/withdrawal.py`, alebo
   - pridaj do `site_config.json`:
     ```json
     { "withdrawal_notify_email": "objednavky@marselabakery.sk" }
     ```

5. **Skontroluj odchádzajúci e-mail** (Email Account / SMTP) – metóda používa
   `frappe.sendmail(..., now=True)`. Bez nastaveného outgoing e-mailu sa záznam
   založí, ale e-mail neodíde (chyba sa zaloguje cez `frappe.log_error`).

## Test

```bash
curl -X POST 'https://<erpnext>/api/method/external_reset.api.withdrawal.create_withdrawal' \
  -H 'Authorization: token <api_key>:<api_secret>' \
  -H 'Content-Type: application/json' \
  -d '{
        "orderId": "SAL-ORD-2026-00123",
        "email": "zakaznik@email.sk",
        "fullName": "Ján Novák",
        "items": [{"item_code":"ABC","item_name":"Zákusok","qty":1,"rate":3.5}]
      }'
```

Očakávané: HTTP 200 + `{"message": {"name": "WDR-..."}}`, nový záznam
**Withdrawal Request** v ERPNext a dva odoslané e-maily.

Chybný e-mail / neexistujúca objednávka → HTTP 417/exception s neutrálnou hláškou
„Objednávku sa nepodarilo overiť." (e-shop ju zobrazí používateľovi).

## Poznámka k e-shopu

Po nasadení tejto metódy e-shop prestane používať Issue fallback
(`createWithdrawalRequest` v `server/erpnext-service.ts` skúša najprv túto metódu).
Žiadna zmena v kóde e-shopu nie je potrebná.
