#!/bin/sh
set -e
echo "=== Installing Homebrew dependencies ==="
brew install node cocoapods
echo "=== Installing npm dependencies ==="
cd ../../..
npm install
echo "=== Running Capacitor sync ==="
npx cap sync ios
echo "=== Installing iOS pods ==="
cd ios/App
pod install
