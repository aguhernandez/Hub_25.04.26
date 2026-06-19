#!/bin/sh
set -e
echo "=== Installing Homebrew dependencies ==="
brew install node cocoapods
cd ../../..
echo "=== Installing npm dependencies ==="
npm install --legacy-peer-deps
echo "=== Building web assets ==="
npm run build
echo "=== Running Capacitor sync ==="
npx cap sync ios
echo "=== Installing iOS pods ==="
cd ios/App
pod install
