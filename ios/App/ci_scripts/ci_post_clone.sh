#!/bin/bash
set -e

echo "--- Preparando entorno de Node.js ---"
# Instalamos Node porque Xcode Cloud no lo incluye por defecto
brew install node
export PATH=$PATH:/usr/local/bin

# Regresamos a la raíz del proyecto para trabajar
cd ../../..

echo "--- Instalando dependencias de Node ---"
npm install --force

echo "--- Construyendo activos web (Generando carpeta dist) ---"
# Este paso es vital para que Capacitor encuentre lo que definiste en webDir
npm run build

echo "--- Sincronizando con Capacitor ---"
# Ahora que 'dist' existe, este comando no fallará
npx cap sync ios

echo "--- Proceso completado exitosamente ---"