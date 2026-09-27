import Foundation
import GameCore

/// Explosions (Leo, 27.09.2026: "hochwertig, und das Spiel soll sehr doll shaken"). The
/// blast itself is physics in `GameCore` (`World.explode`); this draws it and shakes the
/// screen:
///
/// - a white flash over the whole screen, then a fireball of billows that burn from a
///   yellow-white core through orange and deep red into black smoke, rising with the wind,
/// - a shock ring racing out over the road and a slower ring of dust behind it,
/// - burning debris flying out on glowing trails, torn metal tumbling over the asphalt,
/// - thick smoke plumes that drift off below the traffic,
/// - a screen shake as trauma (strong, rough, then settling) and a zoom punch.
///
/// Reduce Motion keeps the fireball and the smoke as fades; nothing flies and nothing shakes.
struct ExplosionEffects {
    struct Blast {
        var serial: Int
        var kind: ExplosionKind
        var position: Vec2
        var age = 0.0
        /// 1 for a tanker, bigger for the bomb.
        var scale: Double
        var billows: [Billow]
    }

    /// One ball of the fireball: where it heads, when it starts and how big it gets.
    struct Billow {
        var direction: Vec2
        var reach: Double
        var delay: Double
        var radius: Double
        var life: Double
    }

    struct Particle {
        enum Kind {
            /// Burning debris on a glowing trail.
            case ember
            /// Torn metal, tumbling and scraping to a stop.
            case chunk
            /// Thick smoke drifting off, below the traffic.
            case plume(dark: Bool)
        }

        var serial: Int
        var kind: Kind
        var position: Vec2
        var velocity: Vec2
        var rotation = 0.0
        var spin = 0.0
        var size: Double
        var age = 0.0
        var lifetime: Double
    }

    static let tankerLifetime = 1.3
    static let bombLifetime = 2.2
    /// Shake at full trauma, in points; trauma² shapes it, so small blasts stay small.
    static let maxShake = 44.0

    private(set) var blasts: [Blast] = []
    private(set) var particles: [Particle] = []
    /// 0…1.2: how hard the screen shakes right now. It decays by itself.
    private(set) var trauma = 0.0
    private var traumaDecay = 1.0
    private var shakeClock = 0.0
    /// Zoom punch: the picture jumps in a touch with the blast and eases back.
    private(set) var punch = 0.0
    /// The white flash over the whole screen.
    private(set) var flash = 0.0
    private var rng: SeededRandom
    private var serial = 0

    init(seed: UInt64) {
        rng = SeededRandom(seed: seed ^ 0x5EED_B1A5_7E0F_F1AE)
    }

    var isEmpty: Bool { blasts.isEmpty && particles.isEmpty }

    /// Offset of the whole picture, in points.
    var shakeOffset: Vec2 {
        guard trauma > 0.001 else { return .zero }
        let t = shakeClock
        let x = sin(t * 47) * 0.55 + sin(t * 83 + 1.3) * 0.3 + sin(t * 131 + 2.1) * 0.15
        let y = cos(t * 53 + 0.7) * 0.55 + cos(t * 89 + 2.4) * 0.3 + cos(t * 139 + 0.2) * 0.15
        return Vec2(x, y) * (Self.maxShake * trauma * trauma)
    }

    // MARK: - Spawning

