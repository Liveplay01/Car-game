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

    public func volume(_ layer: MusicLayer) -> Double { volumes[layer] ?? 0 }

    public static let silent = MusicMix(volumes: [:])

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
        return MusicMix(volumes: volumes)
    }
}
