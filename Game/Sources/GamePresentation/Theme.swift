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
    /// Money transporter: the cargo box on the flatbed, and its hazard stripes.
    case vehicleCargo
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
    case debugHitbox
    case debugTight
    case debugClean
    case debugPanel
}

/// Placeholder dark palette. The final design pass is milestone M6.
public enum Theme {
    public static func color(_ token: ColorToken) -> ColorRGBA {
        switch token {
        case .background: ColorRGBA(hex: 0x0E1013)
        case .surface: ColorRGBA(hex: 0x252A31)
        case .island: ColorRGBA(hex: 0x15181C)
        case .marking: ColorRGBA(hex: 0x3D444E)
        case .primary: ColorRGBA(hex: 0xF2F4F7)
        case .muted: ColorRGBA(hex: 0x8B94A1)
        case .accent: ColorRGBA(hex: 0x9EE6CF)
        case .accentInk: ColorRGBA(hex: 0x0E1013)
        case .destructive: ColorRGBA(hex: 0xFF5A5F)
        case .scrim: ColorRGBA(hex: 0x0E1013, alpha: 214)
        case .vehicleCar: ColorRGBA(hex: 0xE3E6EA)
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
        case .hazard: ColorRGBA(hex: 0xFFD100)
        case .wreck: ColorRGBA(hex: 0x3A3F46)
        case .smoke: ColorRGBA(hex: 0x6B727C)
        case .spark: ColorRGBA(hex: 0xFFF1D0)
        case .fireCore: ColorRGBA(hex: 0xFFE08A)
        case .fireOuter: ColorRGBA(hex: 0xFF7A3D)
        case .fireDeep: ColorRGBA(hex: 0xC2362B)
        case .debugHitbox: ColorRGBA(hex: 0xFACC15, alpha: 210)
        case .debugTight: ColorRGBA(hex: 0xFF9F43)
        case .debugClean: ColorRGBA(hex: 0x5BE38C)
        case .debugPanel: ColorRGBA(hex: 0x000000, alpha: 170)
        }
    }
}

/// Screen measures in points. Spacing follows the 4-point scale.
public enum Metrics {
    /// Space the scene leaves free around the playfield: the HUD sits in the top band.
    public static let sceneInsets = EdgeInsets(top: 72, left: 0, bottom: 16, right: 0)
    public static let hudMargin = 20.0
    /// Solid band behind the HUD, then a short fade into the scene.
    public static let hudBand = 68.0
    public static let hudFade = 16.0
    /// Taller band for the result: title, score and highscore line.
    public static let resultBand = 144.0
    /// Vertical centre of the score, timer and pause glyph.
    public static let hudRow = 28.0
    /// Vertical centre of the strike dots.
    public static let strikeRow = 54.0
    public static let scoreSize = 28.0
    public static let timerSize = 24.0
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
