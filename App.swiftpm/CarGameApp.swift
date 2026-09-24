import SwiftUI

/// The app: one full-screen game view. Everything the player sees is drawn by the game
/// (`GamePresentation`); the app adds native buttons and sheets on top.
@main
struct CarGameApp: App {
    @State private var model = GameModel()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            GameScreen(model: model)
                .statusBarHidden()
                .persistentSystemOverlays(.hidden)
                .preferredColorScheme(.dark)
        }
        .onChange(of: scenePhase) { _, phase in
            // A call or the home screen freezes the shift; it counts back in afterwards.
            model.setActive(phase == .active)
        }
    }
}
