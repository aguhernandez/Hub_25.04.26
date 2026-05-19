#!/bin/bash
set -e

echo "--- Instalando Node.js ---"
brew install node
export PATH=$PATH:/usr/local/bin

cd ../../..

echo "--- Instalando Dependencias y Build Web ---"
npm install --force
npm run build

echo "--- Sincronizando Capacitor ---"
npx cap sync ios

echo "--- Limpieza completada. Compilando... ---"
