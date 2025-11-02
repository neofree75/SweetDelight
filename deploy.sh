#!/bin/bash
# Deploy script pre SweetDelight s fix pre Environment Variables

APP_NAME="sweetdelight"
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

echo "💾 Backing up nahrané obrázky z dist/public/assets/gallery..."
# Backup obrázkov nahraných priamo v produkcii pred vymazaním dist/
BACKUP_DIR="/tmp/sweetdelight_gallery_backup_$(date +%s)"
if [ -d "dist/public/assets/gallery" ] && [ "$(ls -A dist/public/assets/gallery 2>/dev/null)" ]; then
    mkdir -p "$BACKUP_DIR"
    cp -r dist/public/assets/gallery/* "$BACKUP_DIR/" 2>/dev/null || true
    echo "✅ Zálohovaných $(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l) obrázkov"
else
    echo "ℹ️  Žiadne obrázky na zálohovanie"
fi

echo "🔧 Opravujem vlastníctvo súborov v dist/..."
# Zmeň vlastníctvo všetkých súborov v dist/ na frappe:frappe, aby sme mohli vymazať
if [ -d "dist" ]; then
    sudo chown -R frappe:frappe dist/ 2>/dev/null || chown -R frappe:frappe dist/ 2>/dev/null || true
    sudo chmod -R 755 dist/ 2>/dev/null || chmod -R 755 dist/ 2>/dev/null || true
fi

echo "🧹 Čistím starý build..."
rm -rf dist/* || sudo rm -rf dist/* || { echo "⚠️  Niektoré súbory sa nedali vymazať, pokračujem..." ; }

echo "📁 Zabezpečujem assets priečinky..."
# Ensure both attached_assets and dist/public/assets directories exist
mkdir -p attached_assets/gallery
mkdir -p dist/public/assets/gallery
chmod 755 attached_assets/gallery
chmod 755 dist/public/assets/gallery

echo "🔍 Kontrolujem attached_assets priečinok..."
ls -la attached_assets/gallery/ || echo "⚠️ Attached_assets priečinok je prázdny alebo neexistuje"

echo "🔍 Kontrolujem dist/public/assets/gallery priečinok..."
ls -la dist/public/assets/gallery/ || echo "⚠️ dist/public/assets/gallery priečinok je prázdny alebo neexistuje"

echo "📋 Kontrolujem, či existujú obrázky v galérii..."
if [ -d "dist/public/assets/gallery" ] && [ "$(ls -A dist/public/assets/gallery)" ]; then
    echo "✅ dist/public/assets/gallery priečinok obsahuje obrázky:"
    ls -la dist/public/assets/gallery/
else
    echo "⚠️ dist/public/assets/gallery priečinok je prázdny alebo neexistuje"
    echo "💡 Nové obrázky sa ukladajú priamo do dist/public/assets/gallery"
fi

echo "📝 Načítavam environment variables pre build..."
# Načítaj .env súbor pre Vite build (VITE_ variables)
# Používame set -a aby sa exportovali všetky premenné
if [ -f "$APP_DIR/.env" ]; then
    # Použijeme set -a namiesto export $(cat...), ktorý môže mať problémy s medzerami
    set -a
    source "$APP_DIR/.env" 2>/dev/null || . "$APP_DIR/.env" 2>/dev/null
    set +a
    echo "✅ Environment variables načítané"
else
    echo "⚠️ .env súbor sa nenašiel!"
fi

echo "🔨 Build projektu s environment variables..."
NODE_ENV=production npm run build || { echo "❌ Build zlyhal"; exit 1; }

echo "📥 Obnovujem zálohované obrázky..."
# Obnov zálohované obrázky po build (build skopíruje z attached_assets, ale my chceme aj produkčné)
if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
    mkdir -p dist/public/assets/gallery
    cp -r "$BACKUP_DIR"/* dist/public/assets/gallery/ 2>/dev/null || true
    # Zabezpeč správne vlastníctvo obnovených súborov
    chown -R frappe:frappe dist/public/assets/gallery/ 2>/dev/null || sudo chown -R frappe:frappe dist/public/assets/gallery/ 2>/dev/null || true
    chmod -R 755 dist/public/assets/gallery/ 2>/dev/null || sudo chmod -R 755 dist/public/assets/gallery/ 2>/dev/null || true
    echo "✅ Obnovených $(ls -1 "$BACKUP_DIR" 2>/dev/null | wc -l) obrázkov"
    rm -rf "$BACKUP_DIR"
else
    echo "ℹ️  Žiadne obrázky na obnovenie"
fi

echo "🔧 Nastavujem správne vlastníctvo pre dist/..."
# Zabezpeč, že všetky súbory v dist/ sú vlastnené frappe:frappe
chown -R frappe:frappe dist/ 2>/dev/null || sudo chown -R frappe:frappe dist/ 2>/dev/null || true
chmod -R 755 dist/ 2>/dev/null || sudo chmod -R 755 dist/ 2>/dev/null || true

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

echo "📝 Nastavujem environment variables pre PM2..."
# PM2 potrebuje env variables explicitne alebo cez ecosystem file
# Použijeme --update-env aby PM2 načítal env z prostredia
# Env variables sú už načítané vyššie cez source .env
if [ -f "$APP_DIR/.env" ]; then
    echo "✅ Našiel som .env súbor, env variables sú už načítané"
else
    echo "⚠️  .env súbor sa nenašiel v $APP_DIR"
fi

echo "🚀 Spúšťam $APP_NAME cez PM2..."
# Použijeme --update-env aby PM2 použil aktuálne env variables z shellu
pm2 start dist/index.js --name $APP_NAME --cwd $APP_DIR --update-env

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