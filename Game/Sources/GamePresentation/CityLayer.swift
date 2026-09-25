import Foundation
import GameCore

/// City Evolution (IDEA.md; ROADMAP.md, M9): around the roundabout the city grows with the
/// player's progress — more blocks and trees with every level, every arm and every module.
/// Pure drawing, computed from the shift's config, the same on every device. Kept flat and
/// quiet below the road, so it never competes with the traffic.
/// What each skin looks like (LOOT.md): a paint, and for some car skins a racing stripe, a
/// two-tone roof or a finish.
public enum Skins {
    /// The paint of a car skin or the tint of a map skin; nil for anything else.
    public static func color(_ id: String?) -> ColorToken? {
        switch id {
        case "racingRed", "redStripe": .skinRacingRed
        case "midnight": .skinMidnight
        case "mint": .skinMint
        case "pearl", "royal": .skinPearl
        case "olive": .skinOlive
        case "coral": .skinCoral
        case "sunset", "tiger": .skinSunset
        case "ice": .skinIce
        case "rose": .skinRose
        case "lime": .skinLime
        case "copper": .skinCopper
        case "carbon", "blackGold": .skinCarbon
        case "nightMint": .vehicleCarGraphite
        case "gold": .skinGold
        case "lagoon": .skinLagoon
        case "pearlShine": .skinPearl
        case "chrome": .skinChrome
        case "starlight": .skinMidnight
        case "diamond": .skinIce
        case "holo": .skinHolo
        case "streakBronze": .skinBronze
        case "streakSilver": .skinSilver
        case "streakGold": .skinGold
        case "frost": .skinFrost
        case "blossom": .skinBlossom
        case "sunburst": .skinSunburst
        case "pumpkin": .skinPumpkin
        case "lemon": .skinLemon
        case "plum": .skinPlum
        case "fern": .skinFern
        case "latte": .skinLatte
        case "cherry": .skinCherry
        case "mocha": .skinMocha
        case "teal": .skinTeal
        case "sky": .skinSky
        case "panda", "koi": .skinPearl
        case "hanami": .skinHanami
        case "volcano": .skinCarbon
        case "ocean": .skinOcean
        case "obsidian": .skinObsidian
        case "ruby": .skinRuby
        case "dusk": .mapDusk
        case "sand": .mapSand
        case "neon": .mapNeon
        case "forest": .mapForest
        case "autumn": .mapAutumn
        case "sakura": .mapSakura
        case "aurora": .mapAurora
        case "ember": .mapEmber
        case "meadow": .mapMeadow
        case "tropic": .mapTropic
        case "snowfall": .mapSnow
        case "cosmos": .mapCosmos
        default: nil
        }
    }

    /// The racing stripe of a car skin, if it has one.
    public static func stripe(_ id: String?) -> ColorToken? {
        switch id {
        case "redStripe": .primary
        case "blackGold", "royal", "lagoon": .skinGold
        case "nightMint": .skinMint
        case "tiger", "pumpkin": .vehicleTire
        case "holo": .skinMint
        case "streakGold": .mapForest
        case "blossom": .primary
        case "sunburst": .fireOuter
        case "volcano": .mapEmber
        case "ocean": .primary
        case "koi", "ruby": .skinGold
        default: nil
        }
    }

    /// The roof of a two-tone skin: a second colour from windscreen to rear window.
    public static func roof(_ id: String?) -> ColorToken? {
        switch id {
        case "cherry", "sky", "hanami": .skinPearl
        case "mocha": .skinCream
        case "panda": .skinCarbon
        case "koi": .skinKoi
        default: nil
        }
    }

    /// A special surface: a light sweep that runs over the car, sparkles, or both.
    public enum Finish: Sendable, Equatable {
        case shiny
        case glitter
        case shinyGlitter

        var isShiny: Bool { self != .glitter }
        var glitters: Bool { self != .shiny }
    }

    public static func finish(_ id: String?) -> Finish? {
        switch id {
        case "pearlShine", "chrome", "holo", "streakSilver", "ocean", "koi": .shiny
        case "starlight", "frost", "hanami", "volcano", "ruby": .glitter
        case "diamond", "streakGold", "obsidian": .shinyGlitter
        default: nil
        }
    }

    /// The look of one car: its paint, stripe, two-tone roof and finish.
    public struct Look: Sendable, Equatable {
        public var paint: ColorToken?
        public var stripe: ColorToken?
        public var roof: ColorToken?
        public var finish: Finish?
    }

    /// Every normal car on the road wears one of the skins that are on, picked by its id,
    /// so the traffic is a mix of them (up to five).
    public static func look(forVehicle id: Int, skins: [String]) -> Look? {
        guard !skins.isEmpty else { return nil }
        var hash = UInt64(bitPattern: Int64(id)) &* 0xD6E8_FEB8_6659_FD93
        hash ^= hash >> 32
        let skin = skins[Int(hash % UInt64(skins.count))]
        return Look(paint: color(skin), stripe: stripe(skin), roof: roof(skin), finish: finish(skin))
    }
}

