#!/bin/bash
# Script na opravu servera - vyriešenie port problému a reštart

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "🔧 Opravujem server..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "🔍 Kontrolujem procesy na porte $PORT..."
PID=$(lsof -t -i:$PORT)

if [ -n "$PID" ]; then
  echo "⛔ Na porte $PORT beží proces s PID $PID. Zabíjam..."
  kill -9 $PID
  sleep 2
else
  echo "✅ Port $PORT je voľný."
fi

echo "🗑️ Mažem všetky PM2 procesy pre $APP_NAME..."
pm2 delete $APP_NAME || true
pm2 delete all || true

echo "⏳ Čakám na uvoľnenie portu..."
sleep 3

echo "🔍 Kontrolujem, či je port voľný..."
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

echo "🔍 Kontrolujem stav PM2..."
pm2 status

echo "🧪 Testovanie login..."
node test-login.js http://localhost:$PORT

echo "✅ Server opravený!"