    mutating func spawn(_ report: ExplosionReport, reduceMotion: Bool) {
        let bomb = report.kind == .bomb
        let scale = bomb ? 2.6 : 1
        let count = bomb ? 34 : 18
        var billows: [Billow] = []
        for index in 0..<count {
            // The first few stay in the middle: the hot heart of the ball.
            let core = index < 4
            billows.append(Billow(
                direction: Vec2(angle: rng.unit() * Angle.tau),
                reach: (core ? rng.double(in: 0...8) : rng.double(in: 14...40)) * scale,
                delay: core ? 0 : rng.double(in: 0...0.14),
                radius: (core ? rng.double(in: 16...22) : rng.double(in: 9...17)) * scale.squareRoot() * (bomb ? 1.4 : 1),
                life: (bomb ? Self.bombLifetime : Self.tankerLifetime) * rng.double(in: 0.7...1)
            ))
        }
        serial += 1
        blasts.append(Blast(serial: serial, kind: report.kind, position: report.point, scale: scale, billows: billows))
        flash = max(flash, bomb ? 1 : 0.55)

        // Smoke that stays behind, below the cars.
        for _ in 0..<(bomb ? 36 : 14) {
            let direction = Vec2(angle: rng.unit() * Angle.tau)
            particles.append(Particle(
                serial: next(),
                kind: .plume(dark: rng.unit() < 0.55),
                position: report.point + direction * rng.double(in: 0...18) * scale,
                velocity: reduceMotion ? .zero : direction * rng.double(in: 10...45) * scale.squareRoot() + CrashEffects.wind,
                size: rng.double(in: 9...15) * scale.squareRoot(),
                lifetime: rng.double(in: 2.4...4.2) * (bomb ? 1.3 : 1)
            ))
        }
        guard !reduceMotion else { return }
        trauma = min(1.2, trauma + (bomb ? 1.1 : 0.8))
        traumaDecay = bomb ? 0.5 : 0.85
        punch = max(punch, bomb ? 0.11 : 0.055)
        for _ in 0..<(bomb ? 80 : 30) {
            let direction = Vec2(angle: rng.unit() * Angle.tau)
            particles.append(Particle(
                serial: next(),
                kind: .ember,
                position: report.point + direction * rng.double(in: 2...10),
                velocity: direction * rng.double(in: 110...360) * scale.squareRoot(),
                size: rng.double(in: 1...2.2),
                lifetime: rng.double(in: 0.6...1.5)
            ))
        }
        for _ in 0..<(bomb ? 30 : 12) {
            let direction = Vec2(angle: rng.unit() * Angle.tau)
            particles.append(Particle(
                serial: next(),
                kind: .chunk,
                position: report.point + direction * 4,
                velocity: direction * rng.double(in: 70...230) * scale.squareRoot(),
                rotation: rng.unit() * Angle.tau,
                spin: rng.double(in: 6...18) * (rng.unit() < 0.5 ? -1 : 1),
                size: rng.double(in: 2.5...5.5),
                lifetime: rng.double(in: 1.6...2.4)
            ))
        }
    }

    private mutating func next() -> Int {
        serial += 1
        return serial
    }

    // MARK: - Update

    mutating func update(_ dt: Double, gravity: Double) {
        guard dt > 0 else { return }
        shakeClock += dt
        trauma = max(0, trauma - traumaDecay * dt)
        punch *= exp(-dt / 0.22)
        flash *= exp(-dt / 0.09)
        let scrape = CrashEffects.debrisFriction * gravity * dt
        for index in particles.indices {
            var particle = particles[index]
            particle.age += dt
            switch particle.kind {
            case .ember:
                particle.velocity = particle.velocity * exp(-2.2 * dt)
            case .chunk:
                let speed = particle.velocity.length
                particle.velocity = speed > scrape ? particle.velocity * ((speed - scrape) / speed) : .zero
                particle.spin *= speed > scrape ? 1 : 0
            case .plume:
                particle.velocity = particle.velocity * exp(-0.9 * dt) + CrashEffects.wind * (0.9 * dt)
            }
            particle.position += particle.velocity * dt
            particle.rotation += particle.spin * dt
            particles[index] = particle
        }
        particles.removeAll { $0.age >= $0.lifetime }
        for index in blasts.indices {
            blasts[index].age += dt
        }
        blasts.removeAll { $0.age >= ($0.kind == .bomb ? Self.bombLifetime : Self.tankerLifetime) + 0.2 }
    }

    // MARK: - Drawing

