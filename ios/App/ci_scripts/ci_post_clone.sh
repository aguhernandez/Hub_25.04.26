#!/bin/bash
set -e

# 1. Asegurar que los comandos de Homebrew y Node estén en el PATH
export PATH=$PATH:/usr/local/bin

# 2. Ir a la raíz del proyecto
cd ../../..

echo "--- Verificando versiones ---"
node -v
npm -v

echo "--- Instalando dependencias ---"
# Usamos --no-audit para ir más rápido y evitar errores de red
npm install --force --no-audit

echo "--- Sincronizando Capacitor ---"
# Ejecutamos npx desde la raíz
npx cap sync ios

echo "--- Script finalizado con éxito ---"