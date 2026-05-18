#!/bin/bash
set -e

# Imprimir dónde estamos para depurar
echo "Ejecutando script desde: $(pwd)"

# 1. Crear las carpetas que Xcode busca desesperadamente
mkdir -p node_modules/@capacitor/app
mkdir -p node_modules/@capacitor/browser
mkdir -p node_modules/@capacitor/camera
mkdir -p node_modules/@capacitor/geolocation
mkdir -p node_modules/@capacitor/push-notifications

# 2. Instalar dependencias
npm install --force

# 3. Sincronizar Capacitor (esto reconstruye el puente)
npx cap sync ios
