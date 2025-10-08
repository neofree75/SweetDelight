#!/bin/bash
# Script na kontrolu servera

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"

echo "🔍 Kontrolujem stav servera..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "📁 Kontrolujem priečinky..."
echo "Dist priečinok:"
ls -la dist/ 2>/dev/null || echo "❌ Dist priečinok neexistuje"

echo -e "\n📁 Dist/public priečinok:"
ls -la dist/public/ 2>/dev/null || echo "❌ Dist/public priečinok neexistuje"

echo -e "\n📁 Server súbory:"
ls -la dist/index.js 2>/dev/null || echo "❌ dist/index.js neexistuje"

echo -e "\n🔍 Kontrolujem git status..."
git status --porcelain

echo -e "\n📅 Posledný commit:"
git log --oneline -1

echo -e "\n🔍 Kontrolujem PM2 procesy..."
pm2 list

echo -e "\n📋 PM2 logy (posledných 10 riadkov):"
pm2 logs $APP_NAME --lines 10

echo -e "\n🌐 Testovanie servera..."
curl -s http://localhost:5001/api/products | jq '.[0].name' 2>/dev/null || echo "❌ API nefunguje"

echo -e "\n✅ Kontrola dokončená!"