enum CityLayer {
    /// A map skin (M10): the centre island takes on its colour, faintly.
    static func addMapSkin(_ skin: ColorToken?, world: World, to list: inout RenderList) {
        guard let skin else { return }
        let radius = world.layout.ringRadius - world.layout.laneWidth / 2
        list.add(.circle(center: .zero, radius: radius), color: skin, opacity: 0.16, space: .world, id: RenderID.city + 200)
        list.add(.arc(center: .zero, radius: radius - 6, thickness: 2, startAngle: 0, endAngle: Angle.tau), color: skin, opacity: 0.5, space: .world, id: RenderID.city + 201)
    }

    /// The frame of the most valuable album completed (Leo: Sammelalben): a ring of its
    /// colour around the roundabout, with a soft glow.
    static func addFrame(_ album: Album?, world: World, to list: inout RenderList) {
        guard let album else { return }
        let radius = world.layout.ringRadius + world.layout.laneWidth / 2 + 5
        let color = frameColor(album)
        list.add(.arc(center: .zero, radius: radius + 3, thickness: 8, startAngle: 0, endAngle: Angle.tau), color: color, opacity: 0.12, space: .world, id: RenderID.city + 210)
        list.add(.arc(center: .zero, radius: radius, thickness: 2.5, startAngle: 0, endAngle: Angle.tau), color: color, opacity: 0.8, space: .world, id: RenderID.city + 211)
    }

    static func frameColor(_ album: Album) -> ColorToken {
        switch album {
        case .maps: .mapAurora
        case .commons: .rarityCommon
        case .rares: .rarityRare
        case .epics: .rarityEpic
        case .legends: .rarityLegendary
        case .seasons: .skinFrost
        case .loyalty: .skinBronze
        }
    }

    /// Everything that counts as progress, as one number.
    static func growth(config: Config) -> Int {
        config.level + 4 * max(0, config.builtArmSlots.count - 4) + 3 * config.modules.count
    }

    /// How many lots are built at this growth: a few from the start, up to a full city.
    static func lots(growth: Int) -> Int {
        min(64, 8 + growth)
    }

    /// - Parameters:
    ///   - time: moves what lives on the map's ground (koi, stars, water); nil stills it.
    ///   - pulse: the city's breathing (`CityPulse`); nil (Reduce Motion) keeps it still.
    static func add(world: World, theme: MapTheme? = nil, time: Double? = nil, pulse: CityPulse? = nil, to list: inout RenderList) {
        MapTheme.addGround(theme, world: world, time: time, to: &list)
        let layout = world.layout
        var plantID = RenderID.mapPlants
        let count = lots(growth: growth(config: world.config))
        let armAngles = layout.arms.map(\.angle)
        var id = RenderID.city
        var placed = 0
        var candidate = 0
        // Candidates in a fixed order; the ones on a road are skipped, so the same lots are
        // always built first and the city only ever adds to itself.
        while placed < count, candidate < count * 4 {
            defer { candidate += 1 }
            let angle = WeatherLayer.unitHash(candidate, 11) * Angle.tau
            let clearOfRoads = armAngles.allSatisfy { abs(Angle.wrap(angle - $0 + .pi, period: Angle.tau) - .pi) > 0.32 }
            guard clearOfRoads else { continue }
            let distance = layout.ringRadius + 70 + WeatherLayer.unitHash(candidate, 12) * 230
            let center = Vec2(angle: angle) * distance
            // A map may keep a place open: Sakura its pond and its cherry avenues.
            guard !MapTheme.keepsClear(theme, center, layout: layout) else { continue }
            let isTree = WeatherLayer.unitHash(candidate, 13) < 0.35
            if isTree {
                // Where a tree stands, the map's own plant grows (`MapTheme.addPlant`), and
                // sways a little in the city's breath.
                let sway = pulse?.sway(candidate) ?? .zero
                MapTheme.addPlant(theme, at: center + sway, size: 7 + 5 * WeatherLayer.unitHash(candidate, 14), index: candidate, id: &plantID, to: &list)
            } else {
                let size = Vec2(26 + 30 * WeatherLayer.unitHash(candidate, 15), 22 + 26 * WeatherLayer.unitHash(candidate, 16))
                list.add(.roundedRect(center: center, size: size, cornerRadius: 3, rotation: angle), color: .surface, opacity: 0.55, space: .world, id: id)
                id += 1
                // A roof edge, a touch lighter: the block reads as a building, not a hole.
                list.add(.roundedRect(center: center, size: size - Vec2(8, 8), cornerRadius: 2, rotation: angle), color: .kerb, opacity: 0.35, space: .world, id: id)
                // Some windows are lit, and glow up and down slowly, each on its own beat.
                if WeatherLayer.unitHash(candidate, 17) < 0.45 {
                    id += 1
                    let glow = pulse?.window(candidate, distance: distance) ?? CityPulse.windowRest
                    let spot = center + Vec2(angle: angle + .pi / 2) * (size.y * 0.18) + Vec2(angle: angle) * (size.x * (WeatherLayer.unitHash(candidate, 18) - 0.5) * 0.4)
                    list.add(.roundedRect(center: spot, size: Vec2(size.x * 0.22, size.y * 0.16), cornerRadius: 1, rotation: angle), color: .hazard, opacity: glow, space: .world, id: id)
                }
            }
            id += 1
            placed += 1
        }
        MapTheme.addAvenues(theme, world: world, id: &plantID, to: &list)
        if let pulse {
            addCloudShadows(pulse, to: &list)
        }
    }

