#!/bin/bash
# Check server status and restart if needed

echo "🔍 Checking SweetDelight Server Status"
echo "======================================"
echo ""

cd /var/www/SweetDelight || exit 1

# Check PM2 status
echo "1. PM2 Status:"
pm2 status SweetDelight
echo ""

# Check logs
echo "2. Recent Error Logs (last 50 lines):"
echo "--------------------------------------"
pm2 logs SweetDelight --err --lines 50 --nostream || echo "No error logs found"
echo ""

echo "3. Recent Output Logs (last 20 lines):"
echo "--------------------------------------"
pm2 logs SweetDelight --out --lines 20 --nostream || echo "No output logs found"
echo ""

# Check if dist/index.js exists
echo "4. Checking build files:"
if [ -f "dist/index.js" ]; then
    echo "✅ dist/index.js exists"
    ls -lh dist/index.js
else
    echo "❌ dist/index.js NOT found!"
    echo "   → Building project..."
    npm run build
fi

echo ""

# Check .env file
echo "5. Checking .env file:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    echo "   Checking critical variables:"
    
    set -a
    source .env
    set +a
    
    if [ -n "$ERPNEXT_URL" ]; then
        echo "   ✅ ERPNEXT_URL: ${ERPNEXT_URL:0:40}..."
    else
        echo "   ❌ ERPNEXT_URL not set"
    fi
    
    if [ -n "$ERPNEXT_API_KEY" ]; then
        echo "   ✅ ERPNEXT_API_KEY: ${ERPNEXT_API_KEY:0:20}..."
    else
        echo "   ❌ ERPNEXT_API_KEY not set"
    fi
    
    if [ -n "$ERPNEXT_API_SECRET" ]; then
        echo "   ✅ ERPNEXT_API_SECRET: set"
    else
        echo "   ❌ ERPNEXT_API_SECRET not set"
    fi
else
    echo "❌ .env file NOT found!"
    exit 1
fi

echo ""

# Try to restart
echo "6. Attempting to restart server..."
echo "--------------------------------------"

# Delete old process
pm2 delete SweetDelight 2>/dev/null || true

# Load environment variables
set -a
source .env
set +a

# Start server
echo "Starting server with PM2..."
pm2 start dist/index.js --name SweetDelight --cwd /var/www/SweetDelight || {
    echo "❌ Failed to start server"
    echo ""
    echo "Trying to start manually to see error..."
    node dist/index.js &
    sleep 2
    kill %1 2>/dev/null || true
    exit 1
}

# Wait a bit
sleep 3

# Check status again
echo ""
echo "7. Server status after restart:"
pm2 status SweetDelight

echo ""

# Test API
echo "8. Testing API endpoint..."
sleep 2
API_TEST=$(curl -s http://localhost:5001/api/test 2>&1)

if echo "$API_TEST" | grep -q "<!DOCTYPE html\|<html"; then
    echo "❌ API still returns HTML"
    echo "   Response: $(echo "$API_TEST" | head -c 200)"
else
    echo "✅ API returns JSON"
    echo "   Response: $API_TEST"
fi

echo ""
echo "=============================="
echo "Done!"
echo ""
echo "If server is still errored, check logs:"
echo "  pm2 logs SweetDelight --err --lines 100"
echo ""
echo "If API returns HTML, check nginx config:"
echo "  sudo cat /etc/nginx/sites-available/sweetdelight.conf | grep -A 5 'location /api'"