    /// Below the moving cars: the glow of the fire on the road and the smoke it leaves.
    func addGround(to list: inout RenderList) {
        for blast in blasts {
            let x = blast.age / 0.6
            guard x < 1 else { continue }
            let glow = 1 - Ease.outCubic(x)
            list.add(.circle(center: blast.position, radius: 70 * blast.scale * (0.6 + 0.4 * Ease.outCubic(x))), color: .fireOuter, opacity: 0.22 * glow, space: .world, id: blastID(blast, 0))
        }
        for particle in particles {
            guard case let .plume(dark) = particle.kind else { continue }
            let x = particle.age / particle.lifetime
            let radius = particle.size * (1 + 2.4 * Ease.outCubic(x))
            let fadeIn = Ease.clamp01(particle.age / 0.25)
            list.add(.circle(center: particle.position, radius: radius), color: dark ? .smokeDark : .smoke,
                     opacity: 0.5 * fadeIn * (1 - Ease.smoothstep(x)), space: .world, id: particleID(particle, 0))
        }
    }

    /// Above the moving cars, short-lived: the fireball, the shock ring, embers and metal.
    func addAir(to list: inout RenderList) {
        for particle in particles {
            let x = particle.age / particle.lifetime
            switch particle.kind {
            case .chunk:
                let opacity = 1 - Ease.clamp01((x - 0.75) / 0.25)
                list.add(.roundedRect(center: particle.position, size: Vec2(particle.size, particle.size * 0.6), cornerRadius: 0.6, rotation: particle.rotation),
                         color: .wreck, opacity: opacity, space: .world, id: particleID(particle, 0))
            case .ember:
                let heat = 1 - x
                let tail = particle.position - particle.velocity * 0.05
                list.add(.line(from: tail, to: particle.position, thickness: particle.size * 1.3), color: .fireOuter, opacity: 0.85 * heat, space: .world, id: particleID(particle, 0))
                list.add(.circle(center: particle.position, radius: particle.size * (0.6 + 0.4 * heat)), color: .fireCore, opacity: heat, space: .world, id: particleID(particle, 1))
            case .plume:
                break
            }
        }
        for blast in blasts {
            addFireball(blast, to: &list)
        }
    }

    private func addFireball(_ blast: Blast, to list: inout RenderList) {
        let t = blast.age
        let s = blast.scale
        // The white-hot moment the tank bursts.
        if t < 0.14 {
            let x = t / 0.14
            list.add(.circle(center: blast.position, radius: 30 * s * (0.4 + 0.6 * Ease.outCubic(x))), color: .spark, opacity: 1 - x * x, space: .world, id: blastID(blast, 1))
        }
        // The shock ring, and the slower ring of dust it kicks up.
        let shock = t / 0.5
        if shock < 1 {
            let ring = Ease.outCubic(shock)
            list.add(.arc(center: blast.position, radius: 12 * s + 150 * s * ring, thickness: 7 * s * (1 - ring) + 1, startAngle: 0, endAngle: Angle.tau),
                     color: .primary, opacity: 0.85 * (1 - ring), space: .world, id: blastID(blast, 2))
        }
        let dust = t / 1.1
        if dust < 1 {
            let ring = Ease.outCubic(dust)
            list.add(.arc(center: blast.position, radius: 10 * s + 110 * s * ring, thickness: 16 * s * (1 - ring) + 2, startAngle: 0, endAngle: Angle.tau),
                     color: .smokeLight, opacity: 0.3 * (1 - ring), space: .world, id: blastID(blast, 3))
        }
        // The billows burn through their colours: core, orange, deep red, then black smoke.
        for (index, billow) in blast.billows.enumerated() {
            let local = t - billow.delay
            guard local > 0, local < billow.life else { continue }
            let x = local / billow.life
            let out = Ease.outCubic(min(local / 0.35, 1))
            let rise = CrashEffects.wind * (local * 1.4) + Vec2(0, 14) * (local * s)
            let center = blast.position + billow.direction * (billow.reach * out) + rise
            let radius = billow.radius * (0.35 + 0.85 * Ease.outCubic(min(local / 0.3, 1))) * (1 + 0.45 * x)
            let (outer, inner): (ColorToken, ColorToken) = switch x {
            case ..<0.2: (.fireOuter, .fireCore)
            case ..<0.42: (.fireDeep, .fireOuter)
            case ..<0.62: (.smokeDark, .fireDeep)
            default: (.smokeDark, .smoke)
            }
            let fade = 1 - Ease.smoothstep((x - 0.55) / 0.45)
            list.add(.circle(center: center, radius: radius), color: outer, opacity: 0.95 * fade, space: .world, id: blastID(blast, 10 + index * 2))
            // A hotter heart, a little up-wind, so each billow looks lit from inside.
            let heart = 0.55 - 0.25 * x
            list.add(.circle(center: center - CrashEffects.wind.normalized * (radius * 0.12), radius: radius * heart), color: inner, opacity: 0.9 * fade, space: .world, id: blastID(blast, 11 + index * 2))
        }
    }

