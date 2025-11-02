#!/bin/bash
# Test ERPNext connection and product fetching

echo "🔍 Testing ERPNext Connection"
echo "=============================="
echo ""

cd /var/www/SweetDelight || exit 1

# Load environment variables (safe way - handles special characters)
if [ -f ".env" ]; then
    # Use set -a to export all variables, but source instead of export $(cat...)
    set -a
    source .env
    set +a
    echo "✅ Environment variables loaded"
else
    echo "❌ .env file not found!"
    exit 1
fi

echo ""
echo "1. Checking environment variables..."
if [ -z "$ERPNEXT_URL" ]; then
    echo "❌ ERPNEXT_URL not set"
else
    echo "✅ ERPNEXT_URL: ${ERPNEXT_URL:0:50}..."
fi

if [ -z "$ERPNEXT_API_KEY" ]; then
    echo "❌ ERPNEXT_API_KEY not set"
else
    echo "✅ ERPNEXT_API_KEY: ${ERPNEXT_API_KEY:0:20}..."
fi

if [ -z "$ERPNEXT_API_SECRET" ]; then
    echo "❌ ERPNEXT_API_SECRET not set"
else
    echo "✅ ERPNEXT_API_SECRET: ***"
fi

echo ""

# Check if server is running
echo "2. Checking if Node.js server is running..."
if lsof -i:5001 > /dev/null 2>&1; then
    PID=$(lsof -t -i:5001)
    echo "✅ Server is running on port 5001 (PID: $PID)"
else
    echo "❌ Server is NOT running on port 5001!"
    echo "   → Start server: pm2 start dist/index.js --name SweetDelight"
    echo "   → Or check: pm2 status"
    echo ""
fi

