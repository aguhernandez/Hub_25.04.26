#!/bin/bash
set -e

echo "=== Xcode Cloud ci_post_clone.sh ==="

# -------------------------------------------------------
# 1. Clean DerivedData and SPM caches to avoid stale
#    Capacitor 9 alpha artifacts from previous builds
# -------------------------------------------------------
echo "--- Limpiando DerivedData y caches SPM ---"
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true
rm -rf ~/Library/Caches/org.swift.swiftpm 2>/dev/null || true
rm -rf ~/Library/org.swift.swiftpm 2>/dev/null || true

# -------------------------------------------------------
# 2. Install Node.js (Xcode Cloud has no Node by default)
# -------------------------------------------------------
echo "--- Instalando Node.js ---"
brew install node
export PATH="/usr/local/bin:$PATH"

# Go to project root (ci_scripts is at ios/App/ci_scripts)
cd ../../..

# -------------------------------------------------------
# 3. Environment variables (hardcoded in supabase.ts now,
#    but .env still used by Vite for other vars)
# -------------------------------------------------------
echo "--- Configurando .env ---"
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://ngkcbygyoobqhlmlnuvl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5na2NieWd5b29icWhsbWxudXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1Mjc5NzksImV4cCI6MjA3NTEwMzk3OX0.WXFVZK7HbtR-sRaraMEKCH69dvi4GfhZFgrxY1E0nL8
EOF

# -------------------------------------------------------
# 4. Install dependencies and build web assets
# -------------------------------------------------------
echo "--- npm install ---"
npm install --force

echo "--- npm run build ---"
npm run build

echo "--- npx cap sync ios ---"
npx cap sync ios

# -------------------------------------------------------
# 5. Remove any lingering Cordova.framework references
#    from pbxproj (safety net)
# -------------------------------------------------------
echo "--- Limpieza de Cordova.framework del pbxproj ---"
cd ios/App/App.xcodeproj
if grep -q 'Cordova\.framework' project.pbxproj; then
  sed -i '' '/Cordova\.framework/d' project.pbxproj
  echo "    Removed Cordova.framework references from pbxproj"
else
  echo "    No Cordova.framework references found (clean)"
fi
cd ../../..

# -------------------------------------------------------
# 6. Force SPM package resolution from scratch
#    This ensures Package.resolved (pinned to 7.6.5)
#    is respected and no cached 9.x binaries are used
# -------------------------------------------------------
echo "--- Resolviendo dependencias SPM ---"
cd ios/App
xcodebuild -resolvePackageDependencies \
  -project App.xcodeproj \
  -scheme App \
  -clonedSourcePackagesDirPath ./SPMPackages 2>&1 | tail -5 || true
cd ../..

# -------------------------------------------------------
# 7. Verify resolved versions
# -------------------------------------------------------
echo "--- Verificando versiones resueltas ---"
RESOLVED_FILE="ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"
if [ -f "$RESOLVED_FILE" ]; then
  echo "Package.resolved contents:"
  cat "$RESOLVED_FILE"
fi

echo ""
echo "=== ci_post_clone.sh completado exitosamente ==="
