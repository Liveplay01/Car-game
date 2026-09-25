import AVFoundation
import CoreHaptics
import Foundation
import GameCore
import GamePresentation

/// The save game as JSON in Application Support.
final class AppSaveStore: SaveStore {
    private let url: URL = {
        let folder = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        return folder.appendingPathComponent("savegame.json")
    }()

    func load() -> SaveGame? {
        guard let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(SaveGame.self, from: data)
    }

    func save(_ game: SaveGame) {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        guard let data = try? encoder.encode(game) else { return }
        try? data.write(to: url, options: .atomic)
    }
}

/// A fresh, short seed for every shift.
final class SystemSeeds: RandomSource {
    func nextSeed() -> UInt64 { UInt64.random(in: 1...999_999) }
}

/// Where the copied assets are in the app bundle (`Resources/`).
enum AppResources {
    static func url(_ folder: String, _ name: String, _ ext: String) -> URL? {
        Bundle.module.url(forResource: name, withExtension: ext, subdirectory: "Resources/\(folder)")
            ?? Bundle.main.url(forResource: name, withExtension: ext, subdirectory: "Resources/\(folder)")
    }
}

/// Sound effects: two players per sound, so a quick repeat does not cut the first one off.
final class AppAudio: AudioPlaying {
    private var players: [SoundID: [AVAudioPlayer]] = [:]
    private var next: [SoundID: Int] = [:]

    init() {
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        for sound in SoundID.allCases {
            guard let url = AppResources.url("Sounds", sound.rawValue, "wav") else { continue }
            players[sound] = (0..<2).compactMap { _ in
                let player = try? AVAudioPlayer(contentsOf: url)
                // Pitch comes from the playback rate (`Feedback.pitch`).
                player?.enableRate = true
                player?.prepareToPlay()
                return player
            }
        }
    }

    func play(_ sound: SoundID, pitch: Double) {
        guard let list = players[sound], !list.isEmpty else { return }
        let index = next[sound, default: 0] % list.count
        next[sound] = index + 1
        list[index].currentTime = 0
        list[index].rate = Float(pitch)
        list[index].play()
    }
}

/// Haptics: the `.ahap` patterns with Core Haptics. Devices without haptics stay silent.
final class AppHaptics: HapticsPlaying {
    private var engine: CHHapticEngine?

    init() {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }
        engine = try? CHHapticEngine()
        engine?.isAutoShutdownEnabled = true
        engine?.resetHandler = { [weak self] in try? self?.engine?.start() }
        try? engine?.start()
    }

    func play(_ haptic: HapticID) {
        guard let engine, let url = AppResources.url("Haptics", haptic.rawValue, "ahap") else { return }
        try? engine.start()
        try? engine.playPattern(from: url)
    }
}

/// Adaptive music: all stems loop in sync, each faded to what `MusicMix` asks for.
final class AppMusic {
    private var players: [MusicLayer: AVAudioPlayer] = [:]
    private var volumes: [MusicLayer: Double] = [:]
    static let master = 0.35
    static let fade = 0.8

    init() {
        for layer in MusicLayer.allCases {
            guard let url = AppResources.url("Music", layer.rawValue, "wav"),
                  let player = try? AVAudioPlayer(contentsOf: url) else { continue }
            player.numberOfLoops = -1
            player.volume = 0
            player.prepareToPlay()
            players[layer] = player
        }
        // Started on the same device time, so the loops stay together.
        if let start = players.values.first.map({ $0.deviceCurrentTime + 0.2 }) {
            for player in players.values { player.play(atTime: start) }
        }
    }

    func update(mix: MusicMix, enabled: Bool, delta: Double) {
        for (layer, player) in players {
            let target = enabled ? mix.volume(layer) : 0
            let current = volumes[layer] ?? 0
            let next = current + (target - current) * min(1, delta / Self.fade)
            volumes[layer] = next
            player.volume = Float(next * Self.master)
        }
    }
}
