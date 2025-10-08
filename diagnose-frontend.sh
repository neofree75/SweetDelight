#!/bin/bash
# Script na diagnostiku frontend problému

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "🔍 Diagnostikujem frontend problém..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "📁 Kontrolujem priečinky..."
echo "Dist priečinok:"
ls -la dist/ 2>/dev/null || echo "❌ Dist priečinok neexistuje"

echo -e "\n📁 Dist/public priečinok:"
ls -la dist/public/ 2>/dev/null || echo "❌ Dist/public priečinok neexistuje"

echo -e "\n📁 Frontend súbory:"
ls -la dist/public/index.html 2>/dev/null || echo "❌ index.html neexistuje"
ls -la dist/public/assets/ 2>/dev/null || echo "❌ assets priečinok neexistuje"

echo -e "\n🔍 Kontrolujem obsah index.html..."
if [ -f "dist/public/index.html" ]; then
    echo "✅ index.html existuje"
    echo "📋 Prvých 20 riadkov:"
    head -20 dist/public/index.html
else
    echo "❌ index.html neexistuje!"
fi

echo -e "\n🌐 Testovanie servera..."
echo "Testujem API endpoint:"
curl -s http://localhost:$PORT/api/products | jq '.[0].name' 2>/dev/null || echo "❌ API nefunguje"

echo -e "\nTestujem frontend:"
curl -s -I http://localhost:$PORT/ | head -5

echo -e "\n🔍 Kontrolujem PM2 procesy..."
pm2 list

echo -e "\n📋 PM2 logy (posledných 10 riadkov):"
pm2 logs $APP_NAME --lines 10

echo -e "\n🔍 Kontrolujem environment variables..."
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"

echo -e "\n✅ Diagnostika dokončená!"
