#!/bin/bash
# Complete fix script for hosting issues

echo "🔧 Fixing SweetDelight hosting issues..."
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Fix nginx configuration
echo "1. Fixing nginx configuration..."
NGINX_CONFIG="/etc/nginx/sites-available/sweetdelight.conf"

if [ -f "$NGINX_CONFIG" ]; then
    # Backup
    sudo cp "$NGINX_CONFIG" "${NGINX_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "   ✅ Backup created"
    
    # Check current config
    if grep -q "location /api/" "$NGINX_CONFIG"; then
        echo "   ⚠️  Found location /api/ (with trailing slash)"
        echo "   → Updating to location /api (without trailing slash)..."
        
        # Replace location /api/ with location /api
        sudo sed -i.tmp 's|location /api/ {|location /api {|g' "$NGINX_CONFIG"
        sudo sed -i.tmp 's|proxy_pass http://127.0.0.1:5001/api/;|proxy_pass http://127.0.0.1:5001;|g' "$NGINX_CONFIG"
        
        # Remove redirect block if exists (location = /api)
        sudo sed -i.tmp '/^[[:space:]]*location = \/api {/,/^[[:space:]]*}/d' "$NGINX_CONFIG"
        
        # Remove any duplicate proxy_hide_header lines that might have been added
        sudo sed -i.tmp '/proxy_hide_header Content-Type;/d' "$NGINX_CONFIG"
        sudo sed -i.tmp '/add_header Content-Type application\/json/d' "$NGINX_CONFIG"
        
        echo "   ✅ Config updated"
    elif grep -q "location /api {" "$NGINX_CONFIG"; then
        # Check if proxy_pass has trailing slash
        if grep -q "proxy_pass http://127.0.0.1:5001/api/" "$NGINX_CONFIG"; then
            echo "   ⚠️  Found location /api but proxy_pass has trailing slash"
            sudo sed -i.tmp 's|proxy_pass http://127.0.0.1:5001/api/;|proxy_pass http://127.0.0.1:5001;|g' "$NGINX_CONFIG"
            echo "   ✅ Fixed proxy_pass"
        else
            echo "   ✅ Config looks correct"
        fi
    else
        echo "   ⚠️  No /api location found, adding it..."
        # This would require more complex sed, better to do manually
        echo "   → Please add location /api block manually"
    fi
    
    # Test nginx config
    echo ""
    echo "   Testing nginx configuration..."
    if sudo nginx -t; then
        echo -e "   ${GREEN}✅ Nginx config is valid${NC}"
        echo ""
        read -p "   Reload nginx now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo systemctl reload nginx
            echo -e "   ${GREEN}✅ Nginx reloaded${NC}"
        fi
    else
        echo -e "   ${RED}❌ Nginx config has errors!${NC}"
        echo "   Restore backup and fix manually"
    fi
else
    echo -e "   ${RED}❌ Nginx config not found at $NGINX_CONFIG${NC}"
fi

echo ""

# Step 2: Check and start Node.js server
echo "2. Checking Node.js server..."
cd /var/www/SweetDelight || exit 1

if lsof -i:5001 > /dev/null 2>&1; then
    PID=$(lsof -t -i:5001)
    echo -e "   ${GREEN}✅ Server is running on port 5001 (PID: $PID)${NC}"
else
    echo -e "   ${RED}❌ Server is NOT running${NC}"
    echo "   Attempting to start server..."
    
    # Try PM2 first
    if command -v pm2 &> /dev/null; then
        echo "   Using PM2 to start server..."
        if pm2 list | grep -q "SweetDelight"; then
            pm2 restart SweetDelight
        else
            pm2 start npm --name "SweetDelight" -- start
            pm2 save
        fi
        sleep 3
        
        if lsof -i:5001 > /dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Server started with PM2${NC}"
        else
            echo -e "   ${RED}❌ Failed to start server${NC}"
            echo "   Check logs: pm2 logs SweetDelight"
        fi
    else
        echo -e "   ${YELLOW}⚠️  PM2 not found. Install it: npm install -g pm2${NC}"
        echo "   Or start manually: npm start"
    fi
fi

echo ""

# Step 3: Test API endpoints
echo "3. Testing API endpoints..."
echo ""

# Test local
echo "   Local API (localhost:5001/api/test):"
LOCAL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:5001/api/test 2>&1)
LOCAL_STATUS=$(echo "$LOCAL_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
LOCAL_BODY=$(echo "$LOCAL_RESPONSE" | sed '/HTTP_STATUS/d' | head -c 100)

if [ "$LOCAL_STATUS" = "200" ]; then
    if echo "$LOCAL_BODY" | grep -q "<!DOCTYPE html\|<html"; then
        echo -e "   ${RED}❌ Returns HTML (nginx forwarding to static files)${NC}"
    else
        echo -e "   ${GREEN}✅ Returns JSON: $LOCAL_BODY${NC}"
    fi
else
    echo -e "   ${RED}❌ Status: $LOCAL_STATUS${NC}"
fi

echo ""

# Test through nginx
echo "   External API (https://bakery.erpnext.sk/api/test):"
EXTERNAL_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" https://bakery.erpnext.sk/api/test 2>&1)
EXTERNAL_STATUS=$(echo "$EXTERNAL_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
EXTERNAL_BODY=$(echo "$EXTERNAL_RESPONSE" | sed '/HTTP_STATUS/d' | head -c 100)

if [ "$EXTERNAL_STATUS" = "200" ]; then
    if echo "$EXTERNAL_BODY" | grep -q "<!DOCTYPE html\|<html"; then
        echo -e "   ${RED}❌ Returns HTML (nginx not forwarding correctly)${NC}"
        echo "   → Check nginx config and ensure location /api is before location /"
    else
        echo -e "   ${GREEN}✅ Returns JSON: $EXTERNAL_BODY${NC}"
    fi
else
    echo -e "   ${RED}❌ Status: $EXTERNAL_STATUS${NC}"
fi

echo ""

# Step 4: Check products endpoint
echo "4. Testing products endpoint..."
PROD_RESPONSE=$(curl -s http://localhost:5001/api/products 2>&1)
PROD_COUNT=$(echo "$PROD_RESPONSE" | jq 'length' 2>/dev/null || echo "unknown")

if [ "$PROD_COUNT" = "0" ] || [ -z "$PROD_COUNT" ]; then
    echo -e "   ${YELLOW}⚠️  Products endpoint returns empty array${NC}"
    echo "   → Check ERPNext connection"
    echo "   → Run: curl http://localhost:5001/api/debug/config"
else
    echo -e "   ${GREEN}✅ Products endpoint returns $PROD_COUNT products${NC}"
fi

echo ""
echo "========================================"
echo "✅ Fix script completed!"
echo ""
echo "Next steps:"
echo "1. If server wasn't running, check PM2 logs: pm2 logs SweetDelight"
echo "2. If API still returns HTML, verify nginx config and reload"
echo "3. If products are empty, check ERPNext credentials in .env"
echo "4. Run full diagnostic: ./diagnose-hosting.sh"

