import Foundation
import GameCore

/// A short text where something happened (FOUNDATION.md 3, motion rules). Clean merges
/// get none: they happen ~100 times a shift.
struct Popup: Sendable, Equatable {
    enum Kind: Sendable, Equatable {
        case tightFit
        case cutOff
        case penalty(Int)
        /// A takedown and its points.
        case busted(Int)
        /// The next car became a police car.
        case dispatch
        /// A police car seized the transporter: no money.
        case seized
        /// A crash wrecked the transporter: no money.
        case lost
        /// A transporter left safely and the player was paid.
        case paid(Int)
        /// A module on the ring earned money: a toll, a fine.
        case earned(Int)
    }

    static let lifetime = 0.9
    /// Scale 0.9 → 1 with fade-in, ease-out, under 250 ms.
    static let enter = 0.2
    static let exit = 0.3

    /// Running number, so the render id stays stable while older popups disappear.
    var serial: Int
    var kind: Kind
    /// World position.
    var position: Vec2
    var age = 0.0
}

/// The in-game HUD (FOUNDATION.md 3): score top left, cars left and crashes top centre, the
/// combo on the centre island, where it never covers traffic. Screen space, points.
enum HUD {
    static func add(world: World, level: Int, duty: Duty, score: Int, comboPop: Double, format: TextFormat, showsKeys: Bool, timeScale: Double, to list: inout RenderList) {
        let width = list.camera.viewport.x
        let margin = Metrics.hudMargin
        var id = RenderID.hud

        func add(_ primitive: Primitive, _ color: ColorToken, opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity, space: .screen, id: id)
            id += 1
        }

        addBand(height: Metrics.hudBand, to: &list, id: &id)

        add(.text(format.number(score), position: Vec2(margin, Metrics.hudRow), size: Metrics.scoreSize, alignment: .leading, weight: .bold), .primary)

        // Cars still to send; during rush hour on an accent pill: a state change you notice
        // at a glance. It stays there once the shift is over.
        let counter = Vec2(width / 2, Metrics.hudRow)
        let cars = Strings.HUD.cars(world.carsLeft ?? 0)
        if world.shift.rushHourSince != nil {
            add(.roundedRect(center: counter, size: Vec2(Metrics.counterPillWidth, 38), cornerRadius: 19, rotation: 0), .accent)
            add(.text(cars, position: counter, size: Metrics.timerSize, alignment: .center, weight: .bold), .accentInk)
        } else {
            add(.text(cars, position: counter, size: Metrics.timerSize, alignment: .center, weight: .bold), .primary)
        }

        // Crashes the shift survives, under the car counter: one dot per strike (only if there is
        // more than one) and one per police crash, ringed in police blue. Filled once used.
        var dots: [(used: Bool, ring: ColorToken)] = []
        if world.config.maxStrikes > 1 {
            dots += (0..<world.config.maxStrikes).map { ($0 < world.score.strikes, .muted) }
        }
        let firstPolice = dots.count
        dots += (0..<world.config.maxPoliceCrashes).map { ($0 < world.score.policeCrashes, .lightBlue) }
        // Half a dot of extra room between the two groups.
        let groupGap = firstPolice > 0 && dots.count > firstPolice ? 0.5 : 0
        let span = Double(dots.count - 1) + groupGap
        for (index, dot) in dots.enumerated() {
            let slot = Double(index) + (index >= firstPolice ? groupGap : 0)
            let center = Vec2(width / 2 + (slot - span / 2) * Metrics.strikeSpacing, Metrics.strikeRow)
            if dot.used {
                add(.circle(center: center, radius: Metrics.strikeRadius), .destructive)
            } else {
                add(.arc(center: center, radius: Metrics.strikeRadius - 0.75, thickness: 1.5, startAngle: 0, endAngle: Angle.tau), dot.ring)
            }
        }

        if showsKeys {
            // The app gets a dispatch button (and the Action Button) in M7.
            add(.text(Strings.Keys.dispatch, position: Vec2(margin, Metrics.strikeRow), size: 11, alignment: .leading, weight: .regular), .muted)
            if timeScale != 1 {
                add(.text(Strings.multiplier(timeScale), position: Vec2(width - margin, Metrics.strikeRow), size: 13, alignment: .trailing, weight: .bold), .muted)
            }
        }