    /// The flash over the whole screen, in screen space.
    func addFlash(viewport: Vec2, to list: inout RenderList) {
        guard flash > 0.01 else { return }
        list.add(.roundedRect(center: viewport / 2, size: viewport + Vec2(40, 40), cornerRadius: 0, rotation: 0), color: .spark, opacity: 0.7 * flash, space: .screen, id: RenderID.explosions + 99_000)
    }

    private func blastID(_ blast: Blast, _ part: Int) -> Int {
        RenderID.explosions + (blast.serial % 40) * 1_000 + part
    }

    private func particleID(_ particle: Particle, _ part: Int) -> Int {
        RenderID.explosions + 40_000 + (particle.serial % 25_000) * 2 + part
    }
}

/// The map suffers (Leo, 27.09.2026): a blast leaves the ground burnt, and trees and houses
/// around it catch fire, burn for a while and stay charred. The fire spreads out from the
/// blast. Pure drawing, from the blasts and the time; the bomb's smoke curtain wipes it all
/// away with the level.
struct MapScars {
    struct Scar {
        var serial: Int
        var position: Vec2
        var kind: ExplosionKind
        /// Session time of the blast.
        var time: Double

        /// The burnt patch on the ground.
        var scorch: Double { kind == .bomb ? 160 : 38 }
        /// How far trees and houses catch fire.
        var reach: Double { kind == .bomb ? 2_000 : 170 }
    }

    /// Charred trees and houses fade back after this long; the burnt ground and the smoke
    /// on it are gone much sooner (`groundFade`), so nothing dark stays on the road.
    static let memory = 30.0
    static let groundFade = (after: 3.0, over: 4.0)
    static let fireSpread = 380.0

    private(set) var scars: [Scar] = []
    private var serial = 0

    var isEmpty: Bool { scars.isEmpty }

    mutating func add(_ report: ExplosionReport, now: Double) {
        serial += 1
        scars.append(Scar(serial: serial, position: report.point, kind: report.kind, time: now))
        // Old scars go first; a city only has so much to burn.
        if scars.count > 10 { scars.removeFirst(scars.count - 10) }
    }

    mutating func forget(before now: Double) {
        scars.removeAll { now - $0.time > Self.memory }
    }

    /// How a tree or a house at `point` is: burning (0…1) and charred (0…1).
    func damage(at point: Vec2, now: Double) -> (fire: Double, char: Double) {
        var fire = 0.0
        var char = 0.0
        for scar in scars {
            let distance = point.distance(to: scar.position)
            guard distance < scar.reach else { continue }
            let severity = scar.kind == .bomb ? max(0.55, 1 - distance / 600) : 1 - distance / scar.reach
            let age = now - scar.time - distance / Self.fireSpread
            guard age > 0 else { continue }
            let burns = 4 + 8 * severity
            let rising = Ease.clamp01(age / 0.3)
            let dying = 1 - Ease.clamp01((age - burns) / 2.5)
            fire = max(fire, rising * dying * (0.45 + 0.55 * severity))
            let forgetting = 1 - Ease.clamp01((now - scar.time - (Self.memory - 10)) / 10)
            char = max(char, Ease.clamp01(age / 1.5) * (0.45 + 0.55 * severity) * forgetting)
        }
        return (fire, char)
    }

