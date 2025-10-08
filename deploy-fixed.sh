#!/bin/bash
# Opravený deploy script pre SweetDelight

APP_NAME="SweetDelight"
APP_DIR="/var/www/SweetDelight"
PORT=5001

echo "🚀 Opravený deploy začína pre $APP_NAME..."

# Prejdi do adresára projektu
cd $APP_DIR || { echo "❌ Projektový adresár $APP_DIR neexistuje"; exit 1; }

echo "📥 Sťahujem nové zmeny z GitHubu..."
git pull origin replit-agent || { echo "❌ Nepodarilo sa stiahnuť nové zmeny"; exit 1; }

echo "🔧 Prepínam na Node 20 cez nvm..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 || { echo "❌ Nepodarilo sa prepnúť na Node 20"; exit 1; }

echo "📦 Inštalujem závislosti..."
npm install || { echo "❌ NPM install zlyhal"; exit 1; }

echo "🧹 Čistím starý build..."
rm -rf dist/*

echo "📝 Načítavam environment variables pre build..."
if [ -f "$APP_DIR/.env" ]; then
    set -a
    source "$APP_DIR/.env"
    set +a
    echo "✅ Environment variables načítané"
else
    echo "⚠️ .env súbor sa nenašiel!"
fi

echo "🔨 Build projektu s environment variables..."
NODE_ENV=production npm run build || { echo "❌ Build zlyhal"; exit 1; }

echo "🔍 Kontrolujem build..."
if [ -d "dist/public" ]; then
    echo "✅ Frontend build existuje v dist/public"
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

echo "📝 Nastavujem environment variables..."
if [ -f "$APP_DIR/.env" ]; then
    echo "✅ Našiel som .env súbor"
    set -a
    source "$APP_DIR/.env"
    set +a
else
    echo "⚠️  .env súbor sa nenašiel v $APP_DIR"
fi

echo "🚀 Spúšťam $APP_NAME cez PM2 s environment variables..."
pm2 start dist/index.js --name $APP_NAME --cwd $APP_DIR --env production

echo "💾 Ukladám PM2 konfiguráciu..."
pm2 save

echo "⏳ Čakám na spustenie servera..."
sleep 5

echo "🧪 Testovanie servera..."
curl -f http://localhost:$PORT/api/products > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ API endpoint funguje!"
else
    echo "❌ API endpoint nefunguje, kontroluj logy:"
    pm2 logs $APP_NAME --lines 10
fi

echo "🌐 Testovanie frontend..."
curl -f http://localhost:$PORT/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend funguje!"
else
    echo "❌ Frontend nefunguje, kontroluj logy:"
    pm2 logs $APP_NAME --lines 10
fi

echo "✅ Opravený deploy hotový!"
