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

    /// - Parameter time: moves what lives on the map's ground (koi, stars, water); nil stills it.
    static func add(world: World, theme: MapTheme? = nil, time: Double? = nil, to list: inout RenderList) {
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
                // Where a tree stands, the map's own plant grows (`MapTheme.addPlant`).
                MapTheme.addPlant(theme, at: center, size: 7 + 5 * WeatherLayer.unitHash(candidate, 14), index: candidate, id: &plantID, to: &list)
            } else {
                let size = Vec2(26 + 30 * WeatherLayer.unitHash(candidate, 15), 22 + 26 * WeatherLayer.unitHash(candidate, 16))
                list.add(.roundedRect(center: center, size: size, cornerRadius: 3, rotation: angle), color: .surface, opacity: 0.55, space: .world, id: id)
                id += 1
                // A roof edge, a touch lighter: the block reads as a building, not a hole.
                list.add(.roundedRect(center: center, size: size - Vec2(8, 8), cornerRadius: 2, rotation: angle), color: .kerb, opacity: 0.35, space: .world, id: id)
            }
            id += 1
            placed += 1
        }
        MapTheme.addAvenues(theme, world: world, id: &plantID, to: &list)
    }
}
