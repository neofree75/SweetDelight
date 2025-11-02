#!/bin/bash
# Script to apply nginx configuration fix

NGINX_CONFIG_FILE="sweetdelight.conf"
NGINX_SOURCE="/etc/nginx/sites-available/sweetdelight.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/sweetdelight.conf"
BACKUP_FILE="/etc/nginx/sites-available/sweetdelight.conf.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Applying nginx configuration fix..."
echo ""

# Check if we're in the project directory
if [ ! -f "$NGINX_CONFIG_FILE" ]; then
    echo "❌ $NGINX_CONFIG_FILE not found in current directory"
    echo "   Please run this script from the project root directory"
    exit 1
fi

echo "📦 Creating backup of current config..."
if [ -f "$NGINX_SOURCE" ]; then
    sudo cp "$NGINX_SOURCE" "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️  Current config not found, will create new one"
fi

echo ""
echo "📝 Copying new configuration..."
sudo cp "$NGINX_CONFIG_FILE" "$NGINX_SOURCE"
echo "✅ Config copied to $NGINX_SOURCE"

echo ""
echo "🔗 Creating symlink in sites-enabled..."
if [ -L "$NGINX_ENABLED" ]; then
    echo "   Symlink already exists, removing old one..."
    sudo rm "$NGINX_ENABLED"
fi
sudo ln -s "$NGINX_SOURCE" "$NGINX_ENABLED"
echo "✅ Symlink created"

echo ""
echo "🧪 Testing nginx configuration..."
if sudo nginx -t; then
    echo ""
    echo "✅ Nginx configuration is valid!"
    echo ""
    read -p "Do you want to reload nginx now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded successfully"
        echo ""
        echo "🧪 Testing API endpoint..."
        sleep 2
        curl -s https://bakery.erpnext.sk/api/test | head -c 200
        echo ""
    else
        echo "⚠️  Nginx not reloaded. Run manually:"
        echo "   sudo systemctl reload nginx"
    fi
else
    echo ""
    echo "❌ Nginx configuration test failed!"
    echo "   Please check the configuration manually"
    echo "   To restore backup: sudo cp $BACKUP_FILE $NGINX_SOURCE"
    exit 1
fi

echo ""
echo "✅ Done! Your nginx configuration has been updated."

