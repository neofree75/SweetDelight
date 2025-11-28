#!/bin/bash
# Script na opravu SSL pre marselabakery.sk

echo "🔧 Oprava SSL pre marselabakery.sk..."
echo ""

# 1. Zastav nginx
echo "1. Zastavujem nginx..."
sudo systemctl stop nginx

# 2. Skontroluj certifikát
echo ""
echo "2. Kontrolujem certifikát..."
if [ ! -f "/etc/letsencrypt/live/marselabakery.sk/fullchain.pem" ]; then
    echo "   ⚠️  Certifikát neexistuje, vytváram nový..."
    sudo certbot certonly --standalone -d marselabakery.sk -d www.marselabakery.sk
else
    echo "   ✅ Certifikát existuje"
    # Obnov certifikát ak je potrebné
    echo "   🔄 Kontrolujem, či treba obnoviť certifikát..."
    sudo certbot renew --dry-run
fi

# 3. Skontroluj nginx konfiguráciu
echo ""
echo "3. Kontrolujem nginx konfiguráciu..."
if sudo nginx -t; then
    echo "   ✅ Nginx konfigurácia je platná"
else
    echo "   ❌ Nginx konfigurácia má chyby!"
    exit 1
fi

# 4. Spusti nginx
echo ""
echo "4. Spúšťam nginx..."
sudo systemctl start nginx

# 5. Skontroluj status
echo ""
echo "5. Kontrolujem status nginx..."
sudo systemctl status nginx --no-pager | head -10

# 6. Test SSL
echo ""
echo "6. Testujem SSL pripojenie..."
sleep 2
curl -I https://marselabakery.sk 2>&1 | head -5

echo ""
echo "✅ Hotovo! Skontrolujte výstup vyššie."

