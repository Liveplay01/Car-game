import GameCore
import GamePresentation
import SwiftUI

/// Touch → game actions, exactly as the mouse works in the test window: the tab strip
/// switches pages, pages take their taps, the Street Builder takes drags, and anywhere else
/// a touch is a tap into the game. The tap counts the moment the finger comes down.
struct TouchLayer: ViewModifier {
    let model: GameModel
    @State private var isDown = false

    func body(content: Content) -> some View {
        content.gesture(
            DragGesture(minimumDistance: 0, coordinateSpace: .local)
                .onChanged { value in
                    let point = Vec2(value.location.x, value.location.y)
                    if !isDown {
                        isDown = true
                        down(at: Vec2(value.startLocation.x, value.startLocation.y))
                    } else if model.session.screen == .page(.streetBuilder) {
                        model.send(.pointerMove(point))
                    }
                }
                .onEnded { value in
                    isDown = false
                    if model.session.screen == .page(.streetBuilder) {
                        model.send(.pointerUp(Vec2(value.location.x, value.location.y)))
                    }
                }
        )
    }

    private func down(at point: Vec2) {
        let session = model.session
        let viewport = model.viewport
        let tabBar = session.screen.showsTabBar ? TabStrip.height : 0
        if session.screen.showsTabBar, let tab = TabStrip.tab(at: point, viewport: viewport) {
            model.send(.selectTab(tab))
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