# Test API debug endpoint
echo ""
echo "3. Testing /api/debug/config endpoint..."
CONFIG_RESPONSE=$(curl -s http://localhost:5001/api/debug/config 2>&1)
if echo "$CONFIG_RESPONSE" | grep -q "<!DOCTYPE html\|<html"; then
    echo "❌ API returns HTML instead of JSON!"
    echo "   This means nginx is serving static files instead of proxying to Node.js"
    echo "   → Check nginx config: sudo cat /etc/nginx/sites-available/sweetdelight.conf | grep -A 5 'location /api'"
    echo "   → Ensure location /api comes BEFORE location /"
    echo "   → Reload nginx: sudo systemctl reload nginx"
    echo ""
    echo "   Response preview: $(echo "$CONFIG_RESPONSE" | head -c 200)"
else
    echo "✅ API returns JSON"
    echo "$CONFIG_RESPONSE" | jq '.' 2>/dev/null || echo "$CONFIG_RESPONSE"
fi

echo ""

# Test Website Items directly
echo "4. Testing ERPNext Website Items API directly..."
if [ -n "$ERPNEXT_URL" ] && [ -n "$ERPNEXT_API_KEY" ] && [ -n "$ERPNEXT_API_SECRET" ]; then
    echo "   URL: ${ERPNEXT_URL}"
    echo "   API Key: ${ERPNEXT_API_KEY:0:15}..."
    
    # Test published Website Items
    WEBSITE_ITEMS=$(curl -s -X GET \
        "${ERPNEXT_URL}/api/resource/Website%20Item" \
        -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
        -H "Content-Type: application/json" \
        -G --data-urlencode 'fields=["name","item_code","published","route","website_image"]' \
        --data-urlencode 'filters=[["published","=",1]]' \
        --data-urlencode "limit_page_length=100" 2>&1)
    
    # Check for errors
    if echo "$WEBSITE_ITEMS" | grep -q "error\|exception\|Error\|Exception"; then
        echo "❌ Error from ERPNext API:"
        echo "$WEBSITE_ITEMS" | head -c 500
        echo ""
    elif echo "$WEBSITE_ITEMS" | grep -q '"data"'; then
        # Try to parse count, handle both array and object formats
        if echo "$WEBSITE_ITEMS" | jq -e '.data | type == "array"' > /dev/null 2>&1; then
            COUNT=$(echo "$WEBSITE_ITEMS" | jq '.data | length' 2>/dev/null)
        elif echo "$WEBSITE_ITEMS" | jq -e '.data' > /dev/null 2>&1; then
            COUNT=$(echo "$WEBSITE_ITEMS" | jq '[.data] | length' 2>/dev/null)
        else
            COUNT="unknown"
        fi
        
        echo "✅ Website Items API response received"
        echo "   Published Website Items: $COUNT"
        echo "   Raw response preview: $(echo "$WEBSITE_ITEMS" | head -c 200)"
        
        if [ "$COUNT" = "0" ] || [ -z "$COUNT" ] || [ "$COUNT" = "unknown" ]; then
            echo ""
            echo "⚠️  No published Website Items found!"
            echo "   Trying without published filter..."
            
            ALL_ITEMS=$(curl -s -X GET \
                "${ERPNEXT_URL}/api/resource/Website%20Item" \
                -H "Authorization: token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}" \
                -H "Content-Type: application/json" \
                -G --data-urlencode 'fields=["name","item_code","published","route"]' \
                --data-urlencode "limit_page_length=100" 2>&1)
            
            # Try to parse count
            if echo "$ALL_ITEMS" | jq -e '.data | type == "array"' > /dev/null 2>&1; then
                ALL_COUNT=$(echo "$ALL_ITEMS" | jq '.data | length' 2>/dev/null)
            elif echo "$ALL_ITEMS" | jq -e '.data' > /dev/null 2>&1; then
                ALL_COUNT=$(echo "$ALL_ITEMS" | jq '[.data] | length' 2>/dev/null)
            else
                ALL_COUNT="unknown"
            fi
            
            echo "   Total Website Items (all): $ALL_COUNT"
            echo "   Raw response preview: $(echo "$ALL_ITEMS" | head -c 200)"
            
            if [ "$ALL_COUNT" != "0" ] && [ -n "$ALL_COUNT" ] && [ "$ALL_COUNT" != "unknown" ]; then
                echo ""
                echo "⚠️  Website Items exist but are NOT published!"
                echo ""
                echo "   Sample items (first 3):"
                echo "$ALL_ITEMS" | jq '.data[0:3] | .[] | {name, item_code, published}' 2>/dev/null || echo "$ALL_ITEMS" | head -c 500
                echo ""
                echo "   SOLUTION: Set published=1 for Website Items in ERPNext"
                echo "   Go to: ${ERPNEXT_URL}/app/website-item"
            else
                echo ""
                echo "❌ No Website Items exist at all!"
                echo "   You need to create Website Items in ERPNext first"
            fi
        else
            echo ""
            echo "✅ Sample published Website Items (first 3):"
            echo "$WEBSITE_ITEMS" | jq '.data[0:3] | .[] | {name, item_code, published}' 2>/dev/null || echo "$WEBSITE_ITEMS" | head -c 500
            
            # Check if they have item_code
            echo ""
            echo "   Checking item_code mapping..."
            WITH_ITEM_CODE=$(echo "$WEBSITE_ITEMS" | jq '[.data[] | select(.item_code != null and .item_code != "")] | length' 2>/dev/null || echo "0")
            echo "   Website Items with item_code: $WITH_ITEM_CODE / $COUNT"
            
            if [ "$WITH_ITEM_CODE" = "0" ]; then
                echo "   ⚠️  WARNING: Website Items have no item_code!"
                echo "   → Products cannot be mapped to Item doctype"
            fi
        fi
    else
        echo "❌ Unexpected response format:"
        echo "$WEBSITE_ITEMS" | head -c 500
    fi
else
    echo "❌ Cannot test - missing credentials"
fi

echo ""

# Test debug endpoints
echo "5. Testing /api/debug/website-items endpoint..."
WEBSITE_ITEMS_RESPONSE=$(curl -s http://localhost:5001/api/debug/website-items 2>&1)
if echo "$WEBSITE_ITEMS_RESPONSE" | grep -q "<!DOCTYPE html"; then
    echo "❌ Returns HTML"
else
    echo "✅ Returns JSON"
    echo "$WEBSITE_ITEMS_RESPONSE" | jq '.total, .sample' 2>/dev/null || echo "$WEBSITE_ITEMS_RESPONSE" | head -c 500
fi

echo ""

echo "6. Testing /api/products endpoint..."
PROD_RESPONSE=$(curl -s http://localhost:5001/api/products 2>&1)
PROD_COUNT=$(echo "$PROD_RESPONSE" | jq 'length' 2>/dev/null || echo "unknown")

if [ "$PROD_COUNT" = "0" ]; then
    echo "⚠️  Products endpoint returns empty array"
    echo "   This might mean:"
    echo "   1. No published Website Items in ERPNext"
    echo "   2. Items exist but are not mapped to Item doctype"
    echo "   3. Items are disabled"
    echo "   4. ERPNext connection issue"
else
    echo "✅ Products endpoint returns $PROD_COUNT products"
fi

echo ""
echo "=============================="
echo "Done!"

