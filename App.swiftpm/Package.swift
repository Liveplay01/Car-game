// swift-tools-version: 6.0
// The iPhone/iPad app (Phase 2, ROADMAP.md M12). Opened and built in Swift Playgrounds on
// the iPad. Only thin adapters live here: drawing, touch, sound, haptics, music, ads and
// native buttons. Everything that decides the game is in `../Game` (GameCore,
// GamePresentation) and builds on Windows.
import PackageDescription
import AppleProductTypes

let package = Package(
    name: "Car Game",
    platforms: [
        .iOS("26.0")
    ],
    products: [
        .iOSApplication(
            name: "Car Game",
            targets: ["AppModule"],
            bundleIdentifier: "de.suhrreal.cargame",
            teamIdentifier: "",
            displayVersion: "0.1",
            bundleVersion: "1",
            // The icon: `Assets.xcassets/AppIcon`, drawn by `Assets/Icon/make_icon.py`. If
            // Swift Playgrounds refuses the catalog, `.placeholder(icon: .car)` still works.
            appIcon: .asset("AppIcon"),
            accentColor: .presetColor(.mint),
            supportedDeviceFamilies: [
                .pad,
                .phone
            ],
            supportedInterfaceOrientations: [
                .portrait
            ],
            appCategory: .arcadeGames,
            // AdMob app id, tracking prompt text, ad networks (Ads.swift).
            additionalInfoPlistContentFilePath: "AdMob-Info.plist"
        )
    ],
    dependencies: [
        // The game itself, shared with the Windows test window.
        .package(path: "../Game"),
        // Rewarded ads for Standard chests (CLAUDE.md: Google AdMob). If Swift Playgrounds
        // cannot resolve it, delete this line and the product below: `Ads.swift` then falls
        // back to the placeholder ad.
        .package(url: "https://github.com/googleads/swift-package-manager-google-mobile-ads.git", "12.0.0"..<"13.0.0"),
    ],
    targets: [
        .executableTarget(
            name: "AppModule",
            dependencies: [
                .product(name: "GameCore", package: "Game"),
                .product(name: "GamePresentation", package: "Game"),
                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),
            ],
            path: ".",
            exclude: ["AdMob-Info.plist", "README.md"],
            resources: [
                .copy("Resources")
            ],
            swiftSettings: [
                // The adapters talk to UIKit, AVFoundation and Core Haptics on the main
                // thread; Swift 5 mode keeps that simple.
                .swiftLanguageMode(.v5)
            ]
        )
    ]
)