        addIsland(world: world, level: level, duty: duty, pop: comboPop, to: &list, id: &id)
    }

    /// Back after an interruption: the world stands still and counts in. No menu, no button
    /// to find — the shift simply picks up where it was (FOUNDATION.md 3).
    static func addCountIn(secondsLeft: Double, to list: inout RenderList) {
        let viewport = list.camera.viewport
        var id = RenderID.overlay
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .background, opacity: 0.55, space: .screen, id: id)
        id += 1
        let center = list.camera.toScreen(.zero)
        let count = max(1, Int(secondsLeft.rounded(.up)))
        // Each second lands: the number comes in a little large and settles.
        let within = secondsLeft - Double(count - 1)
        let size = 64.0 * (1 + 0.18 * (1 - Ease.outCubic(Ease.clamp01((1 - within) / 0.35))))
        list.add(.text(String(count), position: center, size: size, alignment: .center, weight: .bold), color: .primary, space: .screen, id: id)
    }

    /// The north arm runs up under the HUD. A band in the background colour keeps the text
    /// readable; a short fade lets cars disappear softly instead of at a hard edge.
    static func addBand(height band: Double, to list: inout RenderList, id: inout Int) {
        let width = list.camera.viewport.x
        list.add(.roundedRect(center: Vec2(width / 2, band / 2), size: Vec2(width, band), cornerRadius: 0, rotation: 0), color: .background, space: .screen, id: id)
        id += 1
        let steps = 4
        for step in 0..<steps {
            let height = Metrics.hudFade / Double(steps)
            let center = Vec2(width / 2, band + height * (Double(step) + 0.5))
            list.add(.roundedRect(center: center, size: Vec2(width, height), cornerRadius: 0, rotation: 0), color: .background, opacity: 1 - Double(step + 1) / Double(steps + 1), space: .screen, id: id)
            id += 1
        }
    }

    /// Multiplier, combo count, and above them the level, or in rush hour its factor, on
    /// the centre island.
    private static func addIsland(world: World, level: Int, duty: Duty, pop: Double, to list: inout RenderList, id: inout Int) {
        let config = world.config
        let center = list.camera.toScreen(.zero)
        let tier = Scoring.tier(combo: world.score.combo, config: config)
        let isTopTier = tier > 0 && tier == min(config.comboThresholds.count, config.comboMultipliers.count)
        let color: ColorToken = tier == 0 ? .muted : (isTopTier ? .accent : .primary)
        let multiplier = Scoring.multiplier(tier: tier, config: config)

        // A new tier lands with a short spring, so it is felt without looking for it.
        let size = Metrics.multiplierSize * (1 + 0.16 * sin(.pi * Ease.outCubic(pop)))
        list.add(
            .text(Strings.comboMultiplier(multiplier), position: center, size: size, alignment: .center, weight: .bold),
            color: color, space: .screen, id: id
        )
        id += 1
        if world.score.combo > 0 {
            list.add(
                .text(Strings.HUD.combo(world.score.combo), position: center + Vec2(0, 34), size: Metrics.comboLabelSize, alignment: .center, weight: .bold),
                color: .muted, space: .screen, id: id
            )
        }
        id += 1
        if world.shift.isRushHour {
            list.add(
                .text(Strings.HUD.rushFactor(config.rushHourScoreFactor), position: center + Vec2(0, -38), size: Metrics.comboLabelSize, alignment: .center, weight: .bold),
                color: .accent, space: .screen, id: id
            )
        } else {
            list.add(
                .text(Strings.HUD.level(level, duty: duty), position: center + Vec2(0, -38), size: Metrics.comboLabelSize, alignment: .center, weight: .bold),
                color: duty == .highAlert ? .destructive : .muted, space: .screen, id: id
            )
        }
        id += 1
        // The chase: "WANTED" while it is announced, then the seconds it has left.
        let wanted: String?
        var opacity = 1.0
        switch world.criminal.phase {
        case .warning, .arriving:
            wanted = Strings.HUD.wanted
            opacity = 0.55 + 0.45 * sin(world.time * 10)
        case let .active(_, deadline):
            wanted = Strings.HUD.wanted(deadline - world.time)
        case .idle, .leaving:
            wanted = nil
        }
        if let wanted {
            list.add(
                .text(wanted, position: center + Vec2(0, -64), size: 17, alignment: .center, weight: .bold),
                color: .vehicleCriminal, opacity: opacity, space: .screen, id: id
            )
        }
        id += 1
    }

    /// Marks the criminal in the scene: a pulsing ring at the arm it will come from, then a
    /// countdown ring around the pickup that empties as its time runs out.
    static func addChase(world: World, alpha: Double, to list: inout RenderList) {
        let config = world.config
        var id = RenderID.hud + 500
        switch world.criminal.phase {
        case let .warning(arm, _):
            let pulse = (world.time * 1.6).truncatingRemainder(dividingBy: 1)
            let stop = world.layout.stopPose(arm).position
            list.add(.arc(center: stop, radius: 14 + 18 * pulse, thickness: 2.5, startAngle: 0, endAngle: Angle.tau), color: .vehicleCriminal, opacity: 1 - pulse, space: .world, id: id)
            id += 1
            list.add(.arc(center: stop, radius: 14, thickness: 2, startAngle: 0, endAngle: Angle.tau), color: .vehicleCriminal, space: .world, id: id)
        case let .arriving(vehicleID):
            guard let pickup = world.vehicle(id: vehicleID) else { return }
            let pose = SceneBuilder.interpolatedPose(pickup, alpha: alpha)
            list.add(.arc(center: pose.position, radius: 20, thickness: 2, startAngle: 0, endAngle: Angle.tau), color: .vehicleCriminal, opacity: 0.6, space: .world, id: id)
        case let .active(vehicleID, deadline):
            guard let pickup = world.vehicle(id: vehicleID), !pickup.isCrashed else { return }
            let pose = SceneBuilder.interpolatedPose(pickup, alpha: alpha)
            let left = max(0, deadline - world.time) / config.criminalTime
            list.add(.arc(center: pose.position, radius: 20, thickness: 1, startAngle: 0, endAngle: Angle.tau), color: .vehicleCriminal, opacity: 0.3, space: .world, id: id)
            id += 1
            if left > 0.001 {
                // Empties clockwise from the top, like a clock running down.
                list.add(.arc(center: pose.position, radius: 20, thickness: 3, startAngle: .pi / 2, endAngle: .pi / 2 + Angle.tau * left), color: .vehicleCriminal, space: .world, id: id)
            }
            id += 1
            let label = list.camera.toScreen(pose.position) + Vec2(0, -list.camera.toScreen(length: 20) - 12)
            list.add(.text(String(Int((deadline - world.time).rounded(.up))), position: label, size: 14, alignment: .center, weight: .bold), color: .vehicleCriminal, space: .screen, id: id)
        case .idle, .leaving:
            break
        }
    }

    /// The money transporter: a pulsing ring at the arm it will come from, then a countdown
    /// ring around the truck that empties as its time runs out, plus the secure zones as
    /// pale arcs on the ring. It circles until its time is up, so no exit is marked.
    static func addTransporter(world: World, alpha: Double, to list: inout RenderList) {
        let config = world.config
        var id = RenderID.hud + 600
        switch world.criminal.phase {  // keep the chase ring above the secure zones
        case .warning, .arriving, .active: id += 40
        default: break
        }
        switch world.transporter.phase {
        case let .warning(arm, _):
            let pulse = (world.time * 1.6).truncatingRemainder(dividingBy: 1)
            let stop = world.layout.stopPose(arm).position
            list.add(.arc(center: stop, radius: 14 + 18 * pulse, thickness: 2.5, startAngle: 0, endAngle: Angle.tau), color: .vehicleCargo, opacity: 1 - pulse, space: .world, id: id)
            id += 1
            list.add(.arc(center: stop, radius: 14, thickness: 2, startAngle: 0, endAngle: Angle.tau), color: .vehicleCargo, space: .world, id: id)
        case let .arriving(vehicleID):
            guard let truck = world.vehicle(id: vehicleID) else { return }
            let pose = SceneBuilder.interpolatedPose(truck, alpha: alpha)
            list.add(.arc(center: pose.position, radius: 20, thickness: 2, startAngle: 0, endAngle: Angle.tau), color: .vehicleCargo, opacity: 0.6, space: .world, id: id)
        case let .active(vehicleID, deadline):
            guard let truck = world.vehicle(id: vehicleID), !truck.isCrashed else { return }
            let pose = SceneBuilder.interpolatedPose(truck, alpha: alpha)
            let left = max(0, deadline - world.time) / config.transporterTime
            list.add(.arc(center: pose.position, radius: 20, thickness: 1, startAngle: 0, endAngle: Angle.tau), color: .vehicleCargo, opacity: 0.3, space: .world, id: id)
            id += 1
            if left > 0.001 {
                list.add(.arc(center: pose.position, radius: 20, thickness: 3, startAngle: .pi / 2, endAngle: .pi / 2 + Angle.tau * left), color: .vehicleCargo, space: .world, id: id)
            }
            id += 1
            let label = list.camera.toScreen(pose.position) + Vec2(0, -list.camera.toScreen(length: 20) - 12)
            list.add(.text(String(Int((deadline - world.time).rounded(.up))), position: label, size: 14, alignment: .center, weight: .bold), color: .vehicleCargo, space: .screen, id: id)
            id += 1
            // The secure zones, fore and aft, as pale arcs on the ring.
            for zone in world.secureZones() {
                list.add(.arc(center: .zero, radius: config.ringRadius + config.laneWidth / 2 - 3, thickness: 2,
                              startAngle: zone.s / config.ringRadius, endAngle: (zone.s + zone.arc) / config.ringRadius),
                         color: .vehicleCargo, opacity: 0.35, space: .world, id: id)
                id += 1
            }
        case .idle, .leaving, .seized:
            break
        }
    }

    static func addPopups(_ popups: [Popup], format: TextFormat, reduceMotion: Bool, to list: inout RenderList) {
        let camera = list.camera
        for popup in popups {
            let enter = Ease.outCubic(popup.age / Popup.enter)
            let exit = Ease.clamp01((popup.age - (Popup.lifetime - Popup.exit)) / Popup.exit)
            let opacity = min(enter, 1 - exit)
            let scale = reduceMotion ? 1 : 0.9 + 0.1 * enter
            let rise = reduceMotion ? 0 : 10 * Ease.outCubic(popup.age / Popup.lifetime)
            let text: String
            let color: ColorToken
            switch popup.kind {
            case .tightFit:
                text = Strings.HUD.tight
                color = .accent
            case .cutOff:
                text = Strings.HUD.cutOff
                color = .muted
            case let .penalty(points):
                text = format.signed(-points)
                color = .destructive
            case let .busted(points):
                text = "\(Strings.HUD.busted) \(format.signed(points))"
                color = .lightBlue
            case .dispatch:
                text = Strings.HUD.dispatch
                color = .lightBlue
            case .seized:
                text = Strings.HUD.seized
                color = .vehicleCargo
            case .lost:
                text = Strings.HUD.lost
                color = .destructive
            case let .paid(amount):
                text = Strings.HUD.paid(format.signed(amount))
                color = .vehicleCargo
            case let .earned(amount):
                // Small, quiet money: it happens many times a shift.
                text = format.signed(amount)
                color = .accent
            }
            list.add(
                .text(text, position: camera.toScreen(popup.position) + Vec2(0, -30 - rise), size: Metrics.popupSize * scale, alignment: .center, weight: .bold),
                color: color, opacity: opacity, space: .screen, id: RenderID.popups + popup.serial % 1_000
            )
        }
    }
}

