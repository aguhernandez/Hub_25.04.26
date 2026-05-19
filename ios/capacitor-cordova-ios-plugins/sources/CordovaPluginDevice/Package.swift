// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "CordovaPluginDevice",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CordovaPluginDevice",
            targets: ["CordovaPluginDevice"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "7.6.5")
    ],
    targets: [
        .target(
            name: "CordovaPluginDevice",
            dependencies: [
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: ".",
            resources: [
                .copy("resources/CDVDevice.bundle")
            ],
            publicHeadersPath: "."
        )
    ]
)