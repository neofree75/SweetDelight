#!/bin/bash
# Comprehensive diagnostic script for hosting issues

echo "🔍 SweetDelight Hosting Diagnostic"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Node.js server
echo "1. Checking Node.js server..."
SERVER_PORT=${PORT:-5001}
if lsof -i:$SERVER_PORT > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Node.js server is running on port $SERVER_PORT${NC}"
    PID=$(lsof -t -i:$SERVER_PORT)
    echo "   PID: $PID"
    ps -p $PID -o cmd,user,%cpu,%mem --no-headers | head -1
else
    echo -e "${RED}❌ Node.js server is NOT running on port $SERVER_PORT${NC}"
fi
echo ""

# 2. Test local API endpoints
echo "2. Testing local API endpoints (localhost:$SERVER_PORT)..."
echo ""
echo "   /api/test:"
TEST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:$SERVER_PORT/api/test 2>&1)
HTTP_STATUS=$(echo "$TEST_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$TEST_RESPONSE" | sed '/HTTP_STATUS/d')
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}   ✅ Status: $HTTP_STATUS${NC}"
    echo "   Response: $BODY"
else
    echo -e "${RED}   ❌ Status: $HTTP_STATUS${NC}"
    echo "   Response: $BODY"
fi
echo ""

echo "   /api/products (first 200 chars):"
PROD_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:$SERVER_PORT/api/products 2>&1)
PROD_STATUS=$(echo "$PROD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
PROD_BODY=$(echo "$PROD_RESPONSE" | sed '/HTTP_STATUS/d' | head -c 200)
if [ "$PROD_STATUS" = "200" ]; then
    echo -e "${GREEN}   ✅ Status: $PROD_STATUS${NC}"
    echo "   Response preview: $PROD_BODY"
    # Count products if JSON array
    if echo "$PROD_BODY" | grep -q "^\["; then
        COUNT=$(echo "$PROD_RESPONSE" | sed '/HTTP_STATUS/d' | jq 'length' 2>/dev/null || echo "unknown")
        echo "   Products count: $COUNT"
    fi
else
    echo -e "${RED}   ❌ Status: $PROD_STATUS${NC}"
    echo "   Response: $PROD_BODY"
fi
echo ""

echo "   /api/debug/config:"
DEBUG_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" http://localhost:$SERVER_PORT/api/debug/config 2>&1)
DEBUG_STATUS=$(echo "$DEBUG_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
DEBUG_BODY=$(echo "$DEBUG_RESPONSE" | sed '/HTTP_STATUS/d' | head -c 300)
if [ "$DEBUG_STATUS" = "200" ]; then
    echo -e "${GREEN}   ✅ Status: $DEBUG_STATUS${NC}"
    echo "   Response: $DEBUG_BODY"
else
    echo -e "${RED}   ❌ Status: $DEBUG_STATUS${NC}"
    echo "   Response: $DEBUG_BODY"
fi
echo ""

# 3. Check nginx configuration
echo "3. Checking nginx configuration..."
if command -v nginx &> /dev/null; then
    echo -e "${GREEN}✅ Nginx is installed${NC}"
    
    # Find config file
    NGINX_CONFIG=""
    for config in /etc/nginx/sites-enabled/sweetdelight.conf /etc/nginx/sites-enabled/default /etc/nginx/sites-available/sweetdelight.conf; do
        if [ -f "$config" ]; then
            NGINX_CONFIG="$config"
            break
        fi
    done
    
    if [ -n "$NGINX_CONFIG" ]; then
        echo "   Config file: $NGINX_CONFIG"
        echo ""
        echo "   Location blocks:"
        grep -n "^[[:space:]]*location" "$NGINX_CONFIG" | head -10
        echo ""
        
        # Check for /api/ location
        if grep -q "location /api" "$NGINX_CONFIG"; then
            echo -e "${GREEN}✅ Found /api location block${NC}"
            echo "   Block content:"
            sed -n '/location \/api/,/^[[:space:]]*}/p' "$NGINX_CONFIG" | head -15
        else
            echo -e "${RED}❌ No /api location block found!${NC}"
        fi
        
        # Check order
        API_LINE=$(grep -n "location /api" "$NGINX_CONFIG" | head -1 | cut -d: -f1)
        ROOT_LINE=$(grep -n "^[[:space:]]*location /" "$NGINX_CONFIG" | grep -v "/api" | head -1 | cut -d: -f1)
        if [ -n "$API_LINE" ] && [ -n "$ROOT_LINE" ] && [ "$API_LINE" -lt "$ROOT_LINE" ]; then
            echo -e "${GREEN}✅ /api location is before / location (correct order)${NC}"
        else
            echo -e "${YELLOW}⚠️  Order might be incorrect${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Nginx config file not found in standard locations${NC}"
    fi
    
    # Test nginx config
    echo ""
    echo "   Testing nginx config syntax:"
    if sudo nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✅ Nginx config is valid${NC}"
    else
        echo -e "${RED}❌ Nginx config has errors:${NC}"
        sudo nginx -t 2>&1
    fi
else
    echo -e "${YELLOW}⚠️  Nginx not found${NC}"
fi
echo ""

# 4. Test external API (through nginx)
echo "4. Testing external API (through nginx/proxy)..."
echo ""
echo "   https://bakery.erpnext.sk/api/test:"
EXTERNAL_TEST=$(curl -s -w "\nHTTP_STATUS:%{http_code}" https://bakery.erpnext.sk/api/test 2>&1)
EXT_STATUS=$(echo "$EXTERNAL_TEST" | grep "HTTP_STATUS" | cut -d: -f2)
EXT_BODY=$(echo "$EXTERNAL_TEST" | sed '/HTTP_STATUS/d' | head -c 200)
if [ "$EXT_STATUS" = "200" ]; then
    echo -e "${GREEN}   ✅ Status: $EXT_STATUS${NC}"
    echo "   Response: $EXT_BODY"
    
    # Check if it's HTML (bad)
    if echo "$EXT_BODY" | grep -q "<!DOCTYPE html\|<html"; then
        echo -e "${RED}   ❌ WARNING: Response is HTML, not JSON! Nginx is serving static files.${NC}"
    fi
else
    echo -e "${RED}   ❌ Status: $EXT_STATUS${NC}"
    echo "   Response: $EXT_BODY"
fi
echo ""

echo "   https://bakery.erpnext.sk/api/products (first 200 chars):"
EXTERNAL_PROD=$(curl -s -w "\nHTTP_STATUS:%{http_code}" https://bakery.erpnext.sk/api/products 2>&1)
EXT_PROD_STATUS=$(echo "$EXTERNAL_PROD" | grep "HTTP_STATUS" | cut -d: -f2)
EXT_PROD_BODY=$(echo "$EXTERNAL_PROD" | sed '/HTTP_STATUS/d' | head -c 200)
if [ "$EXT_PROD_STATUS" = "200" ]; then
    echo -e "${GREEN}   ✅ Status: $EXT_PROD_STATUS${NC}"
    echo "   Response preview: $EXT_PROD_BODY"
    
    # Check if it's HTML (bad)
    if echo "$EXT_PROD_BODY" | grep -q "<!DOCTYPE html\|<html"; then
        echo -e "${RED}   ❌ WARNING: Response is HTML, not JSON! Nginx is serving static files.${NC}"
        echo -e "${YELLOW}   → This means nginx is not forwarding API requests to Node.js${NC}"
    else
        # Try to count products
        if echo "$EXT_PROD_BODY" | grep -q "^\["; then
            COUNT=$(echo "$EXTERNAL_PROD" | sed '/HTTP_STATUS/d' | jq 'length' 2>/dev/null || echo "unknown")
            echo "   Products count: $COUNT"
            if [ "$COUNT" = "0" ]; then
                echo -e "${YELLOW}   ⚠️  No products returned (check ERPNext connection)${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}   ❌ Status: $EXT_PROD_STATUS${NC}"
    echo "   Response: $EXT_PROD_BODY"
fi
echo ""

# 5. Check environment variables
echo "5. Checking environment variables..."
if [ -f ".env" ]; then
    echo "   Found .env file:"
    grep -E "ERPNEXT_URL|ERPNEXT_API_KEY|ERPNEXT_API_SECRET|NODE_ENV|PORT" .env | sed 's/=.*/=***HIDDEN***/' || echo "   No relevant variables found"
else
    echo -e "${YELLOW}   ⚠️  .env file not found${NC}"
fi
echo ""

# 6. Check server logs
echo "6. Recent server logs (last 30 lines)..."
if [ -f ~/.pm2/logs/SweetDelight-out.log ]; then
    echo "   PM2 logs:"
    tail -30 ~/.pm2/logs/SweetDelight-out.log | grep -E "error|Error|ERROR|api/products|getItems" || echo "   No relevant log entries"
elif [ -f /var/log/pm2/SweetDelight-out.log ]; then
    echo "   PM2 logs:"
    tail -30 /var/log/pm2/SweetDelight-out.log | grep -E "error|Error|ERROR|api/products|getItems" || echo "   No relevant log entries"
else
    echo -e "${YELLOW}   ⚠️  Could not find PM2 logs${NC}"
fi
echo ""

# 7. Summary and recommendations
echo "=================================="
echo "📋 Summary & Recommendations:"
echo ""

if [ "$EXT_PROD_STATUS" != "200" ]; then
    echo -e "${RED}❌ API endpoint is not accessible externally${NC}"
    echo "   → Check nginx configuration and reload: sudo systemctl reload nginx"
fi

if echo "$EXT_PROD_BODY" | grep -q "<!DOCTYPE html\|<html"; then
    echo -e "${RED}❌ API returns HTML instead of JSON${NC}"
    echo "   → Nginx is serving static files instead of proxying to Node.js"
    echo "   → Fix: Ensure location /api/ comes BEFORE location /"
    echo "   → Then: sudo nginx -t && sudo systemctl reload nginx"
fi

if [ "$EXT_PROD_STATUS" = "200" ] && ! echo "$EXT_PROD_BODY" | grep -q "<!DOCTYPE html"; then
    COUNT=$(echo "$EXTERNAL_PROD" | sed '/HTTP_STATUS/d' | jq 'length' 2>/dev/null || echo "0")
    if [ "$COUNT" = "0" ] || [ -z "$COUNT" ]; then
        echo -e "${YELLOW}⚠️  API works but returns 0 products${NC}"
        echo "   → Check ERPNext connection and credentials"
        echo "   → Check /api/debug/config endpoint"
        echo "   → Check server logs for ERPNext errors"
    else
        echo -e "${GREEN}✅ API is working and returning $COUNT products${NC}"
        echo "   → If frontend still doesn't show products, check browser console"
        echo "   → Check if frontend is calling correct API URL"
    fi
fi

echo ""
echo "Done!"