/// The Game tab between shifts: which level comes next, how many cars it has, and that one
/// tap starts it. There is no start menu (FOUNDATION.md 3); the shift is already flowing
/// behind it.
enum ReadyBanner {
    static func add(level: Int, cars: Int, duty: Duty, dutyPay: Double, status: String, time: Double, reduceMotion: Bool, showsKeys: Bool, to list: inout RenderList) {
        let width = list.camera.viewport.x
        var id = RenderID.hud
        HUD.addBand(height: Metrics.resultBand, to: &list, id: &id)
        func text(_ string: String, _ position: Vec2, size: Double, weight: FontWeight = .bold, color: ColorToken, opacity: Double = 1) {
            list.add(.text(string, position: position, size: size, alignment: .center, weight: weight), color: color, opacity: opacity, space: .screen, id: id)
            id += 1
        }
        text(Strings.HUD.level(level), Vec2(width / 2, 36), size: 24, color: .accent)
        text(Strings.HUD.cars(cars), Vec2(width / 2, 72), size: 20, color: .primary)
        text(Strings.Ready.duty(duty, pay: dutyPay), Vec2(width / 2, 100), size: 14, color: duty == .highAlert ? .destructive : .muted)
        text(status, Vec2(width / 2, 124), size: 13, weight: .regular, color: .muted)
        // The prompt breathes gently, so the waiting screen is alive; still with Reduce Motion.
        let island = list.camera.toScreen(.zero)
        let breath = reduceMotion ? 1 : 0.7 + 0.3 * (0.5 + 0.5 * cos(time * 2.4))
        text(Strings.Ready.tapToStart, island, size: 17, color: .primary, opacity: breath)
        if showsKeys {
            text(Strings.Ready.keys, island + Vec2(0, 28), size: 12, weight: .regular, color: .muted)
        }
    }
}