    /// Burnt ground where the blasts were, and small fires on it for the first seconds.
    /// On the road, below the wrecks and the cars.
    func addGround(now: Double, time: Double?, to list: inout RenderList) {
        for scar in scars {
            let age = now - scar.time
            let fade = 1 - Ease.clamp01((age - Self.groundFade.after) / Self.groundFade.over)
            guard fade > 0.005 else { continue }
            let grow = Ease.outCubic(Ease.clamp01(age / 0.4))
            let base = RenderID.scars + 3_000 + (scar.serial % 40) * 24
            for index in 0..<7 {
                let u = WeatherLayer.unitHash(scar.serial * 13 + index, 41)
                let v = WeatherLayer.unitHash(scar.serial * 13 + index, 42)
                let offset = index == 0 ? Vec2.zero : Vec2(angle: u * Angle.tau) * (scar.scorch * 0.55 * v)
                let radius = scar.scorch * (index == 0 ? 0.8 : 0.35 + 0.3 * v) * grow
                list.add(.circle(center: scar.position + offset, radius: radius), color: .scorch, opacity: 0.4 * fade, space: .world, id: base + index)
            }
            // Burning patches on the asphalt, flickering down over a few seconds.
            let burning = 1 - Ease.clamp01((age - 3) / 3)
            guard burning > 0.02 else { continue }
            for index in 0..<5 {
                let u = WeatherLayer.unitHash(scar.serial * 7 + index, 43)
                let at = scar.position + Vec2(angle: u * Angle.tau) * (scar.scorch * 0.6)
                let flicker = time.map { 0.7 + 0.3 * sin($0 * 19 + Double(index) * 2.3) } ?? 1
                let radius = (scar.kind == .bomb ? 10 : 5) * flicker * burning
                list.add(.circle(center: at, radius: radius), color: .fireOuter, opacity: 0.85 * burning, space: .world, id: base + 8 + index * 2)
                list.add(.circle(center: at, radius: radius * 0.5), color: .fireCore, opacity: burning, space: .world, id: base + 9 + index * 2)
            }
        }
    }

    /// Fire and char on a tree (`CityLayer`): the crown goes black, flames lick up from it and
    /// smoke drifts off with the wind.
    func addTree(at center: Vec2, size: Double, index: Int, now: Double, time: Double?, to list: inout RenderList) {
        let (fire, char) = damage(at: center, now: now)
        guard fire > 0.01 || char > 0.01 else { return }
        let id = RenderID.scars + (index % 300) * 10
        if char > 0.01 {
            list.add(.circle(center: center, radius: size * 1.05), color: .scorch, opacity: 0.8 * char, space: .world, id: id)
        }
        guard fire > 0.01 else { return }
        addFlames(at: center, size: size, fire: fire, seed: index, time: time, id: id + 1, to: &list)
    }

    /// Fire and char on a house: its roof blackens, flames come out of it.
    func addHouse(at center: Vec2, size: Vec2, rotation: Double, index: Int, now: Double, time: Double?, to list: inout RenderList) {
        let (fire, char) = damage(at: center, now: now)
        guard fire > 0.01 || char > 0.01 else { return }
        let id = RenderID.scars + (index % 300) * 10
        if char > 0.01 {
            list.add(.roundedRect(center: center, size: size, cornerRadius: 3, rotation: rotation), color: .scorch, opacity: 0.6 * char, space: .world, id: id)
        }
        guard fire > 0.01 else { return }
        addFlames(at: center, size: min(size.x, size.y) * 0.4, fire: fire, seed: index, time: time, id: id + 1, to: &list)
    }

    /// Three tongues of flame and two puffs of smoke; `id` and the next seven are used.
    private func addFlames(at center: Vec2, size: Double, fire: Double, seed: Int, time: Double?, id: Int, to list: inout RenderList) {
        let clock = time ?? 0
        for tongue in 0..<3 {
            let k = Double(tongue)
            let flicker = time == nil ? 1 : 0.72 + 0.28 * sin(clock * (17 + 3 * k) + Double(seed) * 1.7 + k * 2.1)
            let at = center + Vec2(angle: k * 2.1 + Double(seed)) * (size * 0.35) + CrashEffects.wind.normalized * (size * 0.25 * flicker)
            let radius = size * (0.6 - 0.12 * k) * fire * flicker
            list.add(.circle(center: at, radius: radius), color: .fireOuter, opacity: 0.9, space: .world, id: id + tongue * 2)
            list.add(.circle(center: at, radius: radius * 0.48), color: .fireCore, opacity: 1, space: .world, id: id + tongue * 2 + 1)
        }
        guard let time else { return }
        for puff in 0..<2 {
            let phase = (time * 0.45 + WeatherLayer.unitHash(seed, 44) + Double(puff) * 0.5).truncatingRemainder(dividingBy: 1)
            let at = center + CrashEffects.wind * (phase * 3.2) + Vec2(0, size * 0.6)
            list.add(.circle(center: at, radius: size * (0.6 + 1.8 * phase)), color: .smokeDark, opacity: 0.4 * (1 - phase) * fire, space: .world, id: id + 6 + puff)
        }
    }
}

