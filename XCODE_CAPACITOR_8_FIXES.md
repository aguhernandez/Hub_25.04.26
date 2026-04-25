# Xcode Capacitor 8 Build Fixes

If you encounter Swift compilation errors or SwiftCompile failures, follow these steps:

## Quick Fix Checklist

### 1. Clean Everything

```bash
# Stop any running builds
cd ios
rm -rf Pods Podfile.lock build
cd ..
rm -rf node_modules package-lock.json
npm install
```

### 2. Reinstall Pods

```bash
cd ios
pod install --repo-update
cd ..
npx cap sync ios
```

### 3. Clean Xcode

In Xcode:
1. Product → Clean Build Folder (Shift+Cmd+K)
2. Cmd+B to build
3. If still failing, do full clean:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData/*
   ```

## Common Xcode Errors

### "Module not found: Capacitor"

**Cause**: Pod dependencies not installed

**Fix**:
```bash
cd ios
pod install --repo-update
cd ..
npx cap sync ios
```

### "GeolocationPlugin cannot find member 'requestPermissions'"

**Cause**: Old Capacitor/Geolocation version in Pods

**Fix**:
```bash
cd ios
pod deintegrate
pod install --repo-update
cd ..
npx cap sync ios
```

### "CameraPlugin type mismatch in requestPermissions"

**Cause**: Camera plugin API mismatch (older version)

**Fix**:
```bash
npm install @capacitor/camera@8.2.0 --save
npm install @capacitor/camera@8.2.0 @capacitor/core@8.2.0 --save
npx cap sync ios
```

### "Swift compilation error" (generic)

**Fix**:
```bash
cd ios
rm -rf Pods Podfile.lock build
pod install --repo-update
cd ..
npx cap sync ios
# In Xcode: Product → Clean Build Folder
# Product → Build
```

### "ld: framework not found CoreGraphics"

**Cause**: Missing or corrupted framework links

**Fix**:
```bash
cd ios
pod install --repo-update
cd ..
# In Xcode: Product → Clean Build Folder
# Delete derived data: rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

## Capacitor 8.2.0 Specific Issues

### Issue: App crashes on first location/camera request

**Cause**: Info.plist missing permission strings

**Fix**: Verify `ios/App/Info.plist` contains:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Asciende needs location for GPS activities</string>

<key>NSCameraUsageDescription</key>
<string>Asciende needs camera access</string>
```

### Issue: Plugin methods not found at runtime

**Cause**: Plugin bridge not initialized

**Fix**: Ensure `src/main.tsx` has:

```typescript
const initCapacitor = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      console.log('Capacitor initialized for', Capacitor.getPlatform());
    }
  } catch (error) {
    // Web browser - OK
  }
};

initCapacitor();
```

### Issue: Watch position doesn't work on iOS

**Cause**: Geolocation.watchPosition API mismatch

**Fix**: Ensure `src/utils/gpsRecording.ts` uses Capacitor 8 API:

```typescript
const watchId = await Geolocation.watchPosition(
  { enableHighAccuracy: true, timeout: 10000 },
  (result) => {
    // result has coords: { latitude, longitude, accuracy, ... }
    if (result && result.coords) {
      onSuccess(capacitorPositionToGeolocation(result));
    }
  },
  (error) => {
    onError(error);
  }
);
```

## Build Configuration

### Xcode Build Settings

Verify these in Xcode → Build Settings:

**Search Paths**:
- Framework Search Paths: `$(inherited)`
- Header Search Paths: `$(inherited)`

**Linking**:
- Other Linker Flags: `-ObjC -lc++`

**Swift Settings**:
- Swift Version: Swift 5.5+
- Objective-C Bridging Header: (leave blank if not needed)

### Pod Configuration

If `ios/Podfile` exists, verify it contains:

```ruby
def capacitor_pods
  pod 'Capacitor', '~> 8.2.0'
  pod 'CapacitorCoreData', '~> 8.2.0'
  pod 'CapacitorCamera', '~> 8.2.0'
  pod 'CapacitorGeolocation', '~> 8.2.0'
end

target 'Asciende' do
  capacitor_pods
end
```

## Testing the Fix

Once Xcode builds successfully:

1. **On Simulator**:
   ```bash
   npx cap open ios
   # Product → Run (Cmd+R)
   ```

2. **On Device**:
   - Connect iPhone
   - Select device in Xcode
   - Product → Run (Cmd+R)
   - Trust computer when prompted
   - Test GPS and camera features

3. **Verify Permissions**:
   - iOS Settings → Asciende → Permissions
   - Grant Location: Always or "While Using"
   - Grant Camera: Allow

## If Still Failing

1. **Check TypeScript compilation**:
   ```bash
   npm run typecheck
   npm run build
   ```

2. **Check Capacitor version mismatch**:
   ```bash
   npm list @capacitor/core @capacitor/camera @capacitor/geolocation
   # Should all be 8.2.0
   ```

3. **Reset entire iOS project**:
   ```bash
   npx cap remove ios
   npm install @capacitor/ios@8.2.0
   npx cap add ios
   npx cap sync ios
   ```

4. **Check minimum deployment target**:
   - Xcode → Select Asciende project
   - General → Minimum Deployments
   - Should be iOS 13.0+

## Success Indicators

✓ `npm run build` completes with no errors
✓ `npx cap sync ios` completes with no errors
✓ Xcode builds successfully (Cmd+B shows ✓ completed)
✓ App runs on simulator/device
✓ Location permission dialog appears on first run
✓ Camera permission dialog appears when needed
✓ GPS tracking works (ActivityRecorder)
✓ CMJ camera assessment works

---

**Need help?** Check the main setup guide: `CAPACITOR_8_IOS_SETUP.md`
