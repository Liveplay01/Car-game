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

    func play(_ sound: SoundID, pitch: Double) {
        if let loaded = sounds[sound] {
            SetSoundPitch(loaded, Float(pitch))
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

/// The music's low-pass (`MusicMix.lowPass`, the music breathing in): two one-pole stages per
/// stem, run by raylib on the audio thread over the stereo float frames it mixes. raylib's
/// callbacks carry no context, so each stem has its own little function and its own state.
enum MusicFilter {
    /// The one-pole coefficient: 1 lets everything through, smaller closes it down. Written
    /// by the main thread once a frame, read by the audio thread; a torn read is harmless.
    nonisolated(unsafe) static var coefficient: Float = 1
    /// Two stages × two channels per stem.
    nonisolated(unsafe) static let state: UnsafeMutablePointer<Float> = {
        let memory = UnsafeMutablePointer<Float>.allocate(capacity: 4 * slots)
        memory.initialize(repeating: 0, count: 4 * slots)
        return memory
    }()
    static let slots = 8
    /// The device rate raylib mixes at (miniaudio's default); only shapes the cutoff a little.
    static let sampleRate = 48_000.0

    static func set(lowPass: Double) {
        let cutoff = MusicMix.cutoff(lowPass)
        coefficient = Float(1 - exp(-2 * Double.pi * cutoff / sampleRate))
    }

    static func process(_ slot: Int, _ buffer: UnsafeMutableRawPointer?, _ frames: UInt32) {
        guard let buffer, slot < slots else { return }
        let samples = buffer.assumingMemoryBound(to: Float.self)
        let a = coefficient
        let s = state + slot * 4
        var (l1, r1, l2, r2) = (s[0], s[1], s[2], s[3])
        for frame in 0..<Int(frames) {
            l1 += a * (samples[2 * frame] - l1)
            r1 += a * (samples[2 * frame + 1] - r1)
            l2 += a * (l1 - l2)
            r2 += a * (r1 - r2)
            samples[2 * frame] = l2
            samples[2 * frame + 1] = r2
        }
        (s[0], s[1], s[2], s[3]) = (l1, r1, l2, r2)
    }

    nonisolated(unsafe) static let processors: [AudioCallback] = [
        { process(0, $0, $1) }, { process(1, $0, $1) }, { process(2, $0, $1) }, { process(3, $0, $1) },
        { process(4, $0, $1) }, { process(5, $0, $1) }, { process(6, $0, $1) }, { process(7, $0, $1) },
    ]
}

/// Plays the adaptive music stems from `Assets/Music` (M11): all in sync, each faded to the
/// volume the session asks for (`GameSession.musicMix`), all through the breathing low-pass
/// (`MusicFilter`). The app does the same with AVAudioEngine. Missing stems (run SoundMaker)
/// just stay silent.
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
            if streams.count < MusicFilter.slots {
                AttachAudioStreamProcessor(music.stream, MusicFilter.processors[streams.count])
            }
            streams[layer] = music
        }
        if streams.isEmpty {
            print("No music stems in \(folder.path) (cd TestWindow; swift run SoundMaker)")
        }
        // Started together, so the loops stay in sync.
        for music in streams.values { PlayMusicStream(music) }
    }

    func update(mix: MusicMix, enabled: Bool, delta: Double) {
        MusicFilter.set(lowPass: mix.lowPass)
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
