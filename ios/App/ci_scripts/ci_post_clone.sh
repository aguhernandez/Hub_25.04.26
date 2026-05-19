#!/bin/bash
set -e

echo "--- Instalando Node.js ---"
brew install node
export PATH=$PATH:/usr/local/bin

cd ../../..

echo "--- Instalando Dependencias y Build Web ---"
npm install --force
npm run build

echo "--- Sincronizando Capacitor ---"
npx cap sync ios

echo "--- CIRUGÍA DE XCODE: Eliminando fantasmas de Cordova ---"
# Entramos a la carpeta del proyecto nativo
cd ios/App/App.xcodeproj

# Este comando busca cualquier línea que mencione Cordova.framework y la ELIMINA 
# del archivo de configuración del proyecto para que Apple no la busque más.
sed -i '' '/Cordova\.framework/d' project.pbxproj

echo "--- Limpieza completada. Compilando... ---"