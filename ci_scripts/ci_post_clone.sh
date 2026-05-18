#!/bin/bash
set -e

# 1. Instalar dependencias de Node
npm install

# 2. Instalar Capacitor CLI
npm install @capacitor/cli

# 3. Sincronizar (esto crea los archivos que Xcode busca)
npx cap sync ios

# 4. Forzar la resolución de paquetes de Swift
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
