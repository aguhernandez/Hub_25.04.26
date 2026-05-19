#!/bin/bash
set -e

# 1. Entorno
brew install node
export PATH=$PATH:/usr/local/bin
cd ../../..

# 2. Instalación limpia
npm install --force
npm run build
npx cap sync ios

# 3. ELIMINACIÓN QUIRÚRGICA (La clave de la 104)
echo "--- Eliminando rastro de Cordova en el ADN del proyecto ---"
cd ios/App/App.xcodeproj

# Borra la línea del Framework
sed -i '' '/Cordova\.framework/d' project.pbxproj

# Borra las rutas de búsqueda (Search Paths) que apuntan a Cordova
sed -i '' '/"$(inherited)",/d' project.pbxproj
sed -i '' 's/.*Cordova.*//g' project.pbxproj

echo "--- Limpieza profunda terminada ---"