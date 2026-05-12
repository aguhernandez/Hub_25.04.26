import Foundation
import CoreLocation
import Capacitor

/**
 * BackgroundLocationPlugin
 *
 * Configures the CLLocationManager used by the Capacitor Geolocation plugin
 * to keep GPS running while the app is in the background (screen off / bolsillo).
 *
 * This is required because the stock @capacitor/geolocation plugin does NOT set:
 *   - allowsBackgroundLocationUpdates   → keeps GPS alive when app is backgrounded
 *   - pausesLocationUpdatesAutomatically → prevents iOS from auto-pausing GPS
 *   - showsBackgroundLocationIndicator  → shows the blue bar so user knows GPS is on
 *
 * Called from AppDelegate after Capacitor finishes loading.
 */
@objc public class BackgroundLocationPlugin: NSObject {

    @objc public static let shared = BackgroundLocationPlugin()

    private override init() {
        super.init()
    }

    /**
     * Patches the CLLocationManager that Capacitor's Geolocation plugin
     * creates internally. Must be called after the bridge is ready.
     *
     * Also registers for app lifecycle notifications so we can
     * request Always authorization when recording starts.
     */
    @objc public func configure(bridge: CAPBridgeProtocol) {
        DispatchQueue.main.async {
            guard let geoPlugin = bridge.plugin(withName: "Geolocation") else {
                // Plugin not yet loaded — retry once after a short delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    self.configure(bridge: bridge)
                }
                return
            }

            // Access the locationManager property via reflection (it's @objc public var)
            if let locationManager = geoPlugin.value(forKey: "locationManager") as? CLLocationManager {
                self.applyBackgroundSettings(locationManager)
            }
        }
    }

    /**
     * Applies the three background GPS settings to a CLLocationManager.
     * Safe to call multiple times (idempotent).
     */
    @objc public func applyBackgroundSettings(_ locationManager: CLLocationManager) {
        // Keeps GPS running when the screen turns off / app goes to background
        locationManager.allowsBackgroundLocationUpdates = true

        // Prevents iOS from pausing GPS automatically when it thinks you stopped
        locationManager.pausesLocationUpdatesAutomatically = false

        // Shows the blue location indicator bar so the user knows GPS is active
        locationManager.showsBackgroundLocationIndicator = true

        // Best accuracy for sport / activity recording
        locationManager.desiredAccuracy = kCLLocationAccuracyBest

        // Report every 5 metres of movement
        locationManager.distanceFilter = 5.0
    }

    /**
     * Call this when the user explicitly starts an activity recording session.
     * Requests "Always" authorization if we only have "WhenInUse" — needed for
     * reliable background GPS on iOS 14+.
     */
    @objc public func requestAlwaysAuthorization() {
        let manager = CLLocationManager()
        let status = manager.authorizationStatus

        if status == .authorizedWhenInUse {
            manager.requestAlwaysAuthorization()
        }
    }
}
