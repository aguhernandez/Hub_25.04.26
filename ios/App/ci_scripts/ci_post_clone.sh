#!/bin/bash
set -e

# Ahora estamos en ios/App/ci_scripts, 
# así que subimos 3 niveles para llegar a la raíz
cd ../../..

echo "Instalando dependencias desde la raíz..."
npm install --force
npx cap sync ios

echo "Listo, todo sincronizado."