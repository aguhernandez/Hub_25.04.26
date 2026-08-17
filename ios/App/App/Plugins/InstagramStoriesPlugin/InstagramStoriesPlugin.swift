import Foundation
import Capacitor
import UIKit

@objc(InstagramStoriesPlugin)
public class InstagramStoriesPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "InstagramStoriesPlugin"
    public let jsName = "InstagramStories"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "shareSticker", returnType: CAPPluginReturnPromise)
    ]

    @objc func shareSticker(_ call: CAPPluginCall) {
        guard let base64String = call.getString("stickerImage"),
              !base64String.isEmpty else {
            call.reject("Missing stickerImage parameter")
            return
        }

        guard let imageData = Data(base64Encoded: base64String, options: .ignoreUnknownCharacters) else {
            call.reject("Invalid base64 image data")
            return
        }

        let appId = call.getString("appId") ?? "pro.asciende.app"
        let backgroundTopColor = call.getString("backgroundTopColor") ?? "#000000"
        let backgroundBottomColor = call.getString("backgroundBottomColor") ?? "#000000"

        DispatchQueue.main.async {
            guard let url = URL(string: "instagram-stories://share") else {
                call.reject("Cannot create Instagram Stories URL")
                return
            }

            guard UIApplication.shared.canOpenURL(url) else {
                call.reject("Instagram is not installed")
                return
            }

            let pasteboardItems: [[String: Any]] = [[
                "com.instagram.sharedSticker.stickerImage": imageData,
                "com.instagram.sharedSticker.backgroundTopColor": backgroundTopColor,
                "com.instagram.sharedSticker.backgroundBottomColor": backgroundBottomColor,
                "com.instagram.sharedSticker.appID": appId
            ]]

            let options: [UIPasteboard.OptionsKey: Any] = [
                .expirationDate: Date().addingTimeInterval(60 * 5)
            ]

            UIPasteboard.general.setItems(pasteboardItems, options: options)

            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    call.resolve(["success": true])
                } else {
                    call.reject("Failed to open Instagram Stories")
                }
            }
        }
    }
}
