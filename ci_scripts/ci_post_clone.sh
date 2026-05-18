#!/bin/bash
set -e

# 1. Limpiar basura de paquetes previos
rm -rf ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved

# 2. Instalar dependencias de Node
npm install

# 3. Sincronizar Capacitor (Esto descarga el núcleo de Capacitor)
npx cap sync ios

# 4. LA SOLUCIÓN AL ERROR DE IMPORT: 
# Forzamos a Xcode a descargar y registrar el módulo 'Capacitor' en la nube
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App

# 5. Configurar permisos y firma
sed -i '' 's/CODE_SIGN_STYLE = Manual;/CODE_SIGN_STYLE = Automatic;/g' ios/App/App.xcodeproj/project.pbxproj
sed -i '' "s/DEVELOPMENT_TEAM = [^;]*/DEVELOPMENT_TEAM = 78WWG7XATW/g" ios/App/App.xcodeproj/project.pbxproj
sed -i '' 's/ENABLE_USER_SCRIPT_SANDBOXING = YES;/ENABLE_USER_SCRIPT_SANDBOXING = NO;/g' ios/App/App.xcodeproj/project.pbxproj

# 6. Dar permisos de ejecución
chmod -R +x node_modules/@capacitor