#!/bin/bash
# Quick fix for API routing issues

echo "🔧 Fixing API Routing Issues"
echo "============================"
echo ""

cd /var/www/SweetDelight || exit 1

# Step 1: Check and start server
echo "1. Checking Node.js server..."
if lsof -i:5001 > /dev/null 2>&1; then
    PID=$(lsof -t -i:5001)
    echo "✅ Server is running (PID: $PID)"
else
    echo "❌ Server is NOT running"
    echo "   Starting server..."
    
    if [ ! -f "dist/index.js" ]; then
        echo "   ⚠️  Build not found, building..."
        npm run build
    fi
    
    # Load env vars for PM2
    if [ -f ".env" ]; then
        set -a
        source .env
        set +a
    fi
    
    pm2 start dist/index.js --name SweetDelight --cwd /var/www/SweetDelight || {
        echo "   ❌ Failed to start server"
        exit 1
    }
    
    echo "   ✅ Server started"
    sleep 3
fi

# Step 2: Test direct API call
echo ""
echo "2. Testing direct API call (localhost:5001)..."
DIRECT_TEST=$(curl -s http://localhost:5001/api/test 2>&1)
if echo "$DIRECT_TEST" | grep -q "<!DOCTYPE html\|<html"; then
    echo "❌ Direct API call returns HTML!"
    echo "   This means the server is not handling API routes correctly"
    echo "   Check server logs: pm2 logs SweetDelight"
else
    echo "✅ Direct API call returns JSON"
    echo "   Response: $(echo "$DIRECT_TEST" | head -c 100)"
fi

# Step 3: Check nginx config
echo ""
echo "3. Checking nginx configuration..."
NGINX_CONFIG="/etc/nginx/sites-available/sweetdelight.conf"

if [ -f "$NGINX_CONFIG" ]; then
    # Check if location /api exists and is before location /
    API_LINE=$(grep -n "^[[:space:]]*location /api" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
    ROOT_LINE=$(grep -n "^[[:space:]]*location /" "$NGINX_CONFIG" | grep -v "/api" | head -1 | cut -d: -f1)
    
    if [ -z "$API_LINE" ]; then
        echo "❌ No location /api block found!"
        echo "   Adding location /api block..."
        
        # Create backup
        sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Insert location /api before location /
        sudo sed -i "/^[[:space:]]*location \/ {/i\\    location /api {\\n        proxy_pass http://127.0.0.1:5001;\\n        proxy_http_version 1.1;\\n        proxy_set_header Host \$host;\\n        proxy_set_header X-Real-IP \$remote_addr;\\n        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;\\n        proxy_set_header X-Forwarded-Proto \$scheme;\\n    }" "$NGINX_CONFIG"
        
        echo "   ✅ Added location /api block"
    elif [ -n "$ROOT_LINE" ] && [ "$API_LINE" -gt "$ROOT_LINE" ]; then
        echo "⚠️  location /api is AFTER location / (wrong order!)"
        echo "   This needs manual fixing - location /api must come before location /"
        echo "   Edit: sudo nano $NGINX_CONFIG"
    else
        # Check if proxy_pass is correct
        if grep -q "location /api" "$NGINX_CONFIG" && grep -q "proxy_pass.*5001" "$NGINX_CONFIG"; then
            echo "✅ Nginx config looks correct"
            
            # Check if it has trailing slash issue
            if grep -q "location /api/" "$NGINX_CONFIG" && grep -q "proxy_pass.*/api/" "$NGINX_CONFIG"; then
                echo "⚠️  Found location /api/ with trailing slash - this might cause issues"
                echo "   Consider changing to 'location /api' without trailing slash"
            fi
        else
            echo "⚠️  location /api exists but proxy_pass might be wrong"
        fi
    fi
    
    # Test nginx config
    echo ""
    echo "   Testing nginx config syntax..."
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo "   ✅ Nginx config is valid"
        
        read -p "   Reload nginx? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo systemctl reload nginx
            echo "   ✅ Nginx reloaded"
        fi
    else
        echo "   ❌ Nginx config has errors:"
        sudo nginx -t
    fi
else
    echo "❌ Nginx config not found at $NGINX_CONFIG"
fi

# Step 4: Final test
echo ""
echo "4. Final test..."
sleep 2

# Test through nginx (if nginx is configured)
NGINX_TEST=$(curl -s https://bakery.erpnext.sk/api/test 2>&1 | head -c 200)
if echo "$NGINX_TEST" | grep -q "<!DOCTYPE html\|<html"; then
    echo "❌ External API (via nginx) still returns HTML"
    echo "   → Nginx might need restart: sudo systemctl restart nginx"
    echo "   → Or check nginx config manually"
else
    echo "✅ External API returns JSON"
    echo "   Response: $NGINX_TEST"
fi

echo ""
echo "============================"
echo "Done!"
echo ""
echo "If API still returns HTML:"
echo "1. Check server logs: pm2 logs SweetDelight"
echo "2. Verify nginx config: sudo cat $NGINX_CONFIG | grep -A 5 'location /api'"
echo "3. Ensure location /api comes BEFORE location /"
echo "4. Restart nginx: sudo systemctl restart nginx"

