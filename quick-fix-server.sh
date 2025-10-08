#!/bin/bash
# Script na rýchlu opravu servera

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "🔧 Rýchla oprava servera..."

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

echo "🔨 Buildujem server..."
NODE_ENV=production npm run build || { echo "❌ Build zlyhal"; exit 1; }

echo "🔎 Kontrolujem procesy na porte $PORT..."
PID=$(lsof -t -i:$PORT)

if [ -n "$PID" ]; then
  echo "⛔ Na porte $PORT beží proces s PID $PID. Zabíjam..."
  kill -9 $PID
  sleep 2
else
  echo "✅ Port $PORT je voľný."
fi

echo "🗑️ Mažem staré PM2 procesy..."
pm2 delete $APP_NAME || true

echo "🚀 Spúšťam $APP_NAME cez PM2..."
pm2 start dist/index.js --name $APP_NAME --cwd $APP_DIR --env production

echo "⏳ Čakám na spustenie servera..."
sleep 5

echo "🧪 Testovanie..."
echo "API test:"
curl -s http://localhost:$PORT/api/products | jq '.[0].name' 2>/dev/null || echo "❌ API nefunguje"

echo -e "\nFrontend test:"
curl -s -I http://localhost:$PORT/ | head -3

echo -e "\n🔍 PM2 logy (posledných 10 riadkov):"
pm2 logs $APP_NAME --lines 10

echo "✅ Server opravený!"
