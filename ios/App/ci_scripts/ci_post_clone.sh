#!/bin/bash
set -e

echo "--- Instalando Node.js ---"
brew install node
export PATH=$PATH:/usr/local/bin

cd ../../..
echo "--- Instalando dependencias ---"
npm install --force
npm run build
npx cap sync ios

echo "--- Limpieza de Cordova ---"
cd ios/App/App.xcodeproj
sed -i '' '/Cordova\.framework/d' project.pbxproj
