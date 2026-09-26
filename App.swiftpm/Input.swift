import GameCore
import GamePresentation
import SwiftUI

/// Touch → game actions, exactly as the mouse works in the test window: the tab strip
/// switches pages, pages take their taps, the Street Builder takes drags, and anywhere else
/// a touch is a tap into the game. The tap counts the moment the finger comes down.
struct TouchLayer: ViewModifier {
    let model: GameModel
    @State private var isDown = false
    /// A touch on the Game tab between shifts: a tap, or a swipe to another mode.
    @State private var swipesGameTab = false

    func body(content: Content) -> some View {
        content.gesture(
            DragGesture(minimumDistance: 0, coordinateSpace: .local)
                .onChanged { value in
                    let point = Vec2(value.location.x, value.location.y)
                    if !isDown {
                        isDown = true
                        down(at: Vec2(value.startLocation.x, value.startLocation.y))
                    } else if swipesGameTab || model.session.screen == .page(.streetBuilder) {
                        model.send(.pointerMove(point))
                    }
                }
                .onEnded { value in
                    isDown = false
                    if swipesGameTab || model.session.screen == .page(.streetBuilder) {
                        model.send(.pointerUp(Vec2(value.location.x, value.location.y)))
                    }
                    swipesGameTab = false
                }
        )
    }

    private func down(at point: Vec2) {
        let session = model.session
        let viewport = model.viewport
        let tabBar = session.screen.showsTabBar ? TabStrip.height : 0
        // The shared chrome (tab strip, the Build tab's segments, the Progress tab) the
        // session maps itself.
        if let action = session.pageAction(at: point, viewport: viewport) {
            model.send(action)
        } else if session.screen == .page(.upgrades) {
            if let upgrade = UpgradePage.card(at: point, viewport: viewport, bottomInset: tabBar, upgrades: session.visibleUpgrades) {
                model.send(.tapUpgrade(upgrade))
            }
        } else if session.screen == .page(.shop) {
            if let target = ShopPage.target(at: point, viewport: viewport, bottomInset: tabBar, career: session.save.career, state: session.shopPage) {
                model.send(.tapShop(target))
            }
        } else if session.screen == .page(.streetBuilder) {
            model.send(.pointerDown(point))
        } else if session.screen == .settings {
            // The native sheet handles settings.
        } else if session.screen.showsTabBar && session.screen.tab == .game {
            // Between shifts the touch may become a swipe to another mode; the session turns
            // a short one into the tap when the finger lifts.
            swipesGameTab = true
            model.send(.pointerDown(point))
        } else {
            model.send(.tap)
        }
    }
}

extension View {
    func touchInput(_ model: GameModel) -> some View {
        modifier(TouchLayer(model: model))
    }
}
