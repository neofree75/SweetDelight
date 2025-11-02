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
if command -v nginx &> /dev/null; then
  echo "✅ Nginx is installed"
  
  # Check multiple possible locations
  NGINX_CONFIG=""
  if [ -f /etc/nginx/sites-enabled/default ]; then
    NGINX_CONFIG="/etc/nginx/sites-enabled/default"
  elif [ -f /etc/nginx/sites-enabled/sweet-delight ]; then
    NGINX_CONFIG="/etc/nginx/sites-enabled/sweet-delight"
  elif [ -f /etc/nginx/nginx.conf ]; then
    NGINX_CONFIG="/etc/nginx/nginx.conf"
  fi
  
  if [ -n "$NGINX_CONFIG" ]; then
    echo "Found nginx config: $NGINX_CONFIG"
    echo ""
    echo "Location blocks:"
    grep -n "location" "$NGINX_CONFIG" | head -20
    echo ""
    
    # Check if /api/ location exists
    if grep -q "location /api/" "$NGINX_CONFIG"; then
      echo "✅ Found location /api/ block"
      # Check order - /api/ should come before /
      API_LINE=$(grep -n "location /api/" "$NGINX_CONFIG" | cut -d: -f1)
      ROOT_LINE=$(grep -n "location /" "$NGINX_CONFIG" | grep -v "/api/" | head -1 | cut -d: -f1)
      
      if [ -n "$API_LINE" ] && [ -n "$ROOT_LINE" ] && [ "$API_LINE" -lt "$ROOT_LINE" ]; then
        echo "✅ /api/ location is before / location (correct order)"
      else
        echo "⚠️  /api/ location may be after / location (wrong order!)"
      fi
    else
      echo "❌ No location /api/ block found! This is the problem!"
      echo "   You need to add location /api/ before location /"
    fi
  else
    echo "⚠️  No nginx config found in standard locations"
    echo "   Checked: /etc/nginx/sites-enabled/default"
    echo "   Checked: /etc/nginx/sites-enabled/sweet-delight"
    echo "   Checked: /etc/nginx/nginx.conf"
  fi
  
  # Test nginx config
  echo ""
  echo "Testing nginx configuration:"
  sudo nginx -t 2>&1 || echo "⚠️  Nginx config test failed"
else
  echo "⚠️  Nginx is not installed or not in PATH"
  echo "   You might be using a different reverse proxy (Apache, Caddy, etc.)"
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

