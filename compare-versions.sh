#!/bin/bash
# Script na porovnanie verzií medzi localhost a serverom

echo "🔍 Porovnávam verzie medzi localhost a serverom..."

# Test localhost
echo -e "\n📱 LOCALHOST TEST:"
node debug-login-response.js http://localhost:5001

echo -e "\n\n🌐 SERVER TEST:"
echo "Testujem server na: https://sweetdelight.sk"

# Test servera
curl -s -X POST https://sweetdelight.sk/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"rado.sloboda@codeway.sk","password":"Bojnicky428"}' \
  | jq '.' 2>/dev/null || echo "❌ Server neodpovedá alebo JSON nie je validný"

echo -e "\n✅ Porovnanie dokončené!"
