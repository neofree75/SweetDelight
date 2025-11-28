#!/bin/bash
# Script na nastavenie nginx konfigurácie pre marselabakery.sk

echo "🔧 Nastavenie nginx konfigurácie pre marselabakery.sk"
echo "======================================================"
echo ""

CONFIG_FILE="/etc/nginx/sites-available/marselabakery.conf"
ENABLED_LINK="/etc/nginx/sites-enabled/marselabakery.conf"
PROJECT_DIR="/var/www/SweetDelight"

# 1. Skontroluj, či existuje konfiguračný súbor v projekte
if [ ! -f "$PROJECT_DIR/nginx-config-marselabakery-fixed.conf" ]; then
    echo "❌ Súbor nginx-config-marselabakery-fixed.conf neexistuje v $PROJECT_DIR"
    echo "   Skopírujte ho tam najprv"
    exit 1
fi

# 2. Skopíruj konfiguráciu do sites-available
echo "1. Kopírujem konfiguráciu do sites-available..."
sudo cp "$PROJECT_DIR/nginx-config-marselabakery-fixed.conf" "$CONFIG_FILE"
echo "   ✅ Konfigurácia skopírovaná do $CONFIG_FILE"

# 3. Vytvor symlink v sites-enabled (ak neexistuje)
echo ""
echo "2. Aktivujem konfiguráciu..."
if [ -L "$ENABLED_LINK" ]; then
    echo "   ⚠️  Symlink už existuje, odstraňujem..."
    sudo rm "$ENABLED_LINK"
fi

sudo ln -s "$CONFIG_FILE" "$ENABLED_LINK"
echo "   ✅ Symlink vytvorený: $ENABLED_LINK -> $CONFIG_FILE"

# 4. Test nginx konfigurácie
echo ""
echo "3. Testujem nginx konfiguráciu..."
if sudo nginx -t; then
    echo "   ✅ Nginx konfigurácia je platná"
else
    echo "   ❌ Nginx konfigurácia má chyby!"
    echo "   Skontrolujte: sudo nginx -t"
    exit 1
fi

# 5. Reload nginx
echo ""
echo "4. Reloadujem nginx..."
sudo systemctl reload nginx

# 6. Skontroluj status
echo ""
echo "5. Kontrolujem status nginx..."
if sudo systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx beží správne"
else
    echo "   ❌ Nginx nebeží!"
    echo "   Skontrolujte: sudo systemctl status nginx"
    exit 1
fi

# 7. Zobraz aktívne konfigurácie
echo ""
echo "6. Aktívne nginx konfigurácie:"
ls -la /etc/nginx/sites-enabled/ | grep marselabakery

echo ""
echo "======================================================"
echo "✅ Nastavenie dokončené!"
echo ""
echo "📋 Ďalšie kroky:"
echo "   1. Skontrolujte: https://marselabakery.sk"
echo "   2. Ak máte problémy, skontrolujte logy:"
echo "      sudo tail -f /var/log/nginx/error.log"

