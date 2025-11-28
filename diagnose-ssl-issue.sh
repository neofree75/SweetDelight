#!/bin/bash
# Kompletná diagnostika SSL problému pre marselabakery.sk

echo "🔍 Kompletná diagnostika SSL pre marselabakery.sk"
echo "=================================================="
echo ""

# 1. Kontrola existencie certifikátu
echo "1. ✅ Kontrola existencie SSL certifikátu:"
if [ -f "/etc/letsencrypt/live/marselabakery.sk/fullchain.pem" ]; then
    echo "   ✅ fullchain.pem existuje"
    ls -lh /etc/letsencrypt/live/marselabakery.sk/fullchain.pem
else
    echo "   ❌ fullchain.pem NEEXISTUJE!"
    echo "   💡 Riešenie: Vytvorte certifikát cez certbot"
    exit 1
fi

if [ -f "/etc/letsencrypt/live/marselabakery.sk/privkey.pem" ]; then
    echo "   ✅ privkey.pem existuje"
    ls -lh /etc/letsencrypt/live/marselabakery.sk/privkey.pem
else
    echo "   ❌ privkey.pem NEEXISTUJE!"
    exit 1
fi

# 2. Kontrola oprávnení
echo ""
echo "2. ✅ Kontrola oprávnení certifikátu:"
ls -la /etc/letsencrypt/live/marselabakery.sk/

# 3. Kontrola platnosti certifikátu
echo ""
echo "3. ✅ Kontrola platnosti certifikátu:"
CERT_EXPIRY=$(openssl x509 -in /etc/letsencrypt/live/marselabakery.sk/fullchain.pem -noout -enddate 2>/dev/null | cut -d= -f2)
if [ -n "$CERT_EXPIRY" ]; then
    echo "   Certifikát expiruje: $CERT_EXPIRY"
    EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$CERT_EXPIRY" +%s 2>/dev/null)
    NOW_EPOCH=$(date +%s)
    if [ -n "$EXPIRY_EPOCH" ] && [ "$EXPIRY_EPOCH" -gt "$NOW_EPOCH" ]; then
        DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
        echo "   ✅ Certifikát je platný (ostáva $DAYS_LEFT dní)"
    else
        echo "   ❌ Certifikát je EXPIROVANÝ!"
    fi
else
    echo "   ⚠️  Nepodarilo sa zistiť dátum expirácie"
fi

# 4. Kontrola domén v certifikáte
echo ""
echo "4. ✅ Domény v certifikáte:"
openssl x509 -in /etc/letsencrypt/live/marselabakery.sk/fullchain.pem -noout -text 2>/dev/null | grep -A 1 "Subject Alternative Name" || \
openssl x509 -in /etc/letsencrypt/live/marselabakery.sk/fullchain.pem -noout -text 2>/dev/null | grep "DNS:"

# 5. Kontrola nginx konfigurácie
echo ""
echo "5. ✅ Test nginx konfigurácie:"
if sudo nginx -t 2>&1; then
    echo "   ✅ Nginx konfigurácia je platná"
else
    echo "   ❌ Nginx konfigurácia má chyby!"
fi

# 6. Kontrola portu 443
echo ""
echo "6. ✅ Kontrola portu 443:"
if sudo netstat -tlnp 2>/dev/null | grep :443 || sudo ss -tlnp 2>/dev/null | grep :443; then
    echo "   ✅ Nginx počúva na porte 443"
else
    echo "   ❌ Nginx NEPOČÚVA na porte 443!"
fi

# 7. Kontrola nginx status
echo ""
echo "7. ✅ Status nginx:"
sudo systemctl status nginx --no-pager | head -5

# 8. Kontrola nginx error logov
echo ""
echo "8. ✅ Posledné chyby z nginx error logu:"
if [ -f "/var/log/nginx/error.log" ]; then
    sudo tail -20 /var/log/nginx/error.log | grep -i ssl || echo "   Žiadne SSL chyby v logu"
else
    echo "   ⚠️  Error log neexistuje"
fi

# 9. Test SSL pripojenia
echo ""
echo "9. ✅ Test SSL pripojenia:"
echo "   Testujem https://marselabakery.sk..."
curl -vI https://marselabakery.sk 2>&1 | head -20 || echo "   ❌ SSL pripojenie zlyhalo"

# 10. Kontrola firewall
echo ""
echo "10. ✅ Kontrola firewall:"
if command -v ufw &> /dev/null; then
    sudo ufw status | grep 443 || echo "   ⚠️  Port 443 nie je explicitne povolený v ufw"
fi

echo ""
echo "=================================================="
echo "✅ Diagnostika dokončená"

