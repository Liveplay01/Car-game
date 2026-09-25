import Foundation
import GameCore

/// A short text where something happened (FOUNDATION.md 3, motion rules). Clean merges
/// get none: they happen ~100 times a shift.
struct Popup: Sendable, Equatable {
    enum Kind: Sendable, Equatable {
        case tightFit
        /// No text (IDEA.md: no popup), just a faint ring: "that was close" (M6).
        case nearMiss
        /// No text either: a short precision ring where the car landed (M6).
        case perfect
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
        /// What a crash cost from level 20 on (M7).
        case cost(Int)
        /// A crash the insurance paid for completely (M7).
        case covered
        /// A module did its job (M9): a short pulse and a few sparks in its colour, so the
        /// player sees it is worth something.
        case modulePulse(ColorToken)
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
    /// How far each small HUD change has come, 0 → 1; 1 is settled (and all of them are
    /// with Reduce Motion). Nothing in the HUD just switches (Leo: "so smooth wie möglich").
    struct Pops {
        /// A car went in: the counter ticks.
        var cars = 1.0
        /// Rush hour began: its pill springs open.
        var rushHour = 1.0
        /// A strike or a police crash was used: its dot fills with a bump and a ring.
        var strike = 1.0
        var policeCrash = 1.0

        /// Scale of something that lands: `amount` larger at 0, a little under at the swing, 1 at the end.
        static func land(_ x: Double, amount: Double) -> Double {
            x >= 1 ? 1 : 1 + amount * (1 - Ease.spring(x))
        }
    }

