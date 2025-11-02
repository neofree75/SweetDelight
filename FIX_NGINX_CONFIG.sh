#!/bin/bash
# Script to fix nginx configuration for API routes

NGINX_CONFIG="/etc/nginx/sites-available/default"
BACKUP_FILE="/etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)"

echo "🔧 Fixing nginx configuration for API routes..."
echo ""

# Check if nginx config exists
if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found at $NGINX_CONFIG"
    echo "   Please specify the correct path to your nginx config file"
    exit 1
fi

# Create backup
echo "📦 Creating backup: $BACKUP_FILE"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo "✅ Backup created"

# Check current config
echo ""
echo "📋 Current location blocks:"
sudo grep -n "location" "$NGINX_CONFIG" | head -10

echo ""
echo "⚠️  Please manually update your nginx config with the following:"
echo ""
echo "1. Change 'location /api' to 'location /api/' (with trailing slash)"
echo "2. Change 'proxy_pass http://127.0.0.1:5001;' to 'proxy_pass http://127.0.0.1:5001/api/;'"
echo "3. Ensure 'location /api/' comes BEFORE 'location /'"
echo ""
echo "See nginx-config-fixed.conf for the corrected version"
echo ""
echo "After updating, run:"
echo "  sudo nginx -t          # Test config"
echo "  sudo systemctl reload nginx  # Apply changes"

