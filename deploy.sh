#!/bin/bash
# Deploy script pre SweetDelight

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"

echo "🚀 Deploy začína pre $APP_NAME..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "📥 Sťahujem nové zmeny z GitHubu..."
git pull origin replit-agent || { echo "❌ Nepodarilo sa stiahnuť nové zmeny"; exit 1; }

echo "📦 Inštalujem závislosti..."
npm install || { echo "❌ NPM install zlyhal"; exit 1; }

echo "🔨 Build frontendu (s .env.production)..."
npm run build || { echo "❌ Build frontendu zlyhal"; exit

echo "🔨 Build backendu..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist || { echo "❌ Esbuild zlyhal"; exit 1; }

echo "♻️ Reštartujem PM2 proces..."
pm2 restart $APP_NAME || pm2 start dist/index.js --name $APP_NAME

echo "💾 Ukladám PM2 konfiguráciu..."
pm2 save

echo "✅ Deploy hotový!"