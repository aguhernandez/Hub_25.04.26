#!/bin/bash
set -e

# 1. Instalar dependencias
npm install

# 2. Sincronizar Capacitor (esto genera los archivos necesarios)
npx cap sync ios

# 3. Forzar a Xcode a leer los paquetes
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App

# 4. Ajustar Firma y Team
sed -i '' "s/DEVELOPMENT_TEAM = [^;]*/DEVELOPMENT_TEAM = 78WWG7XATW/g" ios/App/App.xcodeproj/project.pbxproj
sed -i '' 's/CODE_SIGN_STYLE = Manual;/CODE_SIGN_STYLE = Automatic;/g' ios/App/App.xcodeproj/project.pbxproj