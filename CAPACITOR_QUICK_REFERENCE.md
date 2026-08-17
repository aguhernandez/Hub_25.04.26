# Capacitor 8.2.0 Quick Reference

## Project Setup

```bash
# Install dependencies
npm install

# Build web assets
npm run build

# Sync iOS project
npx cap sync ios

# Open in Xcode
npx cap open ios
```

## File Structure - Capacitor Config

**File**: `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'pro.asciende.app',
  appName: 'Asciende',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    Camera: { permissions: ['camera'] },
    Geolocation: { permissions: ['location'] },
  },
};

export default config;
```

## Plugin Usage Patterns

### Camera - Request Permission

**File**: `src/utils/cameraPermission.ts`

```typescript
import { Camera } from '@capacitor/camera';

async function requestCameraPermission() {
  const result = await Camera.requestPermissions({
    permissions: ['camera'],
  });

  if (result.camera === 'granted') {
    // Permission granted
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    });
  }
}
```

### Geolocation - Request Permission

**File**: `src/hooks/useGPSPermission.ts`

```typescript
import { Geolocation } from '@capacitor/geolocation';

async function requestLocationPermission() {
  const result = await Geolocation.requestPermissions({
    permissions: ['geolocation'],
  });

  if (result.geolocation === 'granted') {
    // Permission granted
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 15000,
    });
  }
}
```

### Geolocation - Watch Position (GPS Tracking)

**File**: `src/utils/gpsRecording.ts`

```typescript
import { Geolocation } from '@capacitor/geolocation';

async function startGPSTracking(
  onPosition: (pos: GeolocationPosition) => void,
  onError: (err: Error) => void
) {
  const watchId = await Geolocation.watchPosition(
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
    (result) => {
      // result.coords contains: latitude, longitude, altitude, accuracy
      if (result && result.coords) {
        onPosition(result as GeolocationPosition);
      }
    },
    (error) => {
      onError(new Error(error.message));
    }
  );

  return watchId; // String ID for Capacitor 8
}

async function stopGPSTracking(watchId: string) {
  await Geolocation.clearWatch({ id: watchId });
}
```

## Initialization (in main.tsx)

```typescript
const initCapacitor = async () => {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      console.log('Running on', Capacitor.getPlatform());
      // Platform-specific code here
    }
  } catch (error) {
    // Web browser - OK
  }
};

initCapacitor();
```

## Detecting Platform at Runtime

```typescript
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform(); // 'ios', 'android', or 'web'

  if (platform === 'ios') {
    // iOS-specific code
  } else if (platform === 'android') {
    // Android-specific code
  }
}
```

## iOS Info.plist Requirements

Required entries for permissions (auto-added by Capacitor, verify they exist):

```xml
<!-- Location Permissions -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Asciende needs your location to record GPS activities</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Asciende needs your location for background tracking</string>

<!-- Camera Permission -->
<key>NSCameraUsageDescription</key>
<string>Asciende needs camera access for video analysis</string>

<!-- Microphone (if used) -->
<key>NSMicrophoneUsageDescription</key>
<string>Asciende needs microphone access for audio recording</string>
```

## Build & Deployment

### Development Build

```bash
npm run build
npx cap sync ios
npx cap open ios
# Cmd+R in Xcode to run on simulator
```

### Testing on Device

```bash
# Connect iPhone via USB
npx cap open ios
# Select device in Xcode
# Cmd+R to build and run
# Trust computer on iPhone when prompted
```

### Production Build

```bash
# Update version in capacitor.config.ts if needed
npm run build
npx cap sync ios
# In Xcode:
# 1. Select "Generic iOS Device"
# 2. Product → Archive
# 3. Distribute App
```

## Debugging

### Enable Console Logging

In your TypeScript code:
```typescript
console.log('Debug message');
console.error('Error message');
```

View in Xcode:
- Product → Scheme → Edit Scheme
- Run → Console

### Check if Running on Native Platform

```typescript
import { Capacitor } from '@capacitor/core';

console.log('Is Native:', Capacitor.isNativePlatform());
console.log('Platform:', Capacitor.getPlatform());
```

### Test Location Permissions on Simulator

1. Xcode → Simulator Menu → Device → Location
2. Choose: None, Apple HQ, City Run, City Bike Run, or custom location

### Test Camera on Simulator

1. Camera works through web video API on simulator
2. On device, user must grant permission

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Module not found: @capacitor/geolocation" | `npm install && npx cap sync ios` |
| GPS not working on device | Check iOS Settings → Privacy → Location → Asciende |
| Camera permission denied | Check iOS Settings → Privacy → Camera → Asciende |
| Plugin methods not found | Rebuild: `npx cap sync ios`, clean Xcode: Cmd+K, Cmd+B |
| Old plugin API error | Update package.json, reinstall pods: `cd ios && pod install --repo-update` |
| "Watch position doesn't work" | Ensure location permission is granted, app has NSLocationWhenInUseUsageDescription in Info.plist |

## Documentation Links

- **Capacitor 8 Docs**: https://capacitorjs.com/docs/v8
- **Camera API**: https://capacitorjs.com/docs/v8/apis/camera
- **Geolocation API**: https://capacitorjs.com/docs/v8/apis/geolocation
- **iOS Guide**: https://capacitorjs.com/docs/v8/ios
- **Permissions**: https://capacitorjs.com/docs/v8/apis/permissions

## Key Differences from Capacitor 7

1. **watchPosition returns**: String ID (not number)
2. **requestPermissions API**: Consistent across all plugins
3. **Callback signature**: `(result: PluginResult) => void` instead of separate success/error callbacks for watch
4. **Error handling**: More robust error messages
5. **Permission status**: Returns explicit permission names in result object

## TypeScript Types

All types are auto-imported:

```typescript
import { Camera } from '@capacitor/camera';
import { Geolocation, PluginListenerHandle } from '@capacitor/geolocation';
import { Capacitor, PluginListenerHandle, CapacitorException } from '@capacitor/core';
```

## Testing Checklist

Before deploying to production:

- [ ] `npm run build` succeeds
- [ ] `npx cap sync ios` succeeds
- [ ] Xcode builds without errors (Cmd+B)
- [ ] App launches on simulator (Cmd+R)
- [ ] App launches on device
- [ ] Location permission dialog appears and works
- [ ] Camera permission dialog appears and works
- [ ] GPS tracking records points correctly
- [ ] CMJ video assessment works (if using camera)

---

**For detailed setup and troubleshooting**: See `CAPACITOR_8_IOS_SETUP.md` and `XCODE_CAPACITOR_8_FIXES.md`
