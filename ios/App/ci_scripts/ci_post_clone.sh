#!/bin/bash
set -e

echo "--- Instalando Node.js y NPM (necesarios para Capacitor) ---"
# Xcode Cloud no tiene Node por defecto, lo instalamos con brew
brew install node

# Aseguramos que los binarios recién instalados estén disponibles
export PATH=$PATH:/usr/local/bin

echo "--- Verificando instalaciones ---"
node -v
npm -v

# Ir a la raíz del proyecto
cd ../../..

echo "--- Instalando dependencias de la App ---"
npm install --force

echo "--- Sincronizando Capacitor ---"
npx cap sync ios

echo "--- Script finalizado con éxito ---"