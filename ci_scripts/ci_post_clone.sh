#!/bin/bash
set -e

# 1. Instalar dependencias
npm install
npx cap sync ios

# 2. LIMPIEZA PROFUNDA (Eliminar rastro de Cordova)
# Este bloque busca y destruye cualquier mención a Cordova en el archivo del proyecto
cd ios/App
echo "Iniciando limpieza de referencias a Cordova..."
sed -i '' '/Cordova\.framework/d' App.xcodeproj/project.pbxproj
sed -i '' 's/Cordova//g' App.xcodeproj/project.pbxproj

# 3. Resolver paquetes de Swift
xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App

echo "Listo. Cordova ha sido eliminado del mapa de compilación."