import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    // Called once Capacitor's bridge is fully ready and all plugins are loaded.
    // This is the correct place to patch the Geolocation plugin's CLLocationManager.
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?,
                     bridge: CAPBridgeProtocol) -> Bool {
        BackgroundLocationPlugin.shared.configure(bridge: bridge)
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Moving from active to inactive — ongoing GPS recording continues via
        // allowsBackgroundLocationUpdates = true set in BackgroundLocationPlugin.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // GPS keeps running in the background. The blue indicator bar is shown
        // to the user thanks to showsBackgroundLocationIndicator = true.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {}

    func applicationDidBecomeActive(_ application: UIApplication) {}

    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
