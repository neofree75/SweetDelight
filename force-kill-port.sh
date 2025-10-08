#!/bin/bash
# Script na vynútené zabitie portu a reštart servera

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "💀 Vynútené zabitie portu $PORT..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "🔍 Hľadám procesy na porte $PORT..."
lsof -i:$PORT

echo "💀 Zabíjam všetky procesy na porte $PORT..."
# Zabij všetky procesy na porte 5001
sudo fuser -k $PORT/tcp 2>/dev/null || true

# Alternatívne zabij cez lsof
PIDS=$(lsof -t -i:$PORT)
if [ -n "$PIDS" ]; then
  echo "💀 Zabíjam procesy: $PIDS"
  echo $PIDS | xargs kill -9 2>/dev/null || true
fi

echo "⏳ Čakám na uvoľnenie portu..."
sleep 3

echo "🔍 Kontrolujem, či je port voľný..."
if lsof -t -i:$PORT > /dev/null; then
  echo "❌ Port $PORT je stále obsadený!"
  echo "📋 Procesy na porte:"
  lsof -i:$PORT
  echo "💀 Vynútené zabitie všetkých procesov..."
  sudo pkill -f "node.*dist/index.js" || true
  sudo pkill -f "SweetDelight" || true
  sleep 2
else
  echo "✅ Port $PORT je voľný."
fi

echo "🗑️ Mažem všetky PM2 procesy..."
pm2 delete all || true
pm2 kill || true

echo "⏳ Čakám na úplné uvoľnenie..."
sleep 3

echo "🔍 Finálna kontrola portu..."
if lsof -t -i:$PORT > /dev/null; then
  echo "❌ Port $PORT je stále obsadený!"
  echo "📋 Procesy na porte:"
  lsof -i:$PORT
  exit 1
else
  echo "✅ Port $PORT je voľný."
fi

echo "🚀 Spúšťam $APP_NAME cez PM2..."
pm2 start dist/index.js --name $APP_NAME --cwd $APP_DIR --env production

echo "⏳ Čakám na spustenie servera..."
sleep 5

echo "🔍 Kontrolujem PM2 stav..."
pm2 status

echo "🧪 Testovanie..."
echo "API test:"
curl -s http://localhost:$PORT/api/products | jq '.[0].name' 2>/dev/null || echo "❌ API nefunguje"

echo -e "\nFrontend test:"
curl -s -I http://localhost:$PORT/ | head -3

echo -e "\n🔍 PM2 logy (posledných 15 riadkov):"
pm2 logs $APP_NAME --lines 15

echo "✅ Server reštartovaný!"
