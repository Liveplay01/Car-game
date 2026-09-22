// swift-tools-version: 6.0
// Platform-neutral game package. Only the Swift standard library and Foundation:
// no SpriteKit, UIKit, SwiftUI or simd, so it builds on Windows.
import PackageDescription

let package = Package(
    name: "Game",
    platforms: [
        .iOS("26.0"),
        .macOS("26.0"),
    ],
    products: [
        .library(name: "GameCore", targets: ["GameCore"]),
        .library(name: "GamePresentation", targets: ["GamePresentation"]),
    ],
    targets: [
        // The rules: fixed 120 Hz step, deterministic.
        .target(name: "GameCore"),
        // What you see, hear and feel, as data.
        .target(name: "GamePresentation", dependencies: ["GameCore"]),
        // Players without hands, for balancing. Not part of the app.
        .target(name: "GameBots", dependencies: ["GameCore"]),
        // Balancing bot: swift run -c release Sim
        .executableTarget(name: "Sim", dependencies: ["GameBots", "GameCore"]),
        .testTarget(name: "GameCoreTests", dependencies: ["GameCore"]),
        .testTarget(name: "GamePresentationTests", dependencies: ["GamePresentation"]),
        .testTarget(name: "GameBotsTests", dependencies: ["GameBots"]),
    ]
)
