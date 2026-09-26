import Foundation
import GameCore

/// The first shift teaches the one thing to know (Leo, 25.09.2026: a short tutorial, a few
/// hints right in the game, no menu). Nothing pauses and nothing has to be read to play:
///
/// 1. Before the first tap, the front car of the queue pulses and the prompt says it goes.
/// 2. Once it went, the island says to wait for a gap, until two cars are in cleanly.
/// 3. Then, for a moment, that clean merges build the combo.
/// 4. The first crash says, right under the strike dots, that a car crash ends the shift at
///    once and only the police have a few chances (`maxPoliceCrashes`).
///
/// It ends with the first shift, whatever its outcome, and never comes back.
struct Tutorial: Sendable, Equatable {
    enum Step: Sendable, Equatable {
        /// The Game tab before the very first tap.
        case sendCar
        /// Playing: wait for a gap.
        case findGap
        /// A moment after the second clean merge.
        case combo
        /// No hint; the strike hint may still come.
        case quiet
    }

    var step = Step.sendCar
    /// Seconds the current step has been showing.
    var age = 0.0
    var cleanMerges = 0
    /// The strike hint: seconds since the first crash, once it happened.
    var strikeAge: Double?
    /// The first shift is over: no new hints, but a strike hint already showing runs out, so
    /// the crash that ends the first shift still says why.
    private(set) var isOver = false

    /// Nothing left to show: the shift is over and no strike hint is still running.
    var isDone: Bool {
        isOver && (strikeAge.map { $0 >= Self.hintDuration } ?? true)
    }

    mutating func end() {
        isOver = true
        move(to: .quiet)
    }

    /// Clean merges before the combo hint.
    static let mergesToLearn = 2
    /// How long the combo and the strike hints stay.
    static let hintDuration = 3.5

    mutating func age(by delta: Double) {
        age += delta
        if let strikeAge { self.strikeAge = strikeAge + delta }
        if step == .combo, age >= Self.hintDuration { move(to: .quiet) }
    }

    mutating func move(to next: Step) {
        guard next != step else { return }
        step = next
        age = 0
    }

    /// What happened in the shift moves the hints on.
    mutating func react(to event: GameEvent) {
        guard !isOver else { return }
        switch event {
        case .launched:
            if step == .sendCar { move(to: .findGap) }
        case let .merged(report):
            guard report.rating != .cutOff else { return }
            cleanMerges += 1
            if step == .findGap, cleanMerges >= Self.mergesToLearn { move(to: .combo) }
        case let .crash(report):
            // Any crash charged to the player, even one at 0 points that costs nothing.
            if strikeAge == nil, report.isStrike || report.isPoliceCrash { strikeAge = 0 }
        default:
            break
        }
    }

    // MARK: - Drawing

    /// The prompt on the Game tab instead of "Tap to start", the first time.
    static let readyPrompt = Strings.Tutorial.sendCar

    /// The hints over the playing scene: the pulse on the front car, the island's hint pill,
    /// and the one under the strike dots.
    static func add(_ tutorial: Tutorial, world: World, alpha: Double, time: Double, reduceMotion: Bool, to list: inout RenderList) {
        var id = RenderID.tutorial
        let camera = list.camera
        if tutorial.step == .sendCar || tutorial.step == .findGap, let front = world.queue.vehicles.first.flatMap({ world.vehicle(id: $0) }) {
            // A ring breathing around the car that goes next.
            let at = camera.toScreen(SceneBuilder.interpolatedPose(front, alpha: alpha).position)
            let beat = reduceMotion ? 0.5 : 0.5 + 0.5 * sin(time * 4)
            let fade = tutorial.step == .sendCar ? 1 : max(0, 1 - tutorial.age / 1.5)
            list.add(.arc(center: at, radius: 22 + 5 * beat, thickness: 2.5, startAngle: 0, endAngle: Angle.tau), color: .accent, opacity: (0.45 + 0.4 * beat) * fade, space: .screen, id: id)
            list.add(.circle(center: at, radius: 22 + 5 * beat), color: .accent, opacity: 0.08 * fade, space: .screen, id: id + 1)
            id += 2
        }
        let island = camera.toScreen(.zero)
        switch tutorial.step {
        case .findGap:
            pill(Strings.Tutorial.findGap, at: island + Vec2(0, 74), age: tutorial.age, leaving: nil, reduceMotion: reduceMotion, id: &id, to: &list)
        case .combo:
            pill(Strings.Tutorial.combo, at: island + Vec2(0, 74), age: tutorial.age, leaving: tutorial.age - (hintDuration - 0.3), reduceMotion: reduceMotion, id: &id, to: &list)
        case .sendCar, .quiet:
            break
        }
        if let strikeAge = tutorial.strikeAge, strikeAge < hintDuration {
            let at = Vec2(camera.viewport.x / 2, TopBar.top + TopBar.height + 28)
            pill(Strings.Tutorial.strikes(policeCrashes: world.config.maxPoliceCrashes), at: at, age: strikeAge, leaving: strikeAge - (hintDuration - 0.3), reduceMotion: reduceMotion, tint: .destructive, id: &id, to: &list)
        }
    }

    /// A hint: a dark pill with a thin edge in its colour. It glides in from a little lower
    /// and fades out quicker than it came. A hint too long for a small screen gets a slightly
    /// smaller size instead of running over the edge.
    private static func pill(_ text: String, at center: Vec2, age: Double, leaving: Double?, reduceMotion: Bool, tint: ColorToken = .accent, id: inout Int, to list: inout RenderList) {
        let enter = Ease.outCubic(age / 0.25)
        let exit = leaving.map { Ease.clamp01($0 / 0.3) } ?? 0
        let opacity = enter * (1 - exit)
        guard opacity > 0.001 else { return }
        let rise = reduceMotion ? 0 : (1 - Ease.settle(age / 0.4)) * 10
        let size = fittingSize(text, viewportWidth: list.camera.viewport.x)
        let width = Icons.textWidth(text, size: size) + 32
        let at = center + Vec2(0, rise)
        MenuKit.chromePill(center: at, size: Vec2(width, 32), tint: tint, opacity: opacity, id: &id, to: &list)
        list.add(.text(text, position: at, size: size, alignment: .center, weight: .bold), color: .primary, opacity: opacity, space: .screen, id: id)
        id += 1
    }

    /// The hint's text size: 14, or less (never under 12) so the pill keeps the screen margins.
    static func fittingSize(_ text: String, viewportWidth: Double) -> Double {
        let natural = 14.0
        let room = viewportWidth - 2 * TopBar.margin - 32
        let width = Icons.textWidth(text, size: natural)
        return width <= room ? natural : max(12, natural * room / width)
    }
}
