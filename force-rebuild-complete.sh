#!/bin/bash
# Script na vynútený kompletný rebuild

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "🔨 Vynútený kompletný rebuild..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "📥 Sťahujem najnovšie zmeny..."
git pull origin replit-agent || { echo "❌ Nepodarilo sa stiahnuť zmeny"; exit 1; }

echo "🔧 Prepínam na Node 20..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 || { echo "❌ Nepodarilo sa prepnúť na Node 20"; exit 1; }

echo "📦 Inštalujem závislosti..."
npm install || { echo "❌ NPM install zlyhal"; exit 1; }

echo "🧹 Mažem STARÝ build úplne..."
rm -rf dist/
rm -rf node_modules/.vite/
rm -rf node_modules/.cache/

echo "📝 Načítavam environment variables..."
if [ -f "$APP_DIR/.env" ]; then
    set -a
    source "$APP_DIR/.env"
    set +a
    echo "✅ Environment variables načítané"
else
    echo "⚠️ .env súbor sa nenašiel!"
fi

echo "🔨 Buildujem server a frontend ZNOVU..."
NODE_ENV=production npm run build || { echo "❌ Build zlyhal"; exit 1; }

echo "🔍 Kontrolujem build..."
if [ -f "dist/index.js" ]; then
    echo "✅ Server build existuje"
    ls -la dist/index.js
else
    echo "❌ Server build neexistuje!"
    exit 1
fi

if [ -f "dist/public/index.html" ]; then
    echo "✅ Frontend build existuje"
    ls -la dist/public/
else
    echo "❌ Frontend build neexistuje!"
    exit 1
fi

echo "💀 Zabíjam všetky procesy na porte $PORT..."
sudo fuser -k $PORT/tcp 2>/dev/null || true
PIDS=$(lsof -t -i:$PORT)
if [ -n "$PIDS" ]; then
  echo "💀 Zabíjam procesy: $PIDS"
  echo $PIDS | xargs kill -9 2>/dev/null || true
fi

echo "🗑️ Mažem všetky PM2 procesy..."
pm2 delete all || true
pm2 kill || true

echo "⏳ Čakám na uvoľnenie..."
sleep 3

echo "🔍 Kontrolujem port..."
if lsof -t -i:$PORT > /dev/null; then
  echo "❌ Port $PORT je stále obsadený!"
  exit 1
else
  echo "✅ Port $PORT je voľný."
fi

echo "🚀 Spúšťam $APP_NAME cez PM2..."
pm2 start dist/index.js --name $APP_NAME --cwd $APP_DIR --env production

echo "⏳ Čakám na spustenie servera..."
sleep 8

echo "🔍 Kontrolujem PM2 stav..."
pm2 status

echo "🧪 Testovanie..."
echo "API test:"
curl -s http://localhost:$PORT/api/products | jq '.[0].name' 2>/dev/null || echo "❌ API nefunguje"

echo -e "\nFrontend test:"
curl -s -I http://localhost:$PORT/ | head -3

echo -e "\n🔍 PM2 logy (posledných 20 riadkov):"
pm2 logs $APP_NAME --lines 20

echo "✅ Kompletný rebuild hotový!"
