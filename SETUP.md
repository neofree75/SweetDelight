# ERPNext integrácia - Návod na nastavenie

## Predpoklady

1. **ERPNext instance** - musíte mať spustenú ERPNext inštanciu
2. **API kľúče** - potrebujete API Key a API Secret z ERPNext
3. **Node.js 18+** - na spustenie aplikácie

## Nastavenie ERPNext

### 1. Vytvoriť API kľúče
1. Prihláste sa do ERPNext ako Admin
2. Idite na **User > API Keys**
3. Vytvorte nový API Key pair
4. Skopírujte API Key a API Secret

### 2. Nastavenie permissions
Uistite sa, že user má oprávnenia na:
- **Item** (Read)
- **Item Price** (Read)
- **Customer** (Create, Read)
- **Sales Order** (Create, Read)

### 3. Nastavenie Item Price List
- Vytvorte Price List s názvom "Standard Selling"
- Alebo upravte `selling_price_list` v kóde na váš Price List

### 4. Názov firmy
- Poznačte si názov vašej firmy v ERPNext (potrebný pre Sales Orders)

## Nastavenie aplikácie

### 1. Environment premenné
Skopírujte `.env.example` ako `.env`:
```bash
cp .env.example .env
```

Upravte `.env` súbor s vašimi údajmi:
```env
ERPNEXT_URL=https://your-erpnext-instance.com
ERPNEXT_API_KEY=your_api_key_here
ERPNEXT_API_SECRET=your_api_secret_here
ERPNEXT_COMPANY=Your Company Name
SESSION_SECRET=vygenerujte-si-silny-secret-aspon-32-znakov
```

### 2. Spustenie aplikácie
```bash
npm install
npm run dev
```

### 3. Testovanie
Aplikácia bude dostupná na `http://localhost:5001`

Pri štarte sa automaticky skontroluje ERPNext konfigurácia a vypíšu sa prípadné chyby.

## API Endpointy

### Produkty
- `GET /api/products` - Zoznam všetkých produktov
- `GET /api/products/:id` - Detail produktu

### Košík
- `GET /api/cart` - Obsah košíka
- `POST /api/cart` - Aktualizovať košík
- `DELETE /api/cart` - Vymazať košík

### Objednávky
- `POST /api/orders` - Vytvoriť objednávku
- `GET /api/orders/:id` - Stav objednávky

## Riešenie problémov

### ERPNext connection errors
1. Skontrolujte ERPNEXT_URL (bez koncového lomítka)
2. Overte API kľúče
3. Skontrolujte permissions používateľa

### Sales Order creation fails
1. Overte ERPNEXT_COMPANY názov
2. Skontrolujte povinné polia pre Sales Order vo vašej ERPNext inštancii
3. Pozrite logy servera pre detaily

### Product loading issues
1. Overte Item permissions
2. Skontrolujte Item Price List nastavenia
3. Uistite sa, že Items majú nastavené ceny

Riešenie 1: Aktualizujte Node.js na verziu 20+
# Nainštalujte Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
# Alebo cez nvm
nvm install 20
nvm use 20
nvm alias default 20
Potom:

node --version  # Malo by ukázať v20.x.x
npm run dev

Postup ako obmedziť prístup len na vašu IP adresu
Riešenie 1: Cez Nginx (odporúčané)
1. Nainštalujte Nginx (ak nemáte)
sudo apt install nginx
2. Vytvorte konfiguráciu


server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

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
3. Aktivujte konfiguráciu
sudo ln -s /etc/nginx/sites-available/sweet-delight /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
4. Zistenie vašej IP adresy
curl ifconfig.me
5. Updatujte konfiguráciu s vaša IP
sudo nano /etc/nginx/sites-available/sweet-delight
# Nahraďte VASA_IP skutočnou IP adresou