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

    func play(_ haptic: HapticID, softness: Double) {
        guard let engine, let url = url(haptic, softness: softness) else { return }
        try? engine.start()
        try? engine.playPattern(from: url)
    }

    /// Softened copies of the patterns (the flow, `Feedback.softness`), made once per step.
    private var softened: [String: URL] = [:]

    /// The pattern, or a copy that starts with two dynamic parameters (AHAP "Parameter"
    /// entries): less sharpness and a little less intensity, so it is felt deeper and softer.
    /// Softness comes in three steps, so there are never more than three copies of each.
    private func url(_ haptic: HapticID, softness: Double) -> URL? {
        guard let base = AppResources.url("Haptics", haptic.rawValue, "ahap") else { return nil }
        let step = Int((min(max(softness, 0), 1) * 3).rounded())
        guard step > 0 else { return base }
        let key = "\(haptic.rawValue)-soft\(step)"
        if let cached = softened[key] { return cached }
        guard let data = try? Data(contentsOf: base),
              var json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              var pattern = json["Pattern"] as? [Any] else { return base }
        let amount = Double(step) / 3
        pattern.insert(["Parameter": ["ParameterID": "HapticSharpnessControl", "Time": 0.0, "ParameterValue": -0.4 * amount]], at: 0)
        pattern.insert(["Parameter": ["ParameterID": "HapticIntensityControl", "Time": 0.0, "ParameterValue": 1 - 0.15 * amount]], at: 0)
        json["Pattern"] = pattern
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("\(key).ahap")
        guard let out = try? JSONSerialization.data(withJSONObject: json), (try? out.write(to: file)) != nil else { return base }
        softened[key] = file
        return file
    }
}

/// Adaptive music: all stems loop in sync, each faded to what `MusicMix` asks for, and all
/// through one low-pass filter, so the music can breathe in (`MusicMix.lowPass`). An
/// AVAudioEngine for that: stems → mixer → filter → output.
final class AppMusic {
    private let engine = AVAudioEngine()
    private let stems = AVAudioMixerNode()
    private let filter = AVAudioUnitEQ(numberOfBands: 1)
    private var players: [MusicLayer: AVAudioPlayerNode] = [:]
    private var volumes: [MusicLayer: Double] = [:]
    static let master = 0.35
    static let fade = 0.8

    init() {
        let band = filter.bands[0]
        band.filterType = .lowPass
        band.frequency = Float(MusicMix.cutoff(0))
        band.bypass = false
        engine.attach(stems)
        engine.attach(filter)
        engine.connect(stems, to: filter, format: nil)
        engine.connect(filter, to: engine.mainMixerNode, format: nil)
        for layer in MusicLayer.allCases {
            guard let url = AppResources.url("Music", layer.rawValue, "wav"),
                  let file = try? AVAudioFile(forReading: url),
                  let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)),
                  (try? file.read(into: buffer)) != nil else { continue }
            let player = AVAudioPlayerNode()
            engine.attach(player)
            engine.connect(player, to: stems, format: buffer.format)
            player.volume = 0
            player.scheduleBuffer(buffer, at: nil, options: .loops)
            players[layer] = player
        }
        start()
        // A call or another app took the audio: start again once it is back.
        NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] note in
            let type = (note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt).flatMap(AVAudioSession.InterruptionType.init)
            if type == .ended { self?.start() }
        }
    }

    /// Starts the engine and all stems on the same host time, so the loops stay together.
    private func start() {
        guard !players.isEmpty, (try? engine.start()) != nil else { return }
        let at = AVAudioTime(hostTime: mach_absolute_time() + AVAudioTime.hostTime(forSeconds: 0.2))
        for player in players.values where !player.isPlaying { player.play(at: at) }
    }

    func update(mix: MusicMix, enabled: Bool, delta: Double) {
        for (layer, player) in players {
            let target = enabled ? mix.volume(layer) : 0
            let current = volumes[layer] ?? 0
            let next = current + (target - current) * min(1, delta / Self.fade)
            volumes[layer] = next
            player.volume = Float(next * Self.master)
        }
        filter.bands[0].frequency = Float(MusicMix.cutoff(mix.lowPass))
    }
}
