#!/bin/bash
# Fix nginx configuration for API routing

echo "🔧 Fixing Nginx API Routing"
echo "==========================="
echo ""

NGINX_CONFIG="/etc/nginx/sites-available/sweetdelight.conf"

if [ ! -f "$NGINX_CONFIG" ]; then
    echo "❌ Nginx config not found at $NGINX_CONFIG"
    exit 1
fi

# Backup
BACKUP_FILE="${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp "$NGINX_CONFIG" "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"
echo ""

# Check current config
echo "Current location blocks:"
sudo grep -n "^[[:space:]]*location" "$NGINX_CONFIG" | head -10
echo ""

# Check if location /api exists
if grep -q "^[[:space:]]*location /api" "$NGINX_CONFIG"; then
    echo "✅ Found location /api block"
    
    # Show the block
    echo ""
    echo "Current /api block:"
    sudo sed -n '/location \/api/,/^[[:space:]]*}/p' "$NGINX_CONFIG" | head -15
    echo ""
    
    # Check if it's before location /
    API_LINE=$(grep -n "^[[:space:]]*location /api" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    ROOT_LINE=$(grep -n "^[[:space:]]*location /" "$NGINX_CONFIG" | grep -v "/api\|/assets" | head -1 | cut -d: -f1)
    
    if [ -n "$API_LINE" ] && [ -n "$ROOT_LINE" ] && [ "$API_LINE" -lt "$ROOT_LINE" ]; then
        echo "✅ location /api is before location / (correct order)"
    else
        echo "❌ location /api is AFTER location / (wrong order!)"
        echo "   This needs manual fixing"
        echo "   Edit: sudo nano $NGINX_CONFIG"
        echo "   Move location /api block BEFORE location / block"
    fi
    
    # Check proxy_pass
    if grep -A 5 "^[[:space:]]*location /api" "$NGINX_CONFIG" | grep -q "proxy_pass.*5001"; then
        echo "✅ proxy_pass points to port 5001"
        
        # Check if it has trailing slash issue
        if grep -A 5 "^[[:space:]]*location /api" "$NGINX_CONFIG" | grep -q "proxy_pass.*/api/"; then
            echo "⚠️  Found proxy_pass with /api/ trailing - this might cause issues"
            echo "   Should be: proxy_pass http://127.0.0.1:5001; (without /api/)"
        fi
    else
        echo "❌ proxy_pass not found or wrong!"
    fi
    
else
    echo "❌ No location /api block found!"
    echo "   Adding location /api block..."
    
    # Find location / block and add /api before it
    ROOT_LINE=$(grep -n "^[[:space:]]*location /" "$NGINX_CONFIG" | grep -v "/api\|/assets" | head -1 | cut -d: -f1)
    
    if [ -n "$ROOT_LINE" ]; then
        # Insert location /api block before location /
        sudo sed -i "${ROOT_LINE}i\\    location /api {\\n        proxy_pass http://127.0.0.1:5001;\\n        proxy_http_version 1.1;\\n        proxy_set_header Upgrade \$http_upgrade;\\n        proxy_set_header Connection \"upgrade\";\\n        proxy_set_header Host \$host;\\n        proxy_set_header X-Real-IP \$remote_addr;\\n        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\n        proxy_set_header X-Forwarded-Proto \$scheme;\\n        proxy_cache_bypass \$http_upgrade;\\n    }" "$NGINX_CONFIG"
        
        echo "✅ Added location /api block"
    else
        echo "❌ Could not find location / block to insert before"
    fi
fi

echo ""

# Show the fixed config
echo "Updated location blocks:"
sudo grep -n "^[[:space:]]*location" "$NGINX_CONFIG" | head -10
echo ""

# Test nginx config
echo "Testing nginx configuration..."
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo "✅ Nginx config is valid"
    echo ""
    
    read -p "Reload nginx now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo systemctl reload nginx
        echo "✅ Nginx reloaded"
        echo ""
        
        # Wait a bit and test
        sleep 2
        echo "Testing API endpoint..."
        API_TEST=$(curl -s http://localhost:5001/api/test 2>&1)
        
        if echo "$API_TEST" | grep -q "<!DOCTYPE html\|<html"; then
            echo "⚠️  Direct API (localhost:5001) returns HTML - server might not be handling routes correctly"
        else
            echo "✅ Direct API returns JSON: $(echo "$API_TEST" | head -c 100)"
        fi
        
        # Test through nginx
        EXTERNAL_TEST=$(curl -s https://bakery.erpnext.sk/api/test 2>&1 | head -c 200)
        if echo "$EXTERNAL_TEST" | grep -q "<!DOCTYPE html\|<html"; then
            echo "❌ External API (via nginx) still returns HTML"
            echo "   → Try restarting nginx: sudo systemctl restart nginx"
        else
            echo "✅ External API returns JSON!"
            echo "   Response: $EXTERNAL_TEST"
        fi
    else
        echo "⚠️  Nginx not reloaded. Reload manually:"
        echo "   sudo systemctl reload nginx"
    fi
else
    echo "❌ Nginx config has errors:"
    sudo nginx -t
    echo ""
    echo "⚠️  Restoring backup..."
    sudo cp "$BACKUP_FILE" "$NGINX_CONFIG"
    echo "✅ Backup restored"
    echo "   Please fix config manually: sudo nano $NGINX_CONFIG"
fi

echo ""
echo "==========================="
echo "Done!"
echo ""
echo "If API still returns HTML:"
echo "1. Check config: sudo cat $NGINX_CONFIG | grep -A 10 'location /api'"
echo "2. Ensure location /api is BEFORE location /"
echo "3. Restart nginx: sudo systemctl restart nginx"

