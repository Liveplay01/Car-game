import GameCore
import GamePresentation
import QuartzCore
import SwiftUI
import UIKit

/// Owns the game session and drives it with the display: every frame it hands the touches
/// of that frame to the session and keeps the render list the canvas draws.
@MainActor
@Observable
final class GameModel {
    let session: GameSession
    /// What the canvas draws; replaced every frame. Not observed: the canvas redraws with
    /// the display anyway (`TimelineView(.animation)`).
    @ObservationIgnored private(set) var renderList: RenderList?
    /// Mirrors of session state the native overlays react to.
    private(set) var screen: Screen = .ready
    private(set) var duty: Duty = .normal
    private(set) var dailySelected = false
    private(set) var settingsContent: ScreenContent?

    @ObservationIgnored private let audio = AppAudio()
    @ObservationIgnored private let haptics = AppHaptics()
    @ObservationIgnored private let music = AppMusic()
    @ObservationIgnored private let ads = AdMobRewardedAds()
    @ObservationIgnored private var pending: [InputAction] = []
    @ObservationIgnored private var displayLink: CADisplayLink?
    @ObservationIgnored private var lastTimestamp: CFTimeInterval?
    @ObservationIgnored var viewport = Vec2(390, 844)

    init() {
        session = GameSession(
            random: SystemSeeds(),
            store: AppSaveStore(),
            audio: audio,
            haptics: haptics,
            options: PresentationOptions(drawsMenus: true, showsKeyHints: false)
        )
        session.systemReduceMotion = UIAccessibility.isReduceMotionEnabled
        // With the AdMob SDK the real ad runs; without it the game's placeholder ad.
        if AdMobRewardedAds.isAvailable {
            session.adProvider = ads
            ads.prepare()
        }
        let link = CADisplayLink(target: DisplayTarget(model: self), selector: #selector(DisplayTarget.tick(_:)))
        link.preferredFrameRateRange = CAFrameRateRange(minimum: 60, maximum: 120, preferred: 120)
        link.add(to: .main, forMode: .common)
        displayLink = link
    }

    /// Queues an action for the next frame.
    func send(_ action: InputAction) {
        pending.append(action)
    }

    func setActive(_ active: Bool) {
        send(active ? .focusGained : .focusLost)
    }

    fileprivate func tick(_ link: CADisplayLink) {
        let delta = lastTimestamp.map { link.timestamp - $0 } ?? 1.0 / 60
        lastTimestamp = link.timestamp
        session.systemReduceMotion = UIAccessibility.isReduceMotionEnabled
        let actions = pending
        pending.removeAll()
        let fps = Int((1 / max(delta, 1.0 / 240)).rounded())
        let frame = session.frame(delta: delta, actions: actions, viewport: viewport, fps: fps)
        renderList = frame.renderList
        music.update(mix: session.musicMix, enabled: session.save.settings.sound, delta: delta)
        // Only what the native overlays need; changes are rare, so SwiftUI stays calm.
        if screen != session.screen { screen = session.screen }
        if duty != session.save.career.duty { duty = session.save.career.duty }
        if dailySelected != session.dailySelected { dailySelected = session.dailySelected }
        let content = session.screen == .settings ? session.content : nil
        if settingsContent != content { settingsContent = content }
    }
}

/// CADisplayLink holds its target strongly; this small object keeps the model free.
private final class DisplayTarget: NSObject {
    weak var model: GameModel?

    init(model: GameModel) {
        self.model = model
    }

    @MainActor @objc func tick(_ link: CADisplayLink) {
        model?.tick(link)
    }
}
