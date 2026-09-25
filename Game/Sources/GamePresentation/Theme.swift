import GameCore

/// 8-bit RGBA colour.
public struct ColorRGBA: Sendable, Equatable {
    public var r: UInt8
    public var g: UInt8
    public var b: UInt8
    public var a: UInt8

    public init(r: UInt8, g: UInt8, b: UInt8, a: UInt8 = 255) {
        self.r = r
        self.g = g
        self.b = b
        self.a = a
    }

    /// `0xRRGGBB`.
    public init(hex: UInt32, alpha: UInt8 = 255) {
        self.init(r: UInt8((hex >> 16) & 0xFF), g: UInt8((hex >> 8) & 0xFF), b: UInt8(hex & 0xFF), a: alpha)
    }
}

/// Colours by role (FOUNDATION.md 3). The same tokens drive the test window and the app.
///
/// Vehicle colours are game information and off-limits for UI: the accent must never
/// look like a vehicle type (police, pickup, money transporter).
public enum ColorToken: Sendable, Equatable, CaseIterable {
    // UI roles
    case background
    case surface
    /// The kerb: the edge where the asphalt meets the ground, a shade darker than both.
    case kerb
    /// Under the cars: the ground darkened, never pure black.
    case shadow
    case island
    case marking
    case primary
    case muted
    case accent
    /// Text on an accent surface (the rush hour timer).
    case accentInk
    case destructive
    /// Dims the scene behind menus.
    case scrim
    // Vehicles
    case vehicleCar
    /// Ordinary cars come in four paints, picked by id (`CarArt.bodyColor`).
    case vehicleCarSilver
    case vehicleCarGraphite
    case vehicleCarSand
    case vehicleGlass
    /// Bumpers.
    case vehicleTrim
    /// Tyres and the engine bay under a torn-off hood.
    case vehicleTire
    /// Police: blue body, white roof, a red and a blue light.
    case vehiclePolice
    case vehiclePoliceRoof
    case lightRed
    case lightBlue
    /// The criminal's pickup and its open bed. Also marks the chase in the HUD
    /// (countdown ring, "WANTED"), so the two read as one.
    case vehicleCriminal
    case vehicleBed
    /// Money transporter: an armoured van in armour green, its box a shade lighter. The
    /// gold is its coin on the roof and the side stripes, and marks it in the HUD too
    /// (warning, secure zones, countdown), so the two read as one.
    case vehicleArmor
    case vehicleArmorBox
    case vehicleCargo
    /// The lorry: dark cab, pale box.
    case vehicleTruck
    case vehicleTruckBox
    /// The sports car (M10): a red that no special vehicle uses.
    case vehicleSports
    /// The compact and the van (LOOT.md): a quiet green and a cream no special vehicle wears.
    case vehicleCompact
    case vehicleVan
    // Car skins (M10): only ever on the player own normal cars, never on special vehicles.
    case skinRacingRed
    case skinMidnight
    case skinMint
    case skinSunset
    case skinIce
    case skinCarbon
    case skinGold
    case skinPearl
    case skinOlive
    case skinCoral
    case skinRose
    case skinLime
    case skinCopper
    case skinLagoon
    case skinChrome
    case skinHolo
    case mapSand
    case mapForest
    case mapSakura
    case mapEmber
    // Rarity frames in the shop (M10): quiet, one colour each.
    case rarityCommon
    case rarityRare
    case rarityEpic
    case rarityLegendary
    // Map skins (M10): a tint on the centre island.
    // The ground of each map outside the ring (`MapTheme`): dark, so everything reads.
    case groundDusk, groundSand, groundNeon, groundForest, groundAutumn, groundSakura, groundAurora, groundEmber
    // Items only the Daily streak and the seasons bring (`Rewards.swift`).
    case skinBronze, skinSilver, skinFrost, skinBlossom, skinSunburst, skinPumpkin
    // Car skins of the second wave (LOOT.md, 25.09.2026); `skinCream` is a two-tone roof.
    case skinLemon, skinPlum, skinFern, skinLatte, skinCherry, skinMocha, skinCream, skinTeal, skinSky
    case skinHanami, skinOcean, skinKoi, skinObsidian, skinRuby
    // Map skins of the second wave: their ground and their tint.
    case groundMeadow, groundTropic, groundSnow, groundCosmos
    case mapMeadow, mapTropic, mapSnow, mapCosmos
    /// Map details: the shade and the light of cherry blossom, lantern stone, pond water,
    /// the vermilion of a torii, and a firefly's glow.
    case sakuraDeep, sakuraPale, stone, water, torii, firefly
    case mapDusk
    case mapNeon
    case mapAutumn
    case mapAurora
    case hazard
    // Crash effects
    /// A burnt-out car body.
    case wreck
    case smoke
    case spark
    /// Hot centre of flames and the fireball.
    case fireCore
    case fireOuter
    /// The dark rim of a fireball.
    case fireDeep
    // Debug overlay (test window only)
    /// Celebration only (the chest opening): Apple's system hues, bright and fruity. Never
    /// on the road, so they never read as a vehicle.
    case juiceRed
    case juiceOrange
    case juiceYellow
    case juiceGreen
    case juiceBlue
    case juicePurple
    /// Floating chrome over the scene (notices, hints): a dark, almost opaque material and
    /// the bright hairline along its top edge that lifts it off what lies underneath.
    case chrome
    case chromeEdge
    /// iOS-style fills and separators for the drawn menus: raised controls, grouped cells.
    case controlFill
    case controlThumb
    case separator
    case debugHitbox
    case debugTight
    case debugClean
    case debugPanel
}

