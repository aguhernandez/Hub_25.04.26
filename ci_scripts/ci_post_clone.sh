#!/bin/bash
set -e

# 1. Eliminar cualquier rastro de configuración de paquetes previa
rm -rf ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved

# 2. Instalar dependencias web (esto crea node_modules en la nube)
npm install

# 3. Sincronizar Capacitor (esto crea los enlaces correctos en la nube)
npx cap sync ios

# 4. Forzar la resolución DESPUÉS de haber instalado todo
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App

# 4. Forzar la configuración de firma para Xcode Cloud
sed -i '' 's/CODE_SIGN_STYLE = Manual;/CODE_SIGN_STYLE = Automatic;/g' ios/App/App.xcodeproj/project.pbxproj

# 5. Forzar el Team ID (el que pusiste en el log) por si acaso
# Esto asegura que Xcode Cloud sepa quién firma la app
sed -i '' "s/DEVELOPMENT_TEAM = [^;]*/DEVELOPMENT_TEAM = 78WWG7XATW/g" ios/App/App.xcodeproj/project.pbxproj