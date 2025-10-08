#!/bin/bash
# Script na vynútenie rebuild servera

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "🔨 Vynútený rebuild servera začína..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "📥 Sťahujem najnovšie zmeny z GitHubu..."
git pull origin replit-agent || { echo "❌ Nepodarilo sa stiahnuť nové zmeny"; exit 1; }

echo "🔧 Prepínam na Node 20 cez nvm..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 || { echo "❌ Nepodarilo sa prepnúť na Node 20"; exit 1; }

echo "📦 Inštalujem závislosti..."
npm install || { echo "❌ NPM install zlyhal"; exit 1; }

echo "🧹 Mažem starý build..."
rm -rf dist/*

echo "📝 Načítavam environment variables..."
if [ -f "$APP_DIR/.env" ]; then
    set -a
    source "$APP_DIR/.env"
    set +a
    echo "✅ Environment variables načítané"
else
    echo "⚠️ .env súbor sa nenašiel!"
fi

echo "🔨 Buildujem server a frontend..."
NODE_ENV=production npm run build || { echo "❌ Build zlyhal"; exit 1; }

echo "🔍 Kontrolujem build..."
if [ -f "dist/index.js" ]; then
    echo "✅ Server build existuje"
    ls -la dist/index.js
else
    echo "❌ Server build neexistuje!"
    exit 1
fi

if [ -d "dist/public" ]; then
    echo "✅ Frontend build existuje"
    ls -la dist/public/
else
    echo "❌ Frontend build neexistuje!"
    exit 1
fi

echo "🔎 Kontrolujem proces na porte $PORT..."
PID=$(lsof -t -i:$PORT)

if [ -n "$PID" ]; then
  echo "⛔ Na porte $PORT beží proces s PID $PID. Zabíjam..."
  kill -9 $PID
else
  echo "✅ Port $PORT je voľný."
fi

echo "🗑️ Mažem starý PM2 proces..."
pm2 delete $APP_NAME || true

echo "🚀 Spúšťam $APP_NAME cez PM2..."
pm2 start dist/index.js --name $APP_NAME --cwd $APP_DIR --env production

echo "💾 Ukladám PM2 konfiguráciu..."
pm2 save

echo "⏳ Čakám na spustenie servera..."
sleep 5

echo "🧪 Testovanie login..."
node test-login.js http://localhost:$PORT

echo "🔍 PM2 logy (posledných 20 riadkov):"
pm2 logs $APP_NAME --lines 20

echo "✅ Vynútený rebuild hotový!"