/// The bomb's smoke is the way to the next level (Leo, 27.09.2026): it billows out of the
/// blast until it fills the screen, the road is swapped for a fresh one behind it
/// (`GameSession`: `swapAt`), and as it drifts apart and thins out, everything is back to
/// normal, the next shift waiting. Reduce Motion keeps only the fade.
struct SmokeCurtain {
    var center: Vec2
    var age = 0.0

    /// Fully covered after this…
    static let cover = 0.95
    /// …the level is swapped behind it…
    static let swapAt = 1.5
    /// …and it starts to clear, gone after `duration`.
    static let clear = 1.8
    static let duration = 4.2
    static let billows = 42

    var isDone: Bool { age >= Self.duration }

    /// 0…1: how much of the picture the smoke hides.
    var density: Double {
        if age < Self.clear { return Ease.outCubic(Ease.clamp01((age - 0.2) / (Self.cover - 0.2))) }
        return 1 - Ease.inOutSine(Ease.clamp01((age - Self.clear) / (Self.duration - Self.clear)))
    }

    func add(viewport: Vec2, reduceMotion: Bool, to list: inout RenderList) {
        // The flat veil underneath makes sure nothing shows through while the level changes;
        // it goes sooner than the billows, so the smoke thins out in wisps.
        let veil = age < Self.clear
            ? Ease.smoothstep(Ease.clamp01((age - 0.35) / (Self.cover - 0.35)))
            : 1 - Ease.smoothstep(Ease.clamp01((age - Self.clear) / 1.1))
        if veil > 0.005 {
            list.add(.roundedRect(center: viewport / 2, size: viewport + Vec2(80, 80), cornerRadius: 0, rotation: 0),
                     color: .smoke, opacity: veil, space: .screen, id: RenderID.curtain)
        }
        guard !reduceMotion else { return }
        // Billows: out of the blast, swirling, filling the screen; then apart and away.
        let reach = max(viewport.x, viewport.y) / max(list.camera.scale, 0.01)
        for index in 0..<Self.billows {
            let u = WeatherLayer.unitHash(index, 51)
            let v = WeatherLayer.unitHash(index, 52)
            let w = WeatherLayer.unitHash(index, 53)
            let spread = Ease.outCubic(Ease.clamp01(age / 1.2))
            let drift = max(0, age - Self.clear)
            let angle = u * Angle.tau + 0.25 * age * (v - 0.5)
            let distance = reach * (0.08 + 0.62 * v) * spread + drift * (40 + 90 * v)
            let at = center + Vec2(angle: angle) * distance + CrashEffects.wind * (age * 3)
            let radius = reach * (0.14 + 0.16 * w) * (0.3 + 0.7 * spread) * (1 + 0.25 * drift)
            // Each billow thins out on its own beat.
            let start = Self.clear + 0.1 + 1.4 * w
            let fade = age < Self.clear ? Ease.clamp01(age / 0.25) : 1 - Ease.smoothstep(Ease.clamp01((age - start) / 1.2))
            guard fade > 0.005 else { continue }
            let color: ColorToken = index % 3 == 0 ? .smokeDark : .smoke
            let id = RenderID.curtain + 1 + index * 2
            list.add(.circle(center: at, radius: radius), color: color, opacity: 0.92 * fade, space: .world, id: id)
            // A lighter top, a little towards the light: the smoke has volume.
            list.add(.circle(center: at + Vec2(-0.18, 0.22) * radius, radius: radius * 0.62), color: .smokeLight, opacity: 0.35 * fade, space: .world, id: id + 1)
        }
    }
}
