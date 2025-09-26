#!/bin/bash
# Deploy script pre SweetDelight s fix pre Environment Variables

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "🚀 Deploy začína pre $APP_NAME..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "📥 Sťahujem nové zmeny z GitHubu..."
git pull origin replit-agent || { echo "❌ Nepodarilo sa stiahnuť nové zmeny"; exit 1; }

echo "🔧 Prepínam na Node 20 cez nvm..."
export NVM_DIR="$HOME/.nvm"
# načítaj nvm, ak ešte nie je v PATH
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 || { echo "❌ Nepodarilo sa prepnúť na Node 20"; exit 1; }

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

echo "📝 Nastavujem environment variables..."
# Načítaj .env súbor ak existuje
if [ -f "$APP_DIR/.env" ]; then
    echo "✅ Našiel som .env súbor"
    export $(cat $APP_DIR/.env | grep -v '^#' | xargs)
else
    echo "⚠️  .env súbor sa nenašiel v $APP_DIR"
fi

echo "🚀 Spúšťam $APP_NAME cez PM2 s environment variables..."
pm2 start dist/index.js --name $APP_NAME --cwd $APP_DIR --env production

echo "💾 Ukladám PM2 konfiguráciu..."
pm2 save

echo "🔍 Kontrolujem načítané env hodnoty..."
pm2 show $APP_NAME

echo "🔍 Testovanie API endpointu..."
sleep 3
curl -f http://localhost:$PORT/api/products > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API endpoint funguje!"
else
    echo "❌ API endpoint nefunguje, kontroluj logy:"
    pm2 logs $APP_NAME --lines 10
fi

echo "✅ Deploy hotový!"