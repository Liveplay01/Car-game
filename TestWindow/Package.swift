// swift-tools-version: 6.0
// Test window for Windows (and later macOS): draws the render list from `Game/`,
// takes mouse and keyboard input and plays sounds. No game logic lives here.
import PackageDescription

let windowsOnly: [Platform] = [.windows]

let package = Package(
    name: "TestWindow",
    dependencies: [
        .package(path: "../Game"),
    ],
    targets: [
        // raylib 5.5, vendored as C source (FOUNDATION.md 1.2, fallback path):
        // no community Swift wrapper, the Swift toolchain compiles it directly.
        .target(
            name: "CRaylib",
            path: "Sources/CRaylib",
            sources: [
                "raylib/rcore.c",
                "raylib/rshapes.c",
                "raylib/rtextures.c",
                "raylib/rtext.c",
                "raylib/rmodels.c",
                "raylib/raudio.c",
                "raylib/utils.c",
                "raylib/rglfw.c",
            ],
            publicHeadersPath: "include",
            cSettings: [
                .define("PLATFORM_DESKTOP"),
                .define("GRAPHICS_API_OPENGL_33"),
                .define("_CRT_SECURE_NO_WARNINGS", .when(platforms: windowsOnly)),
                .headerSearchPath("raylib/external/glfw/include"),
                // Third-party code: keep the build output readable.
                .unsafeFlags(["-w"]),
            ],
            linkerSettings: [
                .linkedLibrary("opengl32", .when(platforms: windowsOnly)),
                .linkedLibrary("gdi32", .when(platforms: windowsOnly)),
                .linkedLibrary("winmm", .when(platforms: windowsOnly)),
                .linkedLibrary("user32", .when(platforms: windowsOnly)),
                .linkedLibrary("shell32", .when(platforms: windowsOnly)),
            ]
        ),
        .executableTarget(
            name: "TestWindow",
            dependencies: [
                "CRaylib",
                .product(name: "GameCore", package: "Game"),
                .product(name: "GamePresentation", package: "Game"),
            ]
        ),
        // Writes the placeholder sounds to Assets/Sounds: swift run SoundMaker
        .executableTarget(name: "SoundMaker"),
    ]
)
