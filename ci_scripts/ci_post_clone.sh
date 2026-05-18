#!/bin/bash
set -e

# 1. Instalar todo
npm install
npm install @capacitor/ios@latest # Forzamos la versión más reciente

# 2. El comando mágico: Limpiar y recrear los enlaces nativos
npx cap ios sync

# 3. Forzar a Xcode a RE-INDEXAR todo el proyecto desde cero
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App

# 4. Asegurar el Team ID y la firma
sed -i '' "s/DEVELOPMENT_TEAM = [^;]*/DEVELOPMENT_TEAM = 78WWG7XATW/g" ios/App/App.xcodeproj/project.pbxproj
sed -i '' 's/CODE_SIGN_STYLE = Manual;/CODE_SIGN_STYLE = Automatic;/g' ios/App/App.xcodeproj/project.pbxproj