    /// Two cloud shadows drift over the city, faster when it is busy. Soft: a few circles on
    /// top of each other, each barely there. Under the road, so the traffic stays clear.
    static func addCloudShadows(_ pulse: CityPulse, to list: inout RenderList) {
        let span = 1_600.0
        var id = RenderID.city + 230
        for cloud in 0..<2 {
            let direction = Vec2(angle: 0.35 + Double(cloud) * 0.5)
            let across = direction.right * (Double(cloud) * 260 - 130)
            let travel = (pulse.drift + Double(cloud) * span * 0.55).truncatingRemainder(dividingBy: span) - span / 2
            let center = direction * travel + across
            let radius = 150.0 + Double(cloud) * 40
            for ring in 0..<4 {
                let r = radius * (1 - 0.2 * Double(ring))
                list.add(.roundedRect(center: center, size: Vec2(r * 2.2, r * 1.5), cornerRadius: r * 0.75, rotation: 0.35 + Double(cloud) * 0.5),
                         color: .shadow, opacity: 0.05, space: .world, id: id)
                id += 1
            }
        }
    }
}

/// The city's breathing (Leo, 25.09.2026: "Die Stadt sollte atmen"). Not a feature anyone
/// should notice as one: trees sway, windows glow up and down, cloud shadows drift, and all
/// of it a little more when the traffic is dense, more again in rush hour. In the Flow State
/// the windows answer the player's rhythm: every car sent sends a faint wave of light out
/// through the city.
///
/// The session keeps the phases running (`advance`), so a change of pace never makes
/// anything jump.
struct CityPulse: Sendable, Equatable {
    /// 0 a calm city … 1 rush hour in the Flow State.
    var energy = 0.2
    /// Running phases: sway of the trees, glow of the windows, how far the clouds drifted.
    var swayPhase = 0.0
    var glowPhase = 0.0
    var drift = 0.0
    /// Seconds since the last car went in, and how deep in the flow the player was then.
    var sinceBeat = Double.infinity
    var beat = 0.0

    /// A window with no breathing (Reduce Motion): just lit.
    static let windowRest = 0.1
    /// How fast the flow's wave of light runs out through the city (world units a second).
    static let beatSpeed = 420.0

    /// How busy the city should look now: the cars on the road, rush hour, the flow.
    static func energy(world: World, flow: Double) -> Double {
        let moving = world.vehicles.reduce(0) { count, vehicle in
            if case .queued = vehicle.phase { return count }
            return vehicle.isCrashed ? count : count + 1
        }
        let density = min(1, Double(moving) / 12)
        let rush = world.shift.isRushHour ? 0.25 : 0
        return min(1, 0.12 + 0.45 * density + rush + 0.18 * flow)
    }

    /// Eases towards `target` over a couple of seconds and runs the phases on.
    mutating func advance(by delta: Double, target: Double) {
        energy += (target - energy) * min(1, delta / 2.5)
        swayPhase += delta * (0.7 + 1.3 * energy)
        glowPhase += delta * (0.25 + 0.5 * energy)
        drift += delta * (5 + 16 * energy)
        sinceBeat += delta
    }

    /// A car went in; in the flow the city answers it.
    mutating func beat(flow: Double) {
        guard flow > 0.05 else { return }
        sinceBeat = 0
        beat = flow
    }

    /// How far a tree's crown has swayed, in world units.
    func sway(_ index: Int) -> Vec2 {
        let amplitude = 0.35 + 1.1 * energy
        let phase = WeatherLayer.unitHash(index, 19) * Angle.tau
        return Vec2(sin(swayPhase + phase), 0.6 * sin(0.7 * swayPhase + phase * 1.3)) * amplitude
    }

    /// How brightly a window glows: a slow breath of its own, plus the flow's wave passing.
    func window(_ index: Int, distance: Double) -> Double {
        let phase = WeatherLayer.unitHash(index, 20) * Angle.tau
        let breath = 0.5 + 0.5 * sin(glowPhase * Angle.tau / 4 + phase)
        var glow = 0.06 + (0.04 + 0.06 * energy) * breath
        if sinceBeat < 2 {
            let front = sinceBeat * Self.beatSpeed
            let offset = (distance - front) / 45
            glow += 0.22 * beat * exp(-offset * offset) * exp(-sinceBeat * 1.2)
        }
        return glow
    }
}
