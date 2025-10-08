#!/bin/bash
# Script na nasadenie najnovších zmien na server

echo "🚀 Nasadenie najnovších zmien na server..."

# Commit a push najnovších zmien
echo "📝 Commitnem najnovšie zmeny..."
git add .
git commit -m "Add debug scripts and fix login response

- Add debug-login-response.js for testing login responses
- Add compare-versions.sh for comparing localhost vs server
- Add deploy-latest.sh for deploying latest changes
- Fix ES module import in debug script"

echo "📤 Pushujem na GitHub..."
git push origin replit-agent

echo "✅ Zmeny sú na GitHubu!"
echo ""
echo "🔧 Teraz sa pripojte na server a spustite:"
echo "   cd /var/www/SweetDelight"
echo "   git pull origin replit-agent"
echo "   ./force-rebuild.sh"
echo ""
echo "📋 Alebo použite SSH jedným príkazom:"
echo "   ssh server 'cd /var/www/SweetDelight && git pull origin replit-agent && ./force-rebuild.sh'"
