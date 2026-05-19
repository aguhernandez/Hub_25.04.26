#!/bin/bash
set -e

echo "--- Instalando Node.js ---"
brew install node
export PATH=$PATH:/usr/local/bin

# Ir a la raíz del proyecto
cd ../../..

echo "--- Instalando dependencias ---"
npm install --force

echo "--- Compilando Aplicación Web ---"
# Esto genera la carpeta /dist o /www que Capacitor necesita
npm run build

echo "--- Verificando carpeta de activos ---"
# Por si acaso el build genera 'www' en lugar de 'dist', 
# o si falta la carpeta, esto evita que el script explote
mkdir -p dist

echo "--- Sincronizando Capacitor ---"
npx cap sync ios

echo "--- Script finalizado con éxito ---"