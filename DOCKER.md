# SweetDelight – Docker na Macu

## Spustenie

```bash
# Build a spustenie na pozadí
docker compose up -d --build

# Aplikácia: http://localhost:5001
```

## Príkazy

```bash
docker compose up -d --build   # (re)build a štart
docker compose down           # zastavenie
docker compose ps             # stav
docker compose logs -f        # logy
```

## Premenné (`.env`)

V koreni projektu musí byť `.env` aspoň s:

- `SESSION_SECRET` (povinné v produkcii)
- `ERPNEXT_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`

Ostatné: `PORT`, `CORS_ORIGINS`, `ERPNEXT_COMPANY`, …

## Poznámky

- **Dev:** `npm run dev` (tsx server/index.ts) – beží lokálne, nie v Dockeri.
- **Produkčný build:** `npm run build` používa `server/index.prod.ts` (bez Vite), Docker túto verziu buildí.
