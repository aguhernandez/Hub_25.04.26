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
echo "=== Resolving Swift Package Manager dependencies ==="
xcodebuild -resolvePackageDependencies -workspace ios/App/App.xcworkspace -scheme App
echo "=== Generating clean Podfile ==="
cat > ios/App/Podfile << 'PODFILE'
platform :ios, '15.0'

require_relative '../../node_modules/@capacitor/ios/scripts/pods_helpers'

target 'App' do
end
PODFILE
echo "=== Installing iOS pods ==="
cd ios/App
pod install