    static func add(world: World, level: Int, duty: Duty, score: Int, comboPop: Double, race: (delta: Double, pop: Double)? = nil, pops: Pops = Pops(), format: TextFormat, showsKeys: Bool, timeScale: Double, to list: inout RenderList) {
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
        // Every car sent ticks the counter; the rush-hour pill springs open around it.
        let tick = Pops.land(pops.cars, amount: 0.12)
        if world.shift.rushHourSince != nil {
            let open = Ease.spring(pops.rushHour)
            let pill = Vec2(Metrics.counterPillWidth * (0.55 + 0.45 * open), 38 * (0.7 + 0.3 * open))
            add(.roundedRect(center: counter, size: pill, cornerRadius: pill.y / 2, rotation: 0), .accent, opacity: Ease.outCubic(pops.rushHour / 0.4))
            add(.text(cars, position: counter, size: Metrics.timerSize * tick, alignment: .center, weight: .bold), .accentInk)
        } else {
            add(.text(cars, position: counter, size: Metrics.timerSize * tick, alignment: .center, weight: .bold), .primary)
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
            // The dot that was just used lands with a bump and sends a ring out.
            let isNewest = index < firstPolice
                ? index == world.score.strikes - 1
                : index - firstPolice == world.score.policeCrashes - 1
            let pop = !isNewest ? 1 : (index < firstPolice ? pops.strike : pops.policeCrash)
            if dot.used {
                if pop < 1 {
                    let x = Ease.outCubic(pop)
                    add(.arc(center: center, radius: Metrics.strikeRadius * (1 + 1.6 * x), thickness: 1.5, startAngle: 0, endAngle: Angle.tau), .destructive, opacity: 1 - x)
                }
                add(.circle(center: center, radius: Metrics.strikeRadius * Pops.land(pop, amount: 0.7)), .destructive)
            } else {
                add(.arc(center: center, radius: Metrics.strikeRadius - 0.75, thickness: 1.5, startAngle: 0, endAngle: Angle.tau), dot.ring)
            }
        }

        if showsKeys {
            // The app gets a dispatch button (and the Action Button) in M12.
            add(.text(Strings.Keys.dispatch, position: Vec2(margin, Metrics.strikeRow), size: 11, alignment: .leading, weight: .regular), .muted)
            if timeScale != 1 {
                add(.text(Strings.multiplier(timeScale), position: Vec2(width - margin, Metrics.strikeRow), size: 13, alignment: .trailing, weight: .bold), .muted)
            }
        }

        // The race against the best time at this level (Leo: Rekord-Geist): ahead in the
        // accent, behind in red, ticking with every car.
        if let race {
            let right = width - margin
            add(.text(Strings.Race.best, position: Vec2(right, Metrics.hudRow - 15), size: 10, alignment: .trailing, weight: .bold), .muted)
            add(.text(Strings.Race.delta(race.delta), position: Vec2(right, Metrics.hudRow + 3), size: 16 * Pops.land(race.pop, amount: 0.15), alignment: .trailing, weight: .bold), race.delta <= 0 ? .accent : .destructive)
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
        // In the ground's colour, so it melts into every map.
        let ground = list.background
        list.add(.roundedRect(center: Vec2(width / 2, band / 2), size: Vec2(width, band), cornerRadius: 0, rotation: 0), color: ground, space: .screen, id: id)
        id += 1
        let steps = 4
        for step in 0..<steps {
            let height = Metrics.hudFade / Double(steps)
            let center = Vec2(width / 2, band + height * (Double(step) + 0.5))
            list.add(.roundedRect(center: center, size: Vec2(width, height), cornerRadius: 0, rotation: 0), color: ground, opacity: 1 - Double(step + 1) / Double(steps + 1), space: .screen, id: id)
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

    /// Marks the criminal in the scene: while it is only announced, a pulsing wedge on the
    /// island's edge, facing the arm it will come from, so the warning reads without pulling
    /// the eye off the middle of the ring (ROADMAP.md M11); then a countdown ring around the
    /// pickup itself, which by then is on screen and worth looking at directly.
    static func addChase(world: World, alpha: Double, to list: inout RenderList) {
        let config = world.config
        var id = RenderID.hud + 500
        switch world.criminal.phase {
        case let .warning(arm, _):
            let pulse = (world.time * 1.6).truncatingRemainder(dividingBy: 1)
            let radius = world.layout.ringRadius - config.laneWidth / 2 - 14
            let half = 0.35
            list.add(.arc(center: .zero, radius: radius, thickness: 3 + 7 * pulse, startAngle: arm.angle - half, endAngle: arm.angle + half), color: .vehicleCriminal, opacity: 1 - pulse, space: .world, id: id)
            id += 1
            list.add(.arc(center: .zero, radius: radius, thickness: 2.5, startAngle: arm.angle - half, endAngle: arm.angle + half), color: .vehicleCriminal, space: .world, id: id)
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

    /// The money transporter: while it is only announced, a pulsing wedge on the island's
    /// edge, facing the arm it will come from (ROADMAP.md M11, same as `addChase`); then a
    /// countdown ring around the truck that empties as its time runs out, plus the secure
    /// zones as pale arcs on the ring. It circles until its time is up, so no exit is marked.
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
            let radius = world.layout.ringRadius - config.laneWidth / 2 - 14
            let half = 0.35
            list.add(.arc(center: .zero, radius: radius, thickness: 3 + 7 * pulse, startAngle: arm.angle - half, endAngle: arm.angle + half), color: .vehicleCargo, opacity: 1 - pulse, space: .world, id: id)
            id += 1
            list.add(.arc(center: .zero, radius: radius, thickness: 2.5, startAngle: arm.angle - half, endAngle: arm.angle + half), color: .vehicleCargo, space: .world, id: id)
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
            // The secure zone, fore and aft, as a pale arc on the ring. Centred on the truck as
            // it is drawn, and on the ring as it is built (it grows with its arms), so it
            // moves exactly with the truck on every level.
            let ringRadius = world.layout.ringRadius
            for zone in world.secureZones() {
                let center = atan2(pose.position.y, pose.position.x)
                let half = zone.arc / 2 / ringRadius
                list.add(.arc(center: .zero, radius: ringRadius + config.laneWidth / 2 - 3, thickness: 2,
                              startAngle: center - half, endAngle: center + half),
                         color: .vehicleCargo, opacity: 0.35, space: .world, id: id)
                id += 1
            }
        case .idle, .leaving, .seized:
            break
        }
    }

    /// Perfect Input and Near Miss (M6): a ring around the car that opens and fades within
    /// a fraction of a second. The car's movement stays the reward; the ring only confirms it.
    static func addPrecisionRing(_ popup: Popup, reduceMotion: Bool, to list: inout RenderList) {
        let isPerfect = popup.kind == .perfect
        let duration = isPerfect ? 0.45 : 0.3
        guard popup.age < duration else { return }
        let x = popup.age / duration
        let radius = reduceMotion ? 16 : 9 + (isPerfect ? 16 : 9) * Ease.outCubic(x)
        let opacity = (isPerfect ? 0.9 : 0.4) * (1 - x)
        list.add(
            .arc(center: popup.position, radius: radius, thickness: isPerfect ? 2.5 : 1.5, startAngle: 0, endAngle: 2 * .pi),
            color: isPerfect ? .accent : .muted, opacity: opacity, space: .world, id: RenderID.popups + popup.serial % 1_000
        )
    }

    /// A module paying or towing: a ring that opens and four sparks flying out, half a second.
    static func addModulePulse(_ popup: Popup, color: ColorToken, reduceMotion: Bool, to list: inout RenderList) {
        let duration = 0.5
        guard popup.age < duration else { return }
        let x = popup.age / duration
        let fade = 1 - x
        let base = RenderID.popups + (popup.serial % 1_000)
        list.add(.arc(center: popup.position, radius: reduceMotion ? 12 : 6 + 14 * Ease.outCubic(x), thickness: 2, startAngle: 0, endAngle: Angle.tau),
                 color: color, opacity: 0.85 * fade, space: .world, id: base)
        guard !reduceMotion else { return }
        for index in 0..<4 {
            let angle = Double(index) * .pi / 2 + .pi / 4 + Double(popup.serial % 7) * 0.3
            let from = popup.position + Vec2(angle: angle) * (5 + 14 * Ease.outCubic(x))
            let to = from + Vec2(angle: angle) * 4 * fade
            list.add(.line(from: from, to: to, thickness: 1.5), color: color, opacity: fade, space: .world, id: RenderID.moduleSparks + (popup.serial % 1_000) * 4 + index)
        }
    }

    /// The ring glow (IDEA.md): a soft light along the island's edge that grows a little
    /// with the combo tier and more in the Flow State. `flow` runs 0…1, smoothed by the session.
    static func addFlowGlow(world: World, flow: Double, to list: inout RenderList) {
        let config = world.config
        let tiers = min(config.comboThresholds.count, config.comboMultipliers.count)
        let tier = Double(Scoring.tier(combo: world.score.combo, config: config)) / Double(max(1, tiers))
        let glow = min(1, 0.3 * tier + 0.7 * flow)
        guard glow > 0.01 else { return }
        let radius = world.layout.ringRadius - config.laneWidth / 2 - 3
        list.add(.arc(center: .zero, radius: radius, thickness: 12, startAngle: 0, endAngle: 2 * .pi),
                 color: .accent, opacity: 0.12 * glow, space: .world, id: RenderID.flowGlow)
        list.add(.arc(center: .zero, radius: radius, thickness: 3, startAngle: 0, endAngle: 2 * .pi),
                 color: .accent, opacity: 0.45 * glow, space: .world, id: RenderID.flowGlow + 1)
    }

    static func addPopups(_ popups: [Popup], format: TextFormat, reduceMotion: Bool, to list: inout RenderList) {
        let camera = list.camera
        // Popups born at the same spot stack instead of printing over each other: each one
        // steps up above those already standing there (older ones keep their place).
        var placed: [(at: Vec2, height: Double)] = []
        for popup in popups {
            let enter = Ease.outCubic(popup.age / Popup.enter)
            let exit = Ease.clamp01((popup.age - (Popup.lifetime - Popup.exit)) / Popup.exit)
            let opacity = min(enter, 1 - exit)
            let scale = reduceMotion ? 1 : 0.9 + 0.1 * enter
            let rise = reduceMotion ? 0 : 10 * Ease.outCubic(popup.age / Popup.lifetime)
            let text: String
            let color: ColorToken
            var size = Metrics.popupSize
            switch popup.kind {
            case .nearMiss, .perfect:
                addPrecisionRing(popup, reduceMotion: reduceMotion, to: &list)
                continue
            case let .modulePulse(color):
                addModulePulse(popup, color: color, reduceMotion: reduceMotion, to: &list)
                continue
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
                size = Metrics.popupSize * 0.7
            case let .cost(amount):
                text = "−" + Strings.money(format.number(amount))
                color = .destructive
            case .covered:
                text = Strings.HUD.covered
                color = .muted
            }
            var at = camera.toScreen(popup.position) + Vec2(0, -30)
            let height = size + 4
            while let below = placed.first(where: { abs($0.at.x - at.x) < 56 && abs($0.at.y - at.y) < ($0.height + height) / 2 }) {
                at.y = below.at.y - (below.height + height) / 2
            }
            placed.append((at, height))
            list.add(
                .text(text, position: at + Vec2(0, -rise), size: size * scale, alignment: .center, weight: .bold),
                color: color, opacity: opacity, space: .screen, id: RenderID.popups + popup.serial % 1_000
            )
        }
    }
}

/// The Game tab between shifts: which level comes next, how many cars it has, and that one
/// tap starts it. There is no start menu (FOUNDATION.md 3); the shift is already flowing
/// behind it.
enum ReadyBanner {
    /// What the Daily Shift's banner and its splash show (Leo, 25.09.2026).
    struct DailyCard {
        var event: CityEvent?
        var streak: Int
        var next: (days: Int, item: String, left: Int)?
        /// Seconds since the splash appeared; nil once it is gone.
        var splash: Double?
    }

    /// How long the splash stays before it rises into the banner's title.
    static let splashDuration = 2.4

    static func add(level: Int, cars: Int, duty: Duty, dutyPay: Double, status: String, conditions: String? = nil, daily: DailyCard? = nil, prompt: String = Strings.Ready.tapToStart, time: Double, reduceMotion: Bool, showsKeys: Bool, to list: inout RenderList) {
        let width = list.camera.viewport.x
        var id = RenderID.hud
        HUD.addBand(height: Metrics.resultBand, to: &list, id: &id)
        func text(_ string: String, _ position: Vec2, size: Double, weight: FontWeight = .bold, color: ColorToken, opacity: Double = 1) {
            list.add(.text(string, position: position, size: size, alignment: .center, weight: weight), color: color, opacity: opacity, space: .screen, id: id)
            id += 1
        }
        if let daily {
            // The Daily Shift says so in the title; the level moves into the line below.
            text(Strings.Daily.title, Vec2(width / 2, 36), size: 24, color: .hazard)
            text(Strings.Daily.levelLine(level: level, cars: cars), Vec2(width / 2, 72), size: 18, color: .primary)
            text(Strings.Ready.duty(duty, pay: dutyPay), Vec2(width / 2, 100), size: 14, color: duty == .highAlert ? .destructive : .muted)
            text(Strings.Daily.streakLine(daily.streak), Vec2(width / 2, 124), size: 13, weight: .regular, color: .muted)
        } else {
            text(Strings.HUD.level(level), Vec2(width / 2, 36), size: 24, color: .accent)
            text(Strings.HUD.cars(cars), Vec2(width / 2, 72), size: 20, color: .primary)
            text(Strings.Ready.duty(duty, pay: dutyPay), Vec2(width / 2, 100), size: 14, color: duty == .highAlert ? .destructive : .muted)
            text(status, Vec2(width / 2, 124), size: 13, weight: .regular, color: .muted)
        }
        // The prompt breathes gently, so the waiting screen is alive; still with Reduce Motion.
        let island = list.camera.toScreen(.zero)
        let breath = reduceMotion ? 1 : 0.7 + 0.3 * (0.5 + 0.5 * cos(time * 2.4))
        text(prompt, island, size: 17, color: .primary, opacity: breath)
        // Weather and the city's event are announced before the shift (M8): anticipation.
        if let conditions {
            text(conditions, island - Vec2(0, 28), size: 14, color: .hazard)
        }
        if showsKeys {
            text(Strings.Ready.keys, island + Vec2(0, 28), size: 12, weight: .regular, color: .muted)
        }
        if let daily, let age = daily.splash {
            addSplash(daily, age: age, reduceMotion: reduceMotion, id: &id, to: &list)
        }
    }

    /// "DAILY SHIFT" as a card over the scene: it springs in like the chest, holds, then
    /// rises into the banner's title and fades. A tap starts the shift as always.
    static func addSplash(_ daily: DailyCard, age: Double, reduceMotion: Bool, id: inout Int, to list: inout RenderList) {
        let viewport = list.camera.viewport
        let leave = Ease.clamp01((age - (splashDuration - 0.45)) / 0.45)
        let alpha = Ease.outCubic(age / 0.25) * (1 - Ease.outCubic(leave))
        guard alpha > 0.001 else { return }
        func add(_ primitive: Primitive, _ color: ColorToken, _ opacity: Double = 1) {
            list.add(primitive, color: color, opacity: opacity * alpha, space: .screen, id: id)
            id += 1
        }
        add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), .background, 0.7)
        let pop = reduceMotion ? 1 : Ease.spring(age / 0.5)
        let center = viewport / 2 + Vec2(0, reduceMotion ? 0 : -70 * Ease.inCubic(leave) - 20)
        let size = Vec2(min(viewport.x - 40, 340), 176) * (0.85 + 0.15 * pop)
        add(.roundedRect(center: center, size: size + Vec2(6, 6), cornerRadius: 25, rotation: 0), .hazard, 0.35)
        add(.roundedRect(center: center, size: size, cornerRadius: 22, rotation: 0), .surface)
        func line(_ string: String, _ dy: Double, size: Double, weight: FontWeight = .regular, color: ColorToken) {
            add(.text(string, position: center + Vec2(0, dy), size: size, alignment: .center, weight: weight), color)
        }
        line(Strings.Daily.title, -48, size: 30 * (0.8 + 0.2 * pop), weight: .bold, color: .hazard)
        if let event = daily.event {
            line(Strings.Daily.splashLine(event: event), -8, size: 14, color: .primary)
        }
        line(Strings.Daily.streakLine(daily.streak), 20, size: 13, color: .muted)
        if let next = daily.next {
            line(Strings.Daily.nextMilestone(left: next.left, item: next.item), 46, size: 12, weight: .bold, color: .accent)
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
    /// The shift's money counts up after this long, over this long, then lands.
    static let countDelay = 0.35
    static let countDuration = 1.2

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

        // The money of the shift counts up from 0 and lands with a small bump (Leo, 25.09.2026).
        if result.money > 0 {
            let x = reduceMotion ? 1 : Ease.clamp01((age - countDelay) / countDuration)
            let shown = Int((Double(result.money) * Ease.outCubic(x)).rounded())
            let landed = (age - countDelay - countDuration) / 0.35
            let size = reduceMotion || landed < 0 ? 26 : 26 * HUD.Pops.land(landed, amount: 0.2)
            Icons.moneyTag("+" + format.number(shown), at: list.camera.toScreen(.zero) - Vec2(0, 64), size: size, alignment: .center, color: .primary, opacity: enter, id: &id, to: &list)
        }

        // The prompt appears once taps count, in the middle of the island.
        let prompt = Ease.outCubic((age - inputLock) / Self.enter)
        guard prompt > 0 else { return }
        let island = list.camera.toScreen(.zero)
        let next = result.outcome == .completed ? Strings.Result.nextLevel(summary.level + 1) : Strings.Result.retryLevel(summary.level)
        text(next, island, size: 17, color: .primary, opacity: prompt)
        // From level 20 on mistakes cost money (M7): the loss, or that insurance paid it.
        if result.costs > 0 {
            text(Strings.Result.loss(format.number(result.costs), escaped: result.outcome == .escaped), island - Vec2(0, 28), size: 14, color: .destructive, opacity: prompt)
        } else if result.covered > 0 {
            text(Strings.Result.covered(format.number(result.covered)), island - Vec2(0, 28), size: 14, color: .muted, opacity: prompt)
        }
        text(Strings.Result.stats(combo: format.number(result.bestCombo), tightFits: format.number(result.tightFits), busted: result.takedowns, transporters: result.transporters, money: nil, time: format.seconds(result.time)), island + Vec2(0, 28), size: 13, weight: .regular, color: .muted, opacity: prompt)
        if showsKeys {
            text(Strings.Result.keys, island + Vec2(0, 48), size: 12, weight: .regular, color: .muted, opacity: prompt)
        }
    }
}
