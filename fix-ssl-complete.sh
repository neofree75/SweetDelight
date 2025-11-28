#!/bin/bash
# Kompletná oprava SSL pre marselabakery.sk

echo "🔧 Kompletná oprava SSL pre marselabakery.sk"
echo "=============================================="
echo ""

# 1. Zastav nginx
echo "1. Zastavujem nginx..."
sudo systemctl stop nginx

# 2. Skontroluj certifikát
echo ""
echo "2. Kontrolujem certifikát..."
if [ ! -f "/etc/letsencrypt/live/marselabakery.sk/fullchain.pem" ]; then
    echo "   ⚠️  Certifikát neexistuje, vytváram nový..."
    sudo certbot certonly --standalone -d marselabakery.sk -d www.marselabakery.sk --non-interactive --agree-tos --email admin@marselabakery.sk
else
    echo "   ✅ Certifikát existuje"
    # Skontroluj platnosť
    CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/marselabakery.sk/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
    echo "   Certifikát expiruje: $CERT_EXPIRY"
fi

# 3. Oprav oprávnenia certifikátu
echo ""
echo "3. Kontrolujem oprávnenia certifikátu..."
sudo chmod 755 /etc/letsencrypt/live/
sudo chmod 755 /etc/letsencrypt/live/marselabakery.sk/
sudo chmod 644 /etc/letsencrypt/live/marselabakery.sk/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/marselabakery.sk/privkey.pem

# 4. Skontroluj nginx konfiguráciu
echo ""
echo "4. Kontrolujem nginx konfiguráciu..."
if sudo nginx -t; then
    echo "   ✅ Nginx konfigurácia je platná"
else
    echo "   ❌ Nginx konfigurácia má chyby!"
    echo "   Skontrolujte konfiguráciu:"
    echo "   sudo nano /etc/nginx/sites-available/marselabakery.conf"
    exit 1
fi

# 5. Povol port 443 v firewall (ak je aktívny)
echo ""
echo "5. Kontrolujem firewall..."
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "Status: active"; then
        echo "   Povolujem port 443..."
        sudo ufw allow 443/tcp
        sudo ufw allow 80/tcp
    fi
fi

# 6. Spusti nginx
echo ""
echo "6. Spúšťam nginx..."
sudo systemctl start nginx

# 7. Počkaj na spustenie
sleep 3

# 8. Skontroluj status
echo ""
echo "7. Kontrolujem status nginx..."
if sudo systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx beží"
else
    echo "   ❌ Nginx nebeží!"
    echo "   Skontrolujte logy: sudo tail -50 /var/log/nginx/error.log"
    exit 1
fi

# 9. Test SSL
echo ""
echo "8. Testujem SSL pripojenie..."
sleep 2
if curl -I https://marselabakery.sk 2>&1 | grep -q "HTTP"; then
    echo "   ✅ SSL pripojenie funguje!"
else
    echo "   ⚠️  SSL pripojenie môže mať problémy"
    echo "   Skontrolujte: curl -vI https://marselabakery.sk"
fi

echo ""
echo "=============================================="
echo "✅ Oprava dokončená"
echo ""
echo "📋 Ďalšie kroky:"
echo "   1. Skontrolujte: https://marselabakery.sk"
echo "   2. Ak problém pretrváva, spustite: ./diagnose-ssl-issue.sh"
echo "   3. Skontrolujte nginx logy: sudo tail -f /var/log/nginx/error.log"

