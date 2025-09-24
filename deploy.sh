#!/bin/bash
# Deploy script pre SweetDelight

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "🚀 Deploy začína pre $APP_NAME..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "📥 Sťahujem nové zmeny z GitHubu..."
git pull origin replit-agent || { echo "❌ Nepodarilo sa stiahnuť nové zmeny"; exit 1; }

echo "📦 Inštalujem závislosti..."
npm install || { echo "❌ NPM install zlyhal"; exit 1; }

echo "🧹 Čistím starý build..."
rm -rf dist/*

echo "🔨 Build projektu..."
NODE_ENV=production npm run build || { echo "❌ Build zlyhal"; exit 1; }

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
pm2 start dist/index.js --name $APP_NAME --cwd $APP_DIR

echo "💾 Ukladám PM2 konfiguráciu..."
pm2 save

echo "🔍 Kontrolujem načítané env hodnoty..."
pm2 show $APP_NAME | grep -A 5 "env"

echo "✅ Deploy hotový!"