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
echo "=== Generating clean Podfile ==="
cat > ios/App/Podfile << 'PODFILE'
require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'
platform :ios, '15.0'
use_frameworks!
target 'App' do
  capacitor_pods
end
post_install do |installer|
  assertDeploymentTarget(installer)
end
PODFILE
echo "=== Installing iOS pods ==="
cd ios/App
pod install
