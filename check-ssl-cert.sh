#!/bin/bash
# Script na kontrolu SSL certifikátu pre marselabakery.sk

echo "🔍 Kontrola SSL certifikátu pre marselabakery.sk..."
echo ""

# 1. Kontrola existencie certifikátu
echo "1. Kontrola existencie certifikátu:"
if [ -f "/etc/letsencrypt/live/marselabakery.sk/fullchain.pem" ]; then
    echo "   ✅ fullchain.pem existuje"
else
    echo "   ❌ fullchain.pem NEEXISTUJE!"
    exit 1
fi

if [ -f "/etc/letsencrypt/live/marselabakery.sk/privkey.pem" ]; then
    echo "   ✅ privkey.pem existuje"
else
    echo "   ❌ privkey.pem NEEXISTUJE!"
    exit 1
fi

# 2. Kontrola platnosti certifikátu
echo ""
echo "2. Kontrola platnosti certifikátu:"
openssl x509 -in /etc/letsencrypt/live/marselabakery.sk/fullchain.pem -noout -dates

# 3. Kontrola domény v certifikáte
echo ""
echo "3. Domény v certifikáte:"
openssl x509 -in /etc/letsencrypt/live/marselabakery.sk/fullchain.pem -noout -text | grep -A 1 "Subject Alternative Name"

# 4. Kontrola nginx konfigurácie
echo ""
echo "4. Test nginx konfigurácie:"
sudo nginx -t

# 5. Kontrola, či nginx počúva na porte 443
echo ""
echo "5. Kontrola portu 443:"
sudo netstat -tlnp | grep :443 || sudo ss -tlnp | grep :443

# 6. Kontrola nginx error logov
echo ""
echo "6. Posledné chyby z nginx error logu:"
sudo tail -20 /var/log/nginx/error.log

