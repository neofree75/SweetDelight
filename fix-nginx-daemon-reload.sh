#!/bin/bash
# Script na opravu nginx daemon-reload a overenie konfigurácie

echo "🔧 Oprava nginx daemon-reload a kontrola konfigurácie"
echo "======================================================"
echo ""

# 1. Reload systemd daemon
echo "1. Reloadujem systemd daemon..."
sudo systemctl daemon-reload
echo "   ✅ Systemd daemon reloadnutý"
echo ""

# 2. Skontroluj aktívne konfigurácie
echo "2. Aktívne nginx konfigurácie:"
ls -la /etc/nginx/sites-enabled/ | grep -E "(marselabakery|bakery)"
echo ""

# 3. Test nginx konfigurácie
echo "3. Testujem nginx konfiguráciu..."
if sudo nginx -t; then
    echo "   ✅ Nginx konfigurácia je platná"
else
    echo "   ❌ Nginx konfigurácia má chyby!"
    exit 1
fi
echo ""

# 4. Skontroluj status nginx
echo "4. Status nginx:"
sudo systemctl status nginx --no-pager -l | head -20
echo ""

# 5. Skontroluj, či marselabakery konfigurácia existuje
echo "5. Kontrolujem konfiguráciu marselabakery.sk..."
if [ -f "/etc/nginx/sites-available/marselabakery.conf" ]; then
    echo "   ✅ Konfigurácia existuje v sites-available"
    
    if [ -L "/etc/nginx/sites-enabled/marselabakery.conf" ]; then
        echo "   ✅ Konfigurácia je aktívna (symlink v sites-enabled)"
    else
        echo "   ⚠️  Konfigurácia NIE JE aktívna!"
        echo "   Vytváram symlink..."
        sudo ln -s /etc/nginx/sites-available/marselabakery.conf /etc/nginx/sites-enabled/marselabakery.conf
        echo "   ✅ Symlink vytvorený"
    fi
else
    echo "   ❌ Konfigurácia neexistuje!"
    echo "   Vytváram konfiguráciu..."
    
    if [ -f "/var/www/SweetDelight/nginx-config-marselabakery-fixed.conf" ]; then
        sudo cp /var/www/SweetDelight/nginx-config-marselabakery-fixed.conf /etc/nginx/sites-available/marselabakery.conf
        sudo ln -s /etc/nginx/sites-available/marselabakery.conf /etc/nginx/sites-enabled/marselabakery.conf
        echo "   ✅ Konfigurácia vytvorená a aktivovaná"
    else
        echo "   ❌ Súbor nginx-config-marselabakery-fixed.conf neexistuje!"
        exit 1
    fi
fi
echo ""

# 6. Test a reload
echo "6. Finálny test a reload..."
sudo nginx -t && sudo systemctl reload nginx
echo "   ✅ Nginx reloadnutý"
echo ""

# 7. Zobraz error logy (ak sú)
echo "7. Posledné error logy (ak existujú):"
sudo tail -5 /var/log/nginx/error.log 2>/dev/null | grep -i marselabakery || echo "   ✅ Žiadne chyby pre marselabakery.sk"
echo ""

echo "======================================================"
echo "✅ Hotovo!"
echo ""
echo "📋 Test SSL:"
echo "   curl -I https://marselabakery.sk"

