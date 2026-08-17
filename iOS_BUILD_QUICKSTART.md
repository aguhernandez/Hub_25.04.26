# iOS Build Quick Start

## Status
✅ iOS project fully regenerated with Capacitor 6.1.0
✅ All TypeScript code updated to Capacitor 6 APIs
✅ Web build compiles successfully
✅ Native iOS project structure ready for Xcode

## Open in Xcode

```bash
open ios/App/App.xcworkspace
```

**Important:** Always open the `.xcworkspace` file, not the `.xcodeproj` file. The workspace includes the Swift Package Manager integration.

## Build Steps in Xcode

1. **Select Target:** App (not App-SPM)
2. **Select Device:** iPhone 15 Pro (or your device)
3. **Build:** Product → Build (Cmd+B)
4. **Run:** Product → Run (Cmd+R)

## What's Configured

✅ **Capacitor 6.1.0** - Latest stable version
✅ **Camera Plugin** (6.1.3) - For video analysis & CMJ assessment
✅ **Geolocation Plugin** (6.1.1) - For GPS tracking & activity recording
✅ **Swift Package Manager** - Modern dependency management (no CocoaPods)
✅ **Info.plist Permissions** - Camera and Location permission strings
✅ **AppDelegate.swift** - Capacitor bridge initialization

## Test Features

After building and running:

1. **Grant Location Permission**
   - App will request "Access location while using the app"
   - Enable it to test GPS recording

2. **Grant Camera Permission**
   - App will request "Access camera"
   - Enable it to test CMJ assessment

3. **Test GPS Activity**
   - Navigate to Training → Activity Recording
   - Start recording a GPS activity
   - Location should update in real-time

4. **Test Camera**
   - Navigate to Performance → CMJ Assessment
   - Attempt to record a vertical jump
   - Camera permission dialog should appear

## If Build Fails

### Xcode Error: "Product not found"
```bash
# Re-sync plugins
npx cap sync ios

# In Xcode: Product → Clean Build Folder
# Then: Product → Build
```

### Xcode Error: SPM package resolution timeout
- First build may take 2-5 minutes for SPM to cache packages
- Xcode will show progress
- Subsequent builds are instant

### Xcode Error: "Capacitor not found"
```bash
# Verify iOS platform is installed
ls -la ios/App/CapApp-SPM/

# Should contain: Package.swift
# If missing, run:
npx cap add ios
npx cap sync ios
```

## Project Structure

```
ios/App/
├── App/
│   ├── AppDelegate.swift          ← Capacitor 6 initialization
│   ├── Info.plist                 ← Permission strings added
│   ├── public/                    ← Web assets (from dist/)
│   └── *.storyboard              ← UI layouts
├── App.xcodeproj/                 ← Xcode project
│   └── project.xcworkspace/       ← SPM workspace
└── CapApp-SPM/                    ← Swift Package Manager
    └── Package.swift              ← Plugin dependencies
```

## Plugins Installed

| Plugin | Version | Purpose |
|--------|---------|---------|
| @capacitor/camera | 6.1.3 | Video capture, form analysis |
| @capacitor/geolocation | 6.1.1 | GPS tracking, location services |
| @capacitor/core | 6.1.0 | Bridge & runtime |

## Dependencies

The iOS build uses:
- **Capacitor Core 6.2.1** - Native bridge
- **Swift 5.9+** - Native language
- **iOS 15+** - Minimum deployment target

## Next Steps

1. Open workspace in Xcode
2. Build (Cmd+B) and verify 0 errors
3. Run on simulator (Cmd+R)
4. Test location and camera features
5. Deploy to TestFlight/App Store

## Need Help?

- See: `CAPACITOR_6_IOS_BUILD_COMPLETE.md` for detailed documentation
- See: `CAPACITOR_QUICK_REFERENCE.md` for API examples
- See: `XCODE_CAPACITOR_8_FIXES.md` for troubleshooting

---

**Ready to build:** `open ios/App/App.xcworkspace`
