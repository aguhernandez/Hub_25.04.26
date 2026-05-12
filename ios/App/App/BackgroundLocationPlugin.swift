import Foundation
import CoreLocation
import Capacitor

/**
 * BackgroundLocationPlugin
 *
 * Capacitor plugin nativo que extiende el soporte de GPS en background para iOS.
 *
 * El plugin oficial @capacitor/geolocation NO configura las propiedades necesarias
 * para GPS en segundo plano. Este plugin expone un método JS "startBackgroundLocation"
 * que crea y mantiene su propio CLLocationManager con las tres propiedades requeridas:
 *
 *   allowsBackgroundLocationUpdates   = true  → GPS activo con pantalla apagada
 *   pausesLocationUpdatesAutomatically = false → iOS no pausa el GPS por su cuenta
 *   showsBackgroundLocationIndicator   = true  → barra azul visible para el usuario
 *
 * Requisitos en Info.plist (ya añadidos):
 *   - NSLocationAlwaysAndWhenInUseUsageDescription
 *   - NSLocationAlwaysUsageDescription
 *   - UIBackgroundModes → location
 *
 * Uso desde JS/TS:
 *   import { Plugins } from '@capacitor/core';
 *   await Plugins.BackgroundLocation.startBackgroundLocation();
 *   await Plugins.BackgroundLocation.stopBackgroundLocation();
 */
@objc(BackgroundLocationPlugin)
public class BackgroundLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {

    public let identifier = "BackgroundLocationPlugin"
    public let jsName = "BackgroundLocation"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startBackgroundLocation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBackgroundLocation",  returnType: CAPPluginReturnPromise),
    ]

    private var locationManager: CLLocationManager?
    private var activeCall: CAPPluginCall?

    // Called by the JS side when an activity recording session starts.
    @objc func startBackgroundLocation(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let mgr = CLLocationManager()
            mgr.delegate = self

            // The three properties Gemini/Apple docs require for background GPS:
            mgr.allowsBackgroundLocationUpdates    = true
            mgr.pausesLocationUpdatesAutomatically = false
            mgr.showsBackgroundLocationIndicator   = true

            // Sport-level accuracy and minimum movement threshold
            mgr.desiredAccuracy = kCLLocationAccuracyBest
            mgr.distanceFilter  = 5.0

            self.locationManager = mgr
            self.activeCall = call

            let status = mgr.authorizationStatus
            if status == .notDetermined {
                mgr.requestAlwaysAuthorization()
            } else if status == .authorizedWhenInUse {
                // Upgrade to Always so background GPS is fully reliable
                mgr.requestAlwaysAuthorization()
                mgr.startUpdatingLocation()
            } else if status == .authorizedAlways {
                mgr.startUpdatingLocation()
            } else {
                call.reject("Location permission denied")
                self.locationManager = nil
                self.activeCall = nil
                return
            }

            call.resolve(["status": "started"])
        }
    }

    @objc func stopBackgroundLocation(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.locationManager?.stopUpdatingLocation()
            self.locationManager?.delegate = nil
            self.locationManager = nil
            self.activeCall = nil
            call.resolve(["status": "stopped"])
        }
    }

    // After the user responds to the authorization dialog, start if granted.
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        if status == .authorizedAlways || status == .authorizedWhenInUse {
            manager.startUpdatingLocation()
        }
    }

    // Forward location updates as JS events so the web layer can consume them.
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        notifyListeners("backgroundLocationUpdate", data: [
            "latitude":  location.coordinate.latitude,
            "longitude": location.coordinate.longitude,
            "altitude":  location.altitude,
            "accuracy":  location.horizontalAccuracy,
            "speed":     location.speed,
            "heading":   location.course,
            "timestamp": location.timestamp.timeIntervalSince1970 * 1000,
        ])
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        notifyListeners("backgroundLocationError", data: ["message": error.localizedDescription])
    }
}