/// The dark palette (M11). Night, asphalt and one accent.
///
/// The ground is the darkest surface, the asphalt sits a step above it, the kerb marks the
/// edge between them. Text is checked against both: `primary` and `muted` clear 4.5:1 on
/// `background` and on `surface`, so nothing has to be read twice. The accent is a mint that
/// no vehicle ever wears, so "this is yours to touch" never reads as "this is a police car".
public enum Theme {
    public static func color(_ token: ColorToken) -> ColorRGBA {
        switch token {
        case .background: ColorRGBA(hex: 0x0B0D10)
        case .surface: ColorRGBA(hex: 0x23282F)
        case .kerb: ColorRGBA(hex: 0x1B2028)
        case .shadow: ColorRGBA(hex: 0x05070A, alpha: 120)
        case .island: ColorRGBA(hex: 0x121519)
        case .marking: ColorRGBA(hex: 0x454C56)
        case .primary: ColorRGBA(hex: 0xF4F6F9)
        case .muted: ColorRGBA(hex: 0x99A2AF)
        case .accent: ColorRGBA(hex: 0x9EE6CF)
        case .accentInk: ColorRGBA(hex: 0x0E1013)
        case .destructive: ColorRGBA(hex: 0xFF5A5F)
        case .scrim: ColorRGBA(hex: 0x0E1013, alpha: 214)
        case .vehicleCar: ColorRGBA(hex: 0xE3E6EA)
        case .vehicleCarSilver: ColorRGBA(hex: 0xBFC6CF)
        case .vehicleCarGraphite: ColorRGBA(hex: 0x8A94A1)
        case .vehicleCarSand: ColorRGBA(hex: 0xC9BCA8)
        case .vehicleGlass: ColorRGBA(hex: 0x2B3139)
        case .vehicleTrim: ColorRGBA(hex: 0x9CA3AD)
        case .vehicleTire: ColorRGBA(hex: 0x16191D)
        case .vehiclePolice: ColorRGBA(hex: 0x2F63E0)
        case .vehiclePoliceRoof: ColorRGBA(hex: 0xF2F4F7)
        case .lightRed: ColorRGBA(hex: 0xFF3B47)
        case .lightBlue: ColorRGBA(hex: 0x4FA3FF)
        case .vehicleCriminal: ColorRGBA(hex: 0xB45CF0)
        case .vehicleBed: ColorRGBA(hex: 0x35214A)
        case .vehicleCargo: ColorRGBA(hex: 0xD8A23A)
        case .vehicleArmor: ColorRGBA(hex: 0x3F6B58)
        case .vehicleArmorBox: ColorRGBA(hex: 0x4F7D69)
        case .vehicleTruck: ColorRGBA(hex: 0x4E586A)
        case .vehicleTruckBox: ColorRGBA(hex: 0xA9B2BE)
        case .vehicleSports: ColorRGBA(hex: 0xE2553F)
        case .vehicleCompact: ColorRGBA(hex: 0x9FC46B)
        case .vehicleVan: ColorRGBA(hex: 0xDCD4C3)
        case .skinRacingRed: ColorRGBA(hex: 0xD93A3A)
        case .skinMidnight: ColorRGBA(hex: 0x2A3350)
        case .skinMint: ColorRGBA(hex: 0x8FE3C4)
        case .skinSunset: ColorRGBA(hex: 0xF08A4B)
        case .skinIce: ColorRGBA(hex: 0xBFE6F5)
        case .skinCarbon: ColorRGBA(hex: 0x2E3136)
        case .skinGold: ColorRGBA(hex: 0xE3C15A)
        case .skinPearl: ColorRGBA(hex: 0xF2EEE6)
        case .skinOlive: ColorRGBA(hex: 0x7A8450)
        case .skinCoral: ColorRGBA(hex: 0xF27B6B)
        case .skinRose: ColorRGBA(hex: 0xE58FB0)
        case .skinLime: ColorRGBA(hex: 0xB5E35A)
        case .skinCopper: ColorRGBA(hex: 0xB8703F)
        case .skinLagoon: ColorRGBA(hex: 0x2BB3A8)
        case .skinChrome: ColorRGBA(hex: 0xC9D1DA)
        case .skinHolo: ColorRGBA(hex: 0xB9A7F2)
        case .mapSand: ColorRGBA(hex: 0xD9C08C)
        case .mapForest: ColorRGBA(hex: 0x3F8F5A)
        case .mapSakura: ColorRGBA(hex: 0xF2A7C3)
        case .mapEmber: ColorRGBA(hex: 0xFF6A3D)
        case .rarityCommon: ColorRGBA(hex: 0x9AA3AE)
        case .rarityRare: ColorRGBA(hex: 0x4FA3FF)
        case .rarityEpic: ColorRGBA(hex: 0xB45CF0)
        case .rarityLegendary: ColorRGBA(hex: 0xE3C15A)
        case .skinBronze: ColorRGBA(hex: 0xC8844E)
        case .skinSilver: ColorRGBA(hex: 0xB9C6D3)
        case .skinFrost: ColorRGBA(hex: 0xCFEFFF)
        case .skinBlossom: ColorRGBA(hex: 0xF6B8D4)
        case .skinSunburst: ColorRGBA(hex: 0xFFB61E)
        case .skinPumpkin: ColorRGBA(hex: 0xF07A1A)
        case .skinLemon: ColorRGBA(hex: 0xF2E27A)
        case .skinPlum: ColorRGBA(hex: 0x8E4A6B)
        case .skinFern: ColorRGBA(hex: 0x5E9E6E)
        case .skinLatte: ColorRGBA(hex: 0xC8A27C)
        case .skinCherry: ColorRGBA(hex: 0xB3243B)
        case .skinMocha: ColorRGBA(hex: 0x6B4A3A)
        case .skinCream: ColorRGBA(hex: 0xEDE3CC)
        case .skinTeal: ColorRGBA(hex: 0x1F8A8A)
        case .skinSky: ColorRGBA(hex: 0x8CC8F0)
        case .skinHanami: ColorRGBA(hex: 0xF9CFE0)
        case .skinOcean: ColorRGBA(hex: 0x1C5D7A)
        case .skinKoi: ColorRGBA(hex: 0xF2662E)
        case .skinObsidian: ColorRGBA(hex: 0x16171B)
        case .skinRuby: ColorRGBA(hex: 0x9B1B30)
        case .groundMeadow: ColorRGBA(hex: 0x0F1810)
        case .groundTropic: ColorRGBA(hex: 0x0A191B)
        case .groundSnow: ColorRGBA(hex: 0x121A26)
        case .groundCosmos: ColorRGBA(hex: 0x07060F)
        case .mapMeadow: ColorRGBA(hex: 0xF2D45C)
        case .mapTropic: ColorRGBA(hex: 0x2BC7B4)
        case .mapSnow: ColorRGBA(hex: 0xDCEBFA)
        case .mapCosmos: ColorRGBA(hex: 0xF6E7B0)
        case .sakuraDeep: ColorRGBA(hex: 0xC9577F)
        case .sakuraPale: ColorRGBA(hex: 0xFFE1EC)
        case .stone: ColorRGBA(hex: 0x6F6A72)
        case .water: ColorRGBA(hex: 0x16293A)
        case .torii: ColorRGBA(hex: 0xD8432E)
        case .firefly: ColorRGBA(hex: 0xE9F59A)
        case .groundDusk: ColorRGBA(hex: 0x15111F)
        case .groundSand: ColorRGBA(hex: 0x2B2317)
        case .groundNeon: ColorRGBA(hex: 0x081418)
        case .groundForest: ColorRGBA(hex: 0x0E1A12)
        case .groundAutumn: ColorRGBA(hex: 0x1F150D)
        case .groundSakura: ColorRGBA(hex: 0x1F1520)
        case .groundAurora: ColorRGBA(hex: 0x0E161D)
        case .groundEmber: ColorRGBA(hex: 0x1B0E0A)
        case .mapDusk: ColorRGBA(hex: 0x6B5B95)
        case .mapNeon: ColorRGBA(hex: 0x39E1D3)
        case .mapAutumn: ColorRGBA(hex: 0xC8743A)
        case .mapAurora: ColorRGBA(hex: 0x6EE7A8)
        case .hazard: ColorRGBA(hex: 0xFFD100)
        case .wreck: ColorRGBA(hex: 0x3A3F46)
        case .smoke: ColorRGBA(hex: 0x6B727C)
        case .spark: ColorRGBA(hex: 0xFFF1D0)
        case .fireCore: ColorRGBA(hex: 0xFFE08A)
        case .fireOuter: ColorRGBA(hex: 0xFF7A3D)
        case .fireDeep: ColorRGBA(hex: 0xC2362B)
        case .juiceRed: ColorRGBA(hex: 0xFF453A)
        case .juiceOrange: ColorRGBA(hex: 0xFF9F0A)
        case .juiceYellow: ColorRGBA(hex: 0xFFD60A)
        case .juiceGreen: ColorRGBA(hex: 0x30D158)
        case .juiceBlue: ColorRGBA(hex: 0x0A84FF)
        case .juicePurple: ColorRGBA(hex: 0xBF5AF2)
        case .chrome: ColorRGBA(hex: 0x1C2129, alpha: 240)
        case .chromeEdge: ColorRGBA(hex: 0xFFFFFF, alpha: 34)
        case .controlFill: ColorRGBA(hex: 0x767680, alpha: 61)
        case .controlThumb: ColorRGBA(hex: 0x636366)
        case .separator: ColorRGBA(hex: 0x545458, alpha: 153)
        case .debugHitbox: ColorRGBA(hex: 0xFACC15, alpha: 210)
        case .debugTight: ColorRGBA(hex: 0xFF9F43)
        case .debugClean: ColorRGBA(hex: 0x5BE38C)
        case .debugPanel: ColorRGBA(hex: 0x000000, alpha: 170)
        }
    }
}

/// Screen measures in points. Spacing follows the 4-point scale.
public enum Metrics {
    /// Space the scene leaves free around the playfield: the top bar (`TopBar`) floats there.
    public static let sceneInsets = EdgeInsets(top: 72, left: 0, bottom: 16, right: 0)
    public static let hudMargin = 20.0
    /// The strike dots, in the top bar's caption row (`TopBar`).
    public static let strikeRow = 28.0
    /// The cars still to send: the biggest thing in the HUD, because it is the shift's goal.
    public static let timerSize = 24.0
    /// The rush hour pill behind the car counter; fits "15 cars".
    public static let counterPillWidth = 138.0
    public static let strikeRadius = 4.0
    public static let strikeSpacing = 16.0
    public static let multiplierSize = 44.0
    public static let comboLabelSize = 13.0
    public static let popupSize = 20.0
    public static let noticeSize = 13.0
    /// Share of spare height placed above the playfield: > 0.5 keeps the queue low, in the thumb zone.
    public static let sceneVerticalBias = 0.6
    public static let vehicleCornerRadius = 4.5
    public static let debugTextSize = 14.0
    public static let debugLineHeight = 18.0
    public static let debugMargin = 12.0
}
