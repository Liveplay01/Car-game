import CRaylib
import Foundation
import GamePresentation

/// Files the test window reads and writes. Found from this source file, so it does not
/// matter from which folder the window is started.
enum ProjectFiles {
    /// `…/Car game`, four levels above `TestWindow/Sources/TestWindow/Platform.swift`.
    static let root: URL = {
        var url = URL(fileURLWithPath: #filePath)
        for _ in 0..<4 {
            url.deleteLastPathComponent()
        }
        return url
    }()

    static let testWindow = root.appendingPathComponent("TestWindow")
    /// Live tuning values (T).
    static let tuning = testWindow.appendingPathComponent("tuning.json")
    /// Highscore and settings of the test window.
    static let saveGame = testWindow.appendingPathComponent("savegame.json")
    static let sounds = root.appendingPathComponent("Assets").appendingPathComponent("Sounds")
    static let music = root.appendingPathComponent("Assets").appendingPathComponent("Music")
}

/// The seed of each new shift: `--seed` if given, otherwise a fresh, short one that is easy
/// to note down. Printed, so every shift can be replayed.
final class SeedSource: RandomSource {
    private let fixed: UInt64?

    init(fixed: UInt64?) {
        self.fixed = fixed
    }

    func nextSeed() -> UInt64 {
        let seed = fixed ?? UInt64.random(in: 1...999_999)
        print("Shift seed \(seed)  (repeat with --seed \(seed))")
        return seed
    }
}

/// Plays the `.wav` files from `Assets/Sounds` with raylib. The app plays the same files
/// with AVAudioEngine.
final class RaylibAudio: AudioPlaying {
    private var sounds: [SoundID: Sound] = [:]

    init(folder: URL) {
        InitAudioDevice()
        guard IsAudioDeviceReady() else {
            print("No audio device: playing without sound")
            return
        }
        var missing: [String] = []
        for id in SoundID.allCases {
            let path = folder.appendingPathComponent("\(id.rawValue).wav").path
            let sound = FileExists(path) ? LoadSound(path) : Sound()
            if IsSoundValid(sound) {
                sounds[id] = sound
            } else {
                missing.append(id.rawValue)
            }
        }
        if !missing.isEmpty {
            print("Sounds missing in \(folder.path): \(missing.joined(separator: ", "))")
        }
    }

    func play(_ sound: SoundID) {
        if let loaded = sounds[sound] {
            PlaySound(loaded)
        }
    }

    func unload() {
        for sound in sounds.values {
            UnloadSound(sound)
        }
        sounds.removeAll()
        if IsAudioDeviceReady() {
            CloseAudioDevice()
        }
    }
}

/// Plays the adaptive music stems from `Assets/Music` (M11): all in sync, each faded to the
/// volume the session asks for (`GameSession.musicMix`). The app does the same with
/// AVAudioEngine. Missing stems (run SoundMaker) just stay silent.
final class RaylibMusic {
    private var streams: [MusicLayer: Music] = [:]
    private var volumes: [MusicLayer: Double] = [:]
    /// Overall music level under the sound effects.
    static let master = 0.35
    /// Seconds a layer needs to fade in or out.
    static let fade = 0.8

    init(folder: URL) {
        guard IsAudioDeviceReady() else { return }
        for layer in MusicLayer.allCases {
            let path = folder.appendingPathComponent("\(layer.rawValue).wav").path
            guard FileExists(path) else { continue }
            var music = LoadMusicStream(path)
            guard IsMusicValid(music) else { continue }
            music.looping = true
            SetMusicVolume(music, 0)
            streams[layer] = music
        }
        if streams.isEmpty {
            print("No music stems in \(folder.path) (cd TestWindow; swift run SoundMaker)")
        }
        // Started together, so the loops stay in sync.
        for music in streams.values { PlayMusicStream(music) }
    }

    func update(mix: MusicMix, enabled: Bool, delta: Double) {
        for (layer, music) in streams {
            let target = enabled ? mix.volume(layer) : 0
            let current = volumes[layer] ?? 0
            let next = current + (target - current) * min(1, delta / Self.fade)
            volumes[layer] = next
            SetMusicVolume(music, Float(next * Self.master))
            UpdateMusicStream(music)
        }
    }

    func unload() {
        for music in streams.values {
            StopMusicStream(music)
            UnloadMusicStream(music)
        }
        streams.removeAll()
    }
}
