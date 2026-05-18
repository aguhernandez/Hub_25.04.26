#!/bin/bash
set -e

# 1. Crear carpetas fantasma para que Xcode no de error 260
# (Hacemos esto antes de cualquier otra cosa)
mkdir -p node_modules/@capacitor/app
mkdir -p node_modules/@capacitor/browser
mkdir -p node_modules/@capacitor/camera
mkdir -p node_modules/@capacitor/geolocation
mkdir -p node_modules/@capacitor/push-notifications

# 2. Instalar dependencias reales
npm install

# 3. Sincronizar Capacitor
npx cap sync ios

# 4. Forzar a Xcode a "despertar" y ver las librerías reales
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
