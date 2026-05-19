#!/bin/bash
set -e

echo "--- Instalando Node.js ---"
brew install node
export PATH=$PATH:/usr/local/bin

cd ../../..

echo "--- Escribiendo variables de entorno ---"
cat > .env << EOF
VITE_SUPABASE_URL=${SUPABASE_URL:-https://ngkcbygyoobqhlmlnuvl.supabase.co}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8}
EOF

echo "--- Instalando dependencias ---"
npm install --force
npm run build
npx cap sync ios

echo "--- Limpieza de Cordova ---"
cd ios/App/App.xcodeproj
sed -i '' '/Cordova\.framework/d' project.pbxproj

echo "--- Build completado ---"
