#!/bin/bash
# Script to check production server status and API routes

echo "🔍 Checking production server status..."
echo ""

# Check if server is running
echo "1. Checking if Node.js process is running on port 5001:"
lsof -i:5001 || echo "❌ No process found on port 5001"
echo ""

# Check if server responds locally
echo "2. Testing local API endpoint (port 5001):"
curl -s http://localhost:5001/api/test || echo "❌ Local API not responding"
echo ""
echo ""

# Check if reverse proxy is configured
echo "3. Checking nginx configuration (if exists):"
if [ -f /etc/nginx/sites-enabled/default ]; then
  echo "Found nginx config:"
  cat /etc/nginx/sites-enabled/default | grep -A 10 "location"
else
  echo "⚠️  No nginx config found in /etc/nginx/sites-enabled/default"
fi
echo ""

# Check server logs (last 20 lines)
echo "4. Recent server logs:"
if [ -f ~/.pm2/logs/SweetDelight-out.log ]; then
  tail -20 ~/.pm2/logs/SweetDelight-out.log
elif [ -f /var/log/pm2/SweetDelight-out.log ]; then
  tail -20 /var/log/pm2/SweetDelight-out.log
else
  echo "⚠️  Could not find PM2 logs"
fi
echo ""

# Check if API routes are registered
echo "5. Testing API endpoints:"
echo "   /api/test:"
curl -s http://localhost:5001/api/test | head -c 200
echo ""
echo ""
echo "   /api/health:"
curl -s http://localhost:5001/api/health | head -c 200
echo ""

