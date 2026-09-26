import Foundation
import GameCore

/// Adaptive music (IDEA.md: Sound Design & Dynamic Audio; ROADMAP.md, M11): synchronised
/// stems that fade in and out with the game state. This is only the mix — which layer plays
/// how loud; the app plays the stems (`Assets/Music/<layer>.wav`) with AVAudioEngine.
public enum MusicLayer: String, CaseIterable, Sendable {
    /// Always there while a shift runs.
    case base
    /// Joins with the first combo tier.
    case rhythm
    /// Joins with the second tier: a subtle bass.
    case bass
    /// The top tier: the full arrangement.
    case lead
    /// A criminal is announced or on the run: the synth siren.
    case siren
    /// Rush hour: the beat pulls ahead.
    case rush
    /// Flow State: the rhythm gets denser.
    case flow
}

public struct MusicMix: Sendable, Equatable {
    /// Target volume per layer, 0…1. The app fades towards it.
    public var volumes: [MusicLayer: Double]
    /// How far the whole music is closed down by a low-pass filter, 0 (open) … 1 (deep and
    /// muffled). Applied at once, not faded: the envelope is already smooth (`breath`).
    public var lowPass = 0.0

    public func volume(_ layer: MusicLayer) -> Double { volumes[layer] ?? 0 }

    public static let silent = MusicMix(volumes: [:])

    /// The filter's cutoff for `lowPass`: 20 kHz (nothing filtered) down to 350 Hz, in even
    /// steps to the ear (geometric).
    public static func cutoff(_ lowPass: Double) -> Double {
        20_000 * pow(350.0 / 20_000, min(max(lowPass, 0), 1))
    }

    /// How deep the music breathes in.
    static let breathDepth = 0.85

    /// The music breathes in (Leo, 26.09.2026): when a criminal is announced or the rush hour
    /// begins, it closes down for a moment — the game takes a breath — then opens again as
    /// the siren or the faster beat comes in. `t` is the time since, in game seconds.
    static func breath(since t: Double) -> Double {
        let attack = 0.12, hold = 0.35, release = 0.9
        guard t >= 0 else { return 0 }
        if t < attack { return Ease.outCubic(t / attack) }
        if t < attack + hold { return 1 }
        if t < attack + hold + release { return 1 - Ease.inOutSine((t - attack - hold) / release) }
        return 0
    }

    /// The mix for the running shift. `flow` is the smoothed Flow State (0…1).
    public static func playing(_ world: World, flow: Double) -> MusicMix {
        let config = world.config
        let tier = Scoring.tier(combo: world.score.combo, config: config)
        var volumes: [MusicLayer: Double] = [.base: 1]
        volumes[.rhythm] = tier >= 1 ? 1 : 0
        volumes[.bass] = tier >= 2 ? 0.8 : 0
        volumes[.lead] = tier >= 3 ? 0.9 : 0
        switch world.criminal.phase {
        case .warning, .arriving, .active: volumes[.siren] = 0.7
        case .idle, .leaving: volumes[.siren] = 0
        }
        volumes[.rush] = world.shift.isRushHour ? 1 : 0
        volumes[.flow] = min(max(flow, 0), 1) * 0.8
        var breath = 0.0
        if case let .warning(_, until) = world.criminal.phase {
            breath = Self.breath(since: world.time - (until - config.criminalWarning))
        }
        if let rush = world.shift.rushHourSince {
            breath = max(breath, Self.breath(since: world.time - rush))
        }
        return MusicMix(volumes: volumes, lowPass: breath * Self.breathDepth)
    }
}