/// The end of a shift, right in the scene: "GAME OVER" or "SHIFT COMPLETE" on top, the
/// score below, and one tap anywhere starts the next shift. No menu, no button to find:
/// the thumb stays where it is.
enum ResultBanner {
    /// Taps in the first moment after the banner appears are ignored, so a hurried tap meant
    /// for the last car never starts the next shift by accident.
    static let inputLock = 0.4
    static let enter = 0.25

    static func add(_ summary: ShiftSummary, age: Double, format: TextFormat, reduceMotion: Bool, showsKeys: Bool, to list: inout RenderList) {
        let result = summary.result
        let width = list.camera.viewport.x
        var id = RenderID.hud
        HUD.addBand(height: Metrics.resultBand, to: &list, id: &id)

        let enter = Ease.outCubic(age / Self.enter)
        let slide = reduceMotion ? 0 : (1 - enter) * -8
        func text(_ string: String, _ position: Vec2, size: Double, weight: FontWeight = .bold, color: ColorToken, opacity: Double = 1) {
            list.add(.text(string, position: position + Vec2(0, slide), size: size, alignment: .center, weight: weight), color: color, opacity: opacity * enter, space: .screen, id: id)
            id += 1
        }

        let (title, titleColor): (String, ColorToken) = switch result.outcome {
        case .completed: (Strings.Result.levelComplete(summary.level), .accent)
        case .struckOut: (Strings.Result.gameOver, .destructive)
        case .escaped: (Strings.Result.escaped, .vehicleCriminal)
        }
        text(title, Vec2(width / 2, 36), size: 24, color: titleColor)
        text(format.number(result.score), Vec2(width / 2, 84), size: 48, color: .primary)
        if summary.isNewHighscore {
            text(Strings.Result.newHighscore, Vec2(width / 2, 126), size: 15, color: .accent)
        } else if summary.previousHighscore > 0 {
            text(Strings.Result.best(format.number(summary.previousHighscore)), Vec2(width / 2, 126), size: 15, weight: .regular, color: .muted)
        }

        // The prompt appears once taps count, in the middle of the island.
        let prompt = Ease.outCubic((age - inputLock) / Self.enter)
        guard prompt > 0 else { return }
        let island = list.camera.toScreen(.zero)
        let next = result.outcome == .completed ? Strings.Result.nextLevel(summary.level + 1) : Strings.Result.retryLevel(summary.level)
        text(next, island, size: 17, color: .primary, opacity: prompt)
        text(Strings.Result.stats(combo: format.number(result.bestCombo), tightFits: format.number(result.tightFits), busted: result.takedowns, transporters: result.transporters, money: result.money > 0 ? format.number(result.money) : nil, time: format.seconds(result.time)), island + Vec2(0, 28), size: 13, weight: .regular, color: .muted, opacity: prompt)
        if showsKeys {
            text(Strings.Result.keys(seed: result.seed), island + Vec2(0, 48), size: 12, weight: .regular, color: .muted, opacity: prompt)
        }
    }
}
