import Foundation

/// Writes the sound effects to `Assets/Sounds` and the music stems to `Assets/Music`
/// (16-bit stereo WAV, 44.1 kHz).
///
///     cd TestWindow; swift run -c release SoundMaker
///
/// Everything is synthesised from seeded noise and oscillators, so the files can be rebuilt
/// any time and come out the same. Sound design (M11, Leo 24.09.2026):
/// - **Crashes are layered like real ones:** the thump of the bodies, crumpling sheet metal,
///   the panel ringing, a cracking bumper, glass on hard hits, parts bouncing away, tyres
///   scrubbing. Three weights (`crashLight`, `crash`, `crashHeavy`) follow the impact.
/// - **The street is a place:** a short stereo room gives every sound a space to sit in.
/// - **Transitions are heard:** shift start, result, tabs, purchases, the chest's charge
///   and burst, the flow, the pickup's getaway, the tow truck.
/// - The more often a sound plays, the quieter and shorter it is (FOUNDATION.md 3).
@main
struct SoundMaker {
    static let rate = 44_100.0

    static func main() throws {
        let folder = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Assets").appendingPathComponent("Sounds")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        // Name, sound and peak level: the frequent merge tick stays far below everything else.
        let sounds: [(String, () -> Stereo, Double)] = [
            ("merge", merge, 0.16),
            ("toll", toll, 0.13),
            ("tightFit", tightFit, 0.5),
            ("nearMiss", nearMiss, 0.32),
            ("perfect", perfect, 0.4),
            ("cutOff", cutOff, 0.3),
            ("comboUp", comboUp, 0.42),
            ("crashLight", { crash(severity: 0.55, seed: 11) }, 0.55),
            ("crash", { crash(severity: 1, seed: 7) }, 0.72),
            ("crashHeavy", { crash(severity: 1.5, seed: 23) }, 0.85),
            ("rushHour", rushHour, 0.38),
            ("shiftComplete", shiftComplete, 0.45),
            ("shiftFailed", shiftFailed, 0.36),
            ("wanted", wanted, 0.36),
            ("screech", screech, 0.4),
            ("takedown", takedown, 0.8),
            ("dispatch", dispatch, 0.32),
            ("escaped", escaped, 0.4),
            ("secured", secured, 0.36),
            ("paid", paid, 0.45),
            ("seized", seized, 0.5),
            ("tow", tow, 0.22),
            ("flowIn", flowIn, 0.2),
            ("go", go, 0.22),
            ("swoosh", swoosh, 0.22),
            ("uiTick", uiTick, 0.12),
            ("purchase", purchase, 0.42),
            ("build", build, 0.5),
            ("denied", denied, 0.26),
            ("chestCharge", chestCharge, 0.32),
            ("chestBurst", { chestBurst(rare: false) }, 0.55),
            ("chestBurstRare", { chestBurst(rare: true) }, 0.62),
        ]
        for (name, make, peak) in sounds {
            let url = folder.appendingPathComponent("\(name).wav")
            let sound = make().trimmed().normalized(peak: peak)
            try wav(sound).write(to: url)
            print(String(format: "%@  %.2f s", url.lastPathComponent, Double(sound.count) / rate))
        }
        try writeMusic(next: folder)
    }

    // MARK: - Music stems (M11)

    /// Stems for the adaptive music (`MusicMix`): one 8-second loop each, all in sync
    /// (120 BPM, 4 bars Am – F – C – G). The game fades them in and out.
    static func writeMusic(next sounds: URL) throws {
        let folder = sounds.deletingLastPathComponent().appendingPathComponent("Music")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let stems: [(String, () -> Stereo, Double)] = [
            ("base", musicBase, 0.24),
            ("rhythm", musicRhythm, 0.3),
            ("bass", musicBass, 0.3),
            ("lead", musicLead, 0.17),
            ("siren", musicSiren, 0.11),
            ("rush", musicRush, 0.24),
            ("flow", musicFlow, 0.14),
        ]
        for (name, make, peak) in stems {
            let url = folder.appendingPathComponent("\(name).wav")
            let stem = make().normalized(peak: peak)
            try wav(stem).write(to: url)
            print(String(format: "Music/%@  %.2f s", url.lastPathComponent, Double(stem.count) / rate))
        }
    }

    static let loopSeconds = 8.0
    static let beat = 0.5
    /// Chord roots per bar (Hz, low octave) and their triads as ratios.
    static let roots = [110.0, 87.31, 130.81, 98.0]
    static let minor = [1.0, 1.1892, 1.4983]
    static let major = [1.0, 1.2599, 1.4983]
    static func chord(_ bar: Int) -> [Double] {
        let ratios = bar == 0 ? minor : major
        return ratios.map { roots[bar % 4] * $0 }
    }
    static func bar(at t: Double) -> Int { Int(t / (4 * beat)) % 4 }

    /// A loop with a room on it: rendered twice and the second pass kept, so the reverb
    /// tail of the end runs into the start and the loop stays seamless.
    static func loop(room: Double, wet: Double, _ sample: @escaping (Double) -> (Double, Double)) -> Stereo {
        let twice = renderStereo(2 * loopSeconds) { sample($0.truncatingRemainder(dividingBy: loopSeconds)) }
        let spaced = reverb(twice, room: room, damp: 0.5, wet: wet, tail: 0)
        let half = Int(loopSeconds * rate)
        return Stereo(left: Array(spaced.left[half..<2 * half]), right: Array(spaced.right[half..<2 * half]))
    }

    /// Warm pad: three detuned saws per chord note behind a soft low-pass, swelling per bar.
    static func musicBase() -> Stereo {
        var filterL = Biquad()
        var filterR = Biquad()
        filterL.set(.lowPass, 1_300, q: 0.6)
        filterR.set(.lowPass, 1_300, q: 0.6)
        return loop(room: 0.8, wet: 0.35) { t in
            let inBar = t.truncatingRemainder(dividingBy: 4 * beat) / (4 * beat)
            let swell = 0.65 + 0.35 * sin(.pi * inBar)
            var l = 0.0
            var r = 0.0
            for note in chord(bar(at: t)) {
                let f = note * 2
                l += saw(f * 0.996, t, harmonics: 6) + saw(f * 1.002, t, harmonics: 6) * 0.7
                r += saw(f * 1.004, t, harmonics: 6) + saw(f * 0.999, t, harmonics: 6) * 0.7
            }
            return (filterL.process(l) * swell * 0.12, filterR.process(r) * swell * 0.12)
        }
    }

    /// Kick on every beat, closed hats on the eighths, a little wider than the kick.
    static func musicRhythm() -> Stereo {
        var noise = Random(seed: 21)
        var hats = Biquad()
        hats.set(.highPass, 7_000, q: 0.7)
        return renderStereo(loopSeconds) { t in
            let inBeat = t.truncatingRemainder(dividingBy: beat)
            let kick = softClip(sine(48 + 110 * exp(-inBeat / 0.022), inBeat) * decay(inBeat, 0.16), drive: 1.6)
            let inEighth = t.truncatingRemainder(dividingBy: beat / 2)
            let offbeat = Int(t / (beat / 2)) % 2 == 1
            let hat = hats.process(noise.noise()) * decay(inEighth, offbeat ? 0.03 : 0.018) * (offbeat ? 0.5 : 0.32)
            return (kick + hat * 0.8, kick + hat)
        }
    }

    /// A round, plucked bass on every beat, following the chord root.
    static func musicBass() -> Stereo {
        var filter = Biquad()
        return renderStereo(loopSeconds) { t in
            let inBeat = t.truncatingRemainder(dividingBy: beat)
            let root = roots[bar(at: t)] / 2
            filter.set(.lowPass, 180 + 900 * exp(-inBeat / 0.06), q: 1.1)
            let tone = filter.process(saw(root, t, harmonics: 10)) + 0.5 * sine(root, t)
            return mono(tone * decay(inBeat, 0.3))
        }
    }

    /// The top tier: a sixteenth arpeggio through the chord, with an echo in the room.
    static func musicLead() -> Stereo {
        loop(room: 0.7, wet: 0.45) { t in
            let step = Int(t / (beat / 4))
            let notes = chord(bar(at: t)).map { $0 * 4 }
            let note = notes[step % 3] * (step % 8 >= 6 ? 2 : 1)
            let inStep = t.truncatingRemainder(dividingBy: beat / 4)
            let tone = fmBell(note, inStep, length: 0.12, ratio: 2, index: 1.2)
            let pan = step % 2 == 0 ? -0.35 : 0.35
            return panned(tone, pan)
        }
    }

    /// A soft synth siren under the chase, two tones per second.
    static func musicSiren() -> Stereo {
        var filter = Biquad()
        filter.set(.lowPass, 2_200, q: 0.7)
        var glide = 660.0
        var osc = Oscillator()
        return loop(room: 0.6, wet: 0.3) { t in
            let phase = t.truncatingRemainder(dividingBy: 1)
            glide += ((phase < 0.5 ? 660.0 : 880.0) - glide) * 0.004
            let tone = filter.process(osc.harmonic(glide, harmonics: 5)) * (0.6 + 0.4 * sin(2 * .pi * 2 * t))
            return mono(tone)
        }
    }

    /// Rush hour: sixteenth hats and a clap on two and four.
    static func musicRush() -> Stereo {
        var noise = Random(seed: 33)
        var hats = Biquad()
        hats.set(.highPass, 8_500, q: 0.8)
        var claps = Biquad()
        claps.set(.bandPass, 1_400, q: 0.9)
        return renderStereo(loopSeconds) { t in
            let inSixteenth = t.truncatingRemainder(dividingBy: beat / 4)
            let hat = hats.process(noise.noise()) * decay(inSixteenth, 0.014)
            let beatIndex = Int(t / beat)
            let inBeat = t.truncatingRemainder(dividingBy: beat)
            // A clap is three quick bursts, like hands that never meet quite at once.
            let clapEnvelope = [0, 0.011, 0.023].map { decay(inBeat - $0, 0.012) }.reduce(0, +) + decay(inBeat - 0.023, 0.07) * 0.6
            let clap = beatIndex % 2 == 1 ? claps.process(noise.noise()) * clapEnvelope * 1.5 : 0
            let pan = (Int(t / (beat / 4)) % 2 == 0) ? -0.3 : 0.3
            let h = panned(hat, pan)
            return (h.0 + clap, h.1 + clap)
        }
    }

    /// Flow: a high, glassy triplet shimmer over the chord.
    static func musicFlow() -> Stereo {
        loop(room: 0.85, wet: 0.55) { t in
            let step = Int(t / (beat / 3))
            let notes = chord(bar(at: t)).map { $0 * 8 }
            let inStep = t.truncatingRemainder(dividingBy: beat / 3)
            return panned(fmBell(notes[step % 3], inStep, length: 0.2, ratio: 3.01, index: 0.8), sin(Double(step) * 1.3) * 0.6)
        }
    }

    // MARK: - Driving

    /// Clean merge, ~100 times a shift: a soft, round "tok".
    static func merge() -> Stereo {
        let dry = renderStereo(0.09) { t in
            let body = sine(620 + 380 * exp(-t / 0.006), t) * decay(t, 0.018)
            let click = sine(2_400, t) * decay(t, 0.002) * 0.25
            return mono(body + click)
        }
        return reverb(dry, room: 0.3, damp: 0.6, wet: 0.08, tail: 0.12)
    }

    /// A module earned money: a tiny coin clink, quieter than a merge.
    static func toll() -> Stereo {
        let dry = renderStereo(0.12) { t in
            mono(modal(t, [2_730, 4_120, 6_380], decays: [0.05, 0.035, 0.02], amplitudes: [1, 0.6, 0.35]))
        }
        return reverb(dry, room: 0.3, damp: 0.5, wet: 0.1, tail: 0.1)
    }

    /// Tight Fit: a swoosh that flies from left to right as the car slips in, then a bright,
    /// glassy click on top.
    static func tightFit() -> Stereo {
        var noise = Random(seed: 1)
        var filter = Biquad()
        let length = 0.26
        let dry = renderStereo(0.42) { t in
            let x = min(t / length, 1)
            filter.set(.bandPass, 700 + 4_600 * x * x, q: 2.4)
            let air = t < length ? filter.process(noise.noise()) * sin(.pi * min(x * 1.25, 1)) * 0.9 : 0
            let swoosh = panned(air, -0.8 + 1.6 * x)
            let click = fmBell(2_637, t - 0.17, length: 0.09, ratio: 2.76, index: 1.5) * 0.35
            return (swoosh.0 + click, swoosh.1 + click)
        }
        return reverb(dry, room: 0.45, damp: 0.4, wet: 0.14, tail: 0.3)
    }

    /// Near Miss: a car rushing past right beside yours; its pitch falls as it goes by.
    static func nearMiss() -> Stereo {
        var noise = Random(seed: 7)
        var filter = Biquad()
        let length = 0.2
        let dry = renderStereo(length) { t in
            let x = t / length
            // Towards you, then away: the classic Doppler fall.
            filter.set(.bandPass, x < 0.4 ? 2_600 + 600 * x : 2_840 - 2_000 * (x - 0.4) / 0.6, q: 3)
            let envelope = x < 0.4 ? pow(x / 0.4, 2) : pow(1 - (x - 0.4) / 0.6, 1.5)
            return panned(filter.process(noise.noise()) * envelope, 0.7 - 1.4 * x)
        }
        return reverb(dry, room: 0.35, damp: 0.5, wet: 0.1, tail: 0.2)
    }

    /// Perfect Input: a small crystal "ting" in two notes — precise, not loud.
    static func perfect() -> Stereo {
        let dry = renderStereo(0.3) { t in
            let first = fmBell(2_093, t, length: 0.08, ratio: 3.5, index: 1.2)
            let second = fmBell(3_136, t - 0.045, length: 0.12, ratio: 3.5, index: 1) * 0.85
            return (first + second * 0.8, first * 0.8 + second)
        }
        return reverb(dry, room: 0.55, damp: 0.3, wet: 0.2, tail: 0.4)
    }

    /// Cut off: the car you cut off honks at you — two short, annoyed blasts of a dual horn.
    static func cutOff() -> Stereo {
        var filter = Biquad()
        filter.set(.bandPass, 1_000, q: 0.8)
        var low = Biquad()
        low.set(.lowPass, 3_200, q: 0.7)
        var a = Oscillator()
        var b = Oscillator()
        let dry = renderStereo(0.34) { t in
            let blast = envelope(t, attack: 0.008, hold: 0.07, release: 0.02) + envelope(t - 0.13, attack: 0.008, hold: 0.15, release: 0.04)
            let horn = softClip(a.harmonic(415, harmonics: 12) + b.harmonic(512, harmonics: 10), drive: 2.5)
            let tone = low.process(filter.process(horn) * 1.4 + horn * 0.25) * blast
            return panned(tone, 0.35)
        }
        return reverb(dry, room: 0.5, damp: 0.5, wet: 0.18, tail: 0.3)
    }

    /// New combo tier: three rising bells over a soft pop.
    static func comboUp() -> Stereo {
        let notes = [1_318.5, 1_661.2, 1_975.5]
        let dry = renderStereo(0.5) { t in
            let pop = sine(180 + 260 * exp(-t / 0.01), t) * decay(t, 0.03) * 0.5
            var l = pop
            var r = pop
            for (index, note) in notes.enumerated() {
                let tone = fmBell(note, t - Double(index) * 0.06, length: 0.22, ratio: 3.5, index: 1.4) * 0.4
                let pan = -0.4 + 0.4 * Double(index)
                l += panned(tone, pan).0
                r += panned(tone, pan).1
            }
            return (l, r)
        }
        return reverb(dry, room: 0.6, damp: 0.3, wet: 0.22, tail: 0.5)
    }

    // MARK: - Crashes

    /// A crash of `severity` (0.4 light … 1.6 hard), layered like a real one: the bodies'
    /// thump, crumpling sheet metal, the panel ringing, a cracking bumper, glass on hard hits,
    /// parts bouncing away and tyres scrubbing, all in the street's space.
    static func crash(severity s: Double, seed: UInt64) -> Stereo {
        var random = Random(seed: seed)
        let length = 0.5 + 0.9 * s
        var sound = impact(severity: s, random: &random, length: length)
        if s > 1.2 {
            // The cars hit twice: the second, softer bang a moment later.
            var echo = Random(seed: seed &+ 99)
            sound.add(impact(severity: s * 0.45, random: &echo, length: 0.6), at: 0.085, gain: 0.55)
        }
        if s >= 0.8 {
            sound.add(tyreScrub(length: 0.18 + 0.2 * s, seed: seed &+ 5), at: 0.02, gain: 0.18 * s)
        }
        if s > 1.1 {
            sound.add(glass(amount: s, seed: seed &+ 3), at: 0.012, gain: 0.55)
        }
        sound.add(debris(pieces: Int(2 + 3 * s), seed: seed &+ 8), at: 0.06, gain: 0.3 + 0.15 * s)
        return reverb(sound, room: 0.5, damp: 0.45, wet: 0.14 + 0.04 * s, tail: 0.5)
    }

    /// The contact itself: thump, crunch, ring and a bumper cracking.
    static func impact(severity s: Double, random: inout Random, length: Double) -> Stereo {
        var sound = Stereo(seconds: length)
        // The bodies: a low, saturated thump that drops in pitch, and a dull whump of air.
        var whump = Biquad()
        whump.set(.lowPass, 220 + 80 * s, q: 0.8)
        var noise = Random(seed: random.seed())
        var osc = Oscillator()
        let thump = render(length) { t in
            let pitch = 42 + (60 + 30 * s) * exp(-t / 0.03)
            let body = osc.sine(pitch) * decay(t, 0.06 + 0.05 * s)
            let air = whump.process(noise.noise()) * decay(t, 0.05 + 0.04 * s) * 1.6
            return softClip((body + air) * (0.8 + 0.4 * s), drive: 2.2)
        }
        sound.add(mono: thump, gain: 0.9)
        // Crumpling metal: a dense cloud of short, metallic grains that thins out.
        let crumple = 0.08 + 0.22 * s
        for _ in 0..<Int(40 + 90 * s) {
            let start = min(-crumple * 0.45 * log(max(random.next(), 1e-4)), crumple * 2.5)
            let fade = exp(-start / crumple)
            sound.addHit(at: start, frequency: random.range(650, 4_800), decay: random.range(0.002, 0.009),
                         amplitude: random.range(0.25, 1) * fade * 0.5, noise: random.range(0.3, 0.8), pan: random.range(-0.6, 0.6), seed: random.seed())
        }
        // The panel rings: inharmonic modes of a steel sheet, a little different every crash.
        let base = random.range(260, 380)
        let ring = render(length) { t in
            modal(t, [1, 2.32, 3.87, 5.14, 6.71, 8.9].map { $0 * base }, decays: [0.3, 0.2, 0.15, 0.11, 0.08, 0.05].map { $0 * (0.5 + 0.4 * s) }, amplitudes: [1, 0.7, 0.55, 0.4, 0.3, 0.2])
        }
        sound.add(mono: ring, gain: 0.14 + 0.06 * s, pan: random.range(-0.3, 0.3))
        // The plastic bumper cracks: a dry, bright snap right at the contact.
        var snap = Biquad()
        snap.set(.highPass, 2_500, q: 0.7)
        var crack = Random(seed: random.seed())
        sound.add(mono: render(0.03) { t in snap.process(crack.noise()) * decay(t, 0.006) }, at: 0.004, gain: 0.5 + 0.2 * s, pan: random.range(-0.4, 0.4))
        return sound
    }

    /// Glass shattering: a bright burst, then shards tinkling to the ground.
    static func glass(amount: Double, seed: UInt64) -> Stereo {
        var random = Random(seed: seed)
        var sound = Stereo(seconds: 0.9)
        var bright = Biquad()
        bright.set(.highPass, 3_200, q: 0.7)
        var noise = Random(seed: random.seed())
        sound.add(mono: render(0.08) { t in bright.process(noise.noise()) * decay(t, 0.018) }, gain: 0.9)
        for _ in 0..<Int(18 * amount) {
            let start = min(0.01 - 0.14 * log(max(random.next(), 1e-4)), 0.75)
            sound.addHit(at: start, frequency: random.range(3_500, 9_000), decay: random.range(0.006, 0.025),
                         amplitude: random.range(0.2, 0.7) * exp(-start / 0.3), noise: 0.1, pan: random.range(-0.9, 0.9), seed: random.seed())
        }
        return sound
    }

    /// Parts flying off and bouncing: each hit comes sooner and softer than the last.
    static func debris(pieces: Int, seed: UInt64) -> Stereo {
        var random = Random(seed: seed)
        var sound = Stereo(seconds: 1.1)
        for _ in 0..<pieces {
            var at = random.range(0.03, 0.28)
            var gap = random.range(0.08, 0.16)
            var level = random.range(0.4, 1)
            let frequency = random.range(600, 2_200)
            let pan = random.range(-0.8, 0.8)
            for _ in 0..<Int(random.range(3, 6)) {
                sound.addHit(at: at, frequency: frequency * random.range(0.95, 1.05), decay: random.range(0.01, 0.025),
                             amplitude: level, noise: 0.35, pan: pan, seed: random.seed())
                at += gap
                gap *= 0.62
                level *= 0.6
            }
        }
        return sound
    }

    /// Rubber dragged sideways over asphalt: a rough, wavering squeal.
    static func tyreScrub(length: Double, seed: UInt64, pitch: Double = 1) -> Stereo {
        var noise = Random(seed: seed)
        var wobble = Random(seed: seed &+ 1)
        var filters = [Biquad(), Biquad(), Biquad()]
        let centers = [1_550.0, 2_250, 3_100].map { $0 * pitch }
        var drift = 0.0
        return renderStereo(length) { t in
            drift += (wobble.noise() * 0.5 - drift) * 0.0015
            let input = noise.noise()
            var sum = 0.0
            for index in filters.indices {
                filters[index].set(.bandPass, centers[index] * (1 + 0.06 * drift + 0.015 * sin(2 * .pi * 11 * t)), q: 14)
                sum += filters[index].process(input) * [1, 0.7, 0.4][index]
            }
            return mono(sum * envelope(t, attack: 0.02, hold: length - 0.1, release: 0.08) * 2.2)
        }
    }

    // MARK: - Shift

    /// Rush hour: the city speeds up — a riser that opens up and pulses faster, with horns.
    static func rushHour() -> Stereo {
        var filterL = Biquad()
        var filterR = Biquad()
        var tremolo = 0.0
        let length = 0.95
        var dry = renderStereo(length) { t in
            let x = t / length
            filterL.set(.lowPass, 400 + 4_200 * x * x, q: 2)
            filterR.set(.lowPass, 420 + 4_200 * x * x, q: 2)
            tremolo += (6 + 10 * x) / rate
            let pulse = 0.55 + 0.45 * sin(2 * .pi * tremolo)
            let f = 220 * (1 + 0.5 * x)
            let level = envelope(t, attack: 0.05, hold: length - 0.2, release: 0.15) * pulse * 0.35
            return (filterL.process(saw(f * 0.995, t, harmonics: 12) + saw(f * 1.5, t, harmonics: 8)) * level,
                    filterR.process(saw(f * 1.005, t, harmonics: 12) + saw(f * 1.5 * 1.003, t, harmonics: 8)) * level)
        }
        dry.add(horn(0.14, frequencies: (392, 494)), at: 0.62, gain: 0.35, pan: -0.6)
        dry.add(horn(0.2, frequencies: (440, 554)), at: 0.72, gain: 0.3, pan: 0.6)
        return reverb(dry, room: 0.6, damp: 0.4, wet: 0.22, tail: 0.5)
    }

    /// Shift complete: a major arpeggio of bells over a soft swell that rings out.
    static func shiftComplete() -> Stereo {
        let notes = [1_046.5, 1_318.5, 1_568, 2_093]
        let dry = renderStereo(1.6) { t in
            let pad = [523.25, 659.25, 783.99].map { saw($0, t, harmonics: 4) }.reduce(0, +) * envelope(t, attack: 0.25, hold: 0.3, release: 0.8) * 0.05
            var l = pad
            var r = pad
            for (index, note) in notes.enumerated() {
                let tone = fmBell(note, t - Double(index) * 0.1, length: 0.45, ratio: 3.5, index: 1.3) * 0.28
                let side = panned(tone, -0.45 + 0.3 * Double(index))
                l += side.0
                r += side.1
            }
            return (l, r)
        }
        return reverb(dry, room: 0.75, damp: 0.3, wet: 0.3, tail: 0.9)
    }

    /// Shift lost: two soft notes going down a minor third, over a dull low thud.
    static func shiftFailed() -> Stereo {
        var filter = Biquad()
        filter.set(.lowPass, 1_400, q: 0.7)
        let dry = renderStereo(0.9) { t in
            let first = triangle(392, t) * envelope(t, attack: 0.01, hold: 0.18, release: 0.12)
            let second = triangle(329.63, t) * envelope(t - 0.24, attack: 0.01, hold: 0.25, release: 0.3)
            let thud = sine(55, t) * decay(t, 0.12) * 0.6
            return mono(filter.process((first + second) * 0.3) + thud)
        }
        return reverb(dry, room: 0.6, damp: 0.5, wet: 0.2, tail: 0.6)
    }

    // MARK: - Police and criminals

    /// A German "Martinshorn": two horn tones a fourth apart (A and D). The same siren the
    /// blue light bar belongs to.
    static func siren(_ length: Double, toneLength: Double, pitch: @escaping (Double) -> Double, brightness: @escaping (Double) -> Double, level: @escaping (Double) -> Double) -> [Double] {
        var osc = Oscillator()
        var formant = Biquad()
        var tone = Biquad()
        var frequency = 440.0
        return render(length) { t in
            let high = Int(t / toneLength) % 2 == 1
            frequency += ((high ? 587.3 : 440) * pitch(t) - frequency) * 0.012
            formant.set(.bandPass, 1_300, q: 0.9)
            tone.set(.lowPass, brightness(t), q: 0.7)
            let raw = softClip(osc.harmonic(frequency, harmonics: 14), drive: 1.8)
            return tone.process(formant.process(raw) * 1.2 + raw * 0.3) * level(t)
        }
    }

    /// A criminal is coming: the siren approaching, "ta-tü-ta-tü".
    static func wanted() -> Stereo {
        let length = 1.1
        let tones = siren(length, toneLength: 0.26, pitch: { 0.985 + 0.015 * $0 / length }, brightness: { 2_500 + 2_500 * $0 / length }) { t in
            envelope(t, attack: 0.02, hold: length - 0.1, release: 0.08) * (0.55 + 0.45 * t / length)
        }
        var dry = Stereo(seconds: length)
        dry.add(mono: tones)
        return reverb(dry, room: 0.6, damp: 0.4, wet: 0.24, tail: 0.6)
    }

    /// The pickup races in: an engine revving up and tyres squealing, crossing from left to right.
    static func screech() -> Stereo {
        let length = 1.0
        var engine = Oscillator()
        var filter = Biquad()
        filter.set(.lowPass, 900, q: 1.2)
        var sound = renderStereo(length) { t in
            let x = t / length
            let rev = 85 + 120 * Ease.outCubic(min(x * 1.6, 1))
            let growl = filter.process(softClip(engine.harmonic(rev, harmonics: 16) * 1.4, drive: 2.5))
            return panned(growl * envelope(t, attack: 0.05, hold: 0.7, release: 0.25) * 0.5, -0.6 + 1.2 * x)
        }
        sound.add(tyreScrub(length: 0.6, seed: 41, pitch: 1.1), at: 0.12, gain: 0.55, pan: 0)
        return reverb(sound, room: 0.55, damp: 0.4, wet: 0.2, tail: 0.5)
    }

    /// The good crash: the full weight of a heavy hit, tyres, parts — and then a bright
    /// signature chime that says "got him".
    static func takedown() -> Stereo {
        var sound = crash(severity: 1.3, seed: 99)
        let notes = [1_568.0, 2_349.3, 3_136]
        let chime = renderStereo(1.2) { t in
            var l = 0.0
            var r = 0.0
            for (index, note) in notes.enumerated() {
                let tone = fmBell(note, t - Double(index) * 0.08, length: 0.4, ratio: 3.5, index: 1.2) * 0.3
                let side = panned(tone, -0.5 + 0.5 * Double(index))
                l += side.0
                r += side.1
            }
            return (l, r)
        }
        sound.add(reverb(chime, room: 0.7, damp: 0.3, wet: 0.3, tail: 0.7), at: 0.14, gain: 0.55)
        return sound
    }

    /// Emergency dispatch: the police radio clicks open, a quick "tü-ta", the radio closes.
    static func dispatch() -> Stereo {
        var sound = Stereo(seconds: 0.5)
        sound.add(radioSquelch(0.06, seed: 3), gain: 0.5)
        let tones = siren(0.24, toneLength: 0.12, pitch: { _ in 1.02 }, brightness: { _ in 3_500 }) { t in envelope(t, attack: 0.01, hold: 0.2, release: 0.03) }
        sound.add(mono: tones, at: 0.07, gain: 0.8)
        sound.add(radioSquelch(0.05, seed: 4), at: 0.33, gain: 0.35)
        return reverb(sound, room: 0.4, damp: 0.5, wet: 0.12, tail: 0.3)
    }

    /// The radio's click and hiss.
    static func radioSquelch(_ length: Double, seed: UInt64) -> Stereo {
        var noise = Random(seed: seed)
        var filter = Biquad()
        filter.set(.bandPass, 2_100, q: 1.3)
        return renderStereo(length) { t in
            let click = t < 0.003 ? 1.0 : 0
            return mono(filter.process(noise.noise()) * envelope(t, attack: 0.002, hold: length - 0.015, release: 0.012) * 1.5 + click)
        }
    }

    /// The criminal got away: the siren falls in pitch, dulls and fades into the distance.
    static func escaped() -> Stereo {
        let length = 1.7
        let tones = siren(length, toneLength: 0.3, pitch: { 1 - 0.14 * $0 / length }, brightness: { 5_000 * pow(0.14, $0 / length) }) { t in
            envelope(t, attack: 0.02, hold: length - 0.1, release: 0.08) * pow(1 - t / length, 1.4)
        }
        var dry = Stereo(seconds: length)
        dry.add(mono: tones, pan: -0.2)
        return reverb(dry, room: 0.75, damp: 0.5, wet: 0.4, tail: 0.8)
    }

    // MARK: - Money transporter

    /// A money transporter is coming: the armoured door locks, then a calm two-tone chime,
    /// twice. Not a siren, so it never sounds like "WANTED".
    static func secured() -> Stereo {
        var sound = Stereo(seconds: 1.2)
        sound.add(lock(), gain: 0.6)
        let notes = [1_318.5, 1_046.5, 1_318.5, 1_046.5]
        let chime = renderStereo(1.1) { t in
            var l = 0.0
            var r = 0.0
            for (index, note) in notes.enumerated() {
                let side = panned(fmBell(note, t - Double(index) * 0.2, length: 0.3, ratio: 2, index: 0.9) * 0.3, index % 2 == 0 ? -0.25 : 0.25)
                l += side.0
                r += side.1
            }
            return (l, r)
        }
        sound.add(chime, at: 0.09)
        return reverb(sound, room: 0.6, damp: 0.35, wet: 0.2, tail: 0.6)
    }

    /// A heavy bolt sliding shut.
    static func lock() -> Stereo {
        var noise = Random(seed: 12)
        var filter = Biquad()
        filter.set(.bandPass, 1_800, q: 2)
        return renderStereo(0.14) { t in
            let slide = filter.process(noise.noise()) * envelope(t, attack: 0.005, hold: 0.03, release: 0.015) * 0.5
            let clunk = (sine(95, t - 0.045) * decay(t - 0.045, 0.03) + modal(t - 0.045, [820, 1_930, 3_050], decays: [0.04, 0.025, 0.015], amplitudes: [0.6, 0.4, 0.25])) * (t >= 0.045 ? 1 : 0)
            return mono(slide + clunk)
        }
    }

    /// The transporter left safely: a cash register — the drawer's clack, the bell, coins.
    static func paid() -> Stereo {
        var sound = Stereo(seconds: 1)
        var noise = Random(seed: 17)
        var filter = Biquad()
        filter.set(.bandPass, 3_000, q: 1.5)
        sound.add(renderStereo(0.05) { t in mono(filter.process(noise.noise()) * decay(t, 0.008) * 1.2) }, gain: 0.5)
        let bell = renderStereo(0.8) { t in
            let ding = fmBell(1_318.5, t, length: 0.35, ratio: 3.5, index: 1.6) + fmBell(1_975.5, t - 0.06, length: 0.35, ratio: 3.5, index: 1.4) * 0.8
            return mono(ding * 0.4)
        }
        sound.add(bell, at: 0.04)
        sound.add(coins(count: 10, seed: 5), at: 0.1, gain: 0.35)
        return reverb(sound, room: 0.55, damp: 0.3, wet: 0.2, tail: 0.5)
    }

    /// Coins settling: small, bright clinks, each a little quieter.
    static func coins(count: Int, seed: UInt64) -> Stereo {
        var random = Random(seed: seed)
        var sound = Stereo(seconds: 0.7)
        var at = 0.0
        for index in 0..<count {
            sound.addHit(at: at, frequency: random.range(4_500, 7_500), decay: random.range(0.01, 0.03),
                         amplitude: 0.9 * pow(0.85, Double(index)), noise: 0.05, pan: random.range(-0.7, 0.7), seed: random.seed())
            at += random.range(0.02, 0.06)
        }
        return sound
    }

    /// The police seized the transporter: a heavy clunk, a chain rattling off, a falling tone.
    static func seized() -> Stereo {
        var random = Random(seed: 31)
        var sound = Stereo(seconds: 0.9)
        var filter = Biquad()
        filter.set(.lowPass, 1_600, q: 0.8)
        var osc = Oscillator()
        let dry = render(0.8) { t in
            let clunk = sine(62, t) * decay(t, 0.08) * 1.2 + modal(t, [410, 980, 1_620], decays: [0.18, 0.1, 0.06], amplitudes: [0.4, 0.3, 0.2])
            let x = min(t / 0.6, 1)
            let tone = filter.process(osc.harmonic(440 - 180 * x, harmonics: 6)) * envelope(t - 0.05, attack: 0.03, hold: 0.4, release: 0.25) * 0.3
            return clunk + tone
        }
        sound.add(mono: dry)
        var at = 0.06
        for _ in 0..<7 {
            sound.addHit(at: at, frequency: random.range(2_000, 3_400), decay: 0.012, amplitude: random.range(0.3, 0.6), noise: 0.4, pan: random.range(-0.4, 0.4), seed: random.seed())
            at += random.range(0.025, 0.05)
        }
        return reverb(sound, room: 0.55, damp: 0.45, wet: 0.18, tail: 0.5)
    }

    // MARK: - City

    /// The tow truck clears a wreck: a winch ratchets, the motor whines, the hook clanks.
    static func tow() -> Stereo {
        var sound = Stereo(seconds: 0.8)
        var random = Random(seed: 51)
        var at = 0.0
        while at < 0.38 {
            sound.addHit(at: at, frequency: random.range(2_000, 2_400), decay: 0.005, amplitude: 0.5, noise: 0.5, pan: -0.1, seed: random.seed())
            at += 1.0 / 18
        }
        var filter = Biquad()
        filter.set(.lowPass, 1_200, q: 0.8)
        var osc = Oscillator()
        sound.add(mono: render(0.45) { t in
            filter.process(osc.harmonic(200 + 120 * t / 0.45, harmonics: 8)) * envelope(t, attack: 0.04, hold: 0.33, release: 0.08) * 0.25
        })
        sound.add(mono: render(0.35) { t in modal(t, [640, 1_510, 2_480], decays: [0.12, 0.07, 0.04], amplitudes: [0.6, 0.45, 0.3]) }, at: 0.42, gain: 0.7, pan: 0.15)
        return reverb(sound, room: 0.5, damp: 0.5, wet: 0.15, tail: 0.4)
    }

    /// Flow State begins: a soft, airy shimmer that swells in, like the music opening up.
    static func flowIn() -> Stereo {
        var noise = Random(seed: 61)
        var air = Biquad()
        let length = 0.8
        let dry = renderStereo(length) { t in
            let x = t / length
            let swell = pow(x, 2.2) * (x > 0.85 ? max(0, 1 - (x - 0.85) / 0.15) : 1)
            air.set(.highPass, 3_000 + 4_000 * x, q: 0.7)
            let shimmer = [1_760.0, 2_217.5, 2_637, 3_520].enumerated().map { sine($1 * (1 + 0.002 * sin(Double($0) + 7 * t)), t) }.reduce(0, +)
            let breath = air.process(noise.noise()) * 0.4
            return ((shimmer * 0.25 + breath) * swell * (1 + 0.1 * sin(2 * .pi * 5 * t)), (shimmer * 0.25 - breath) * swell)
        }
        return reverb(dry, room: 0.8, damp: 0.3, wet: 0.45, tail: 0.8)
    }

    /// A shift starts: a short upward whoosh and a soft pulse — "go".
    static func go() -> Stereo {
        var noise = Random(seed: 71)
        var filter = Biquad()
        let length = 0.3
        let dry = renderStereo(length) { t in
            let x = t / length
            filter.set(.bandPass, 300 + 2_200 * x, q: 1.5)
            let whoosh = filter.process(noise.noise()) * sin(.pi * x) * 0.8
            let pulse = sine(90 + 60 * x, t) * envelope(t - 0.18, attack: 0.01, hold: 0.02, release: 0.08) * 0.8
            return mono(whoosh + pulse)
        }
        return reverb(dry, room: 0.5, damp: 0.4, wet: 0.16, tail: 0.3)
    }

    // MARK: - Menus

    /// The result slides in: a soft, falling breath of air.
    static func swoosh() -> Stereo {
        var noise = Random(seed: 81)
        var filter = Biquad()
        let length = 0.32
        let dry = renderStereo(length) { t in
            let x = t / length
            filter.set(.bandPass, 1_800 - 1_300 * x, q: 1.2)
            return panned(filter.process(noise.noise()) * pow(sin(.pi * x), 1.5), 0.3 - 0.6 * x)
        }
        return reverb(dry, room: 0.5, damp: 0.4, wet: 0.14, tail: 0.3)
    }

    /// A tab or a card: a tiny, crisp tick.
    static func uiTick() -> Stereo {
        renderStereo(0.03) { t in mono(sine(3_200, t) * decay(t, 0.004) + sine(1_600, t) * decay(t, 0.006) * 0.5) }
    }

    /// Something was bought: coins drop onto the counter, then a bright "ka-ching".
    static func purchase() -> Stereo {
        var sound = Stereo(seconds: 0.8)
        sound.add(coins(count: 5, seed: 91), gain: 0.4)
        let ching = renderStereo(0.6) { t in
            mono(fmBell(1_975.5, t, length: 0.25, ratio: 3.5, index: 1.5) * 0.4 + fmBell(2_637, t - 0.05, length: 0.3, ratio: 3.5, index: 1.3) * 0.35)
        }
        sound.add(ching, at: 0.09)
        return reverb(sound, room: 0.5, damp: 0.3, wet: 0.18, tail: 0.4)
    }

    /// Something was built on the ring: a heavy thud, steel, a little gravel.
    static func build() -> Stereo {
        var random = Random(seed: 101)
        var sound = Stereo(seconds: 0.7)
        var low = Biquad()
        low.set(.lowPass, 300, q: 0.8)
        var noise = Random(seed: 102)
        sound.add(mono: render(0.4) { t in
            softClip(sine(55 + 50 * exp(-t / 0.02), t) * decay(t, 0.1) + low.process(noise.noise()) * decay(t, 0.06) * 1.5, drive: 2)
        })
        sound.add(mono: render(0.4) { t in modal(t, [520, 1_240, 2_010, 2_890], decays: [0.18, 0.1, 0.06, 0.04], amplitudes: [0.5, 0.4, 0.3, 0.2]) }, at: 0.02, gain: 0.5)
        for _ in 0..<14 {
            sound.addHit(at: random.range(0.02, 0.3), frequency: random.range(1_500, 5_000), decay: 0.004, amplitude: random.range(0.1, 0.3), noise: 0.8, pan: random.range(-0.7, 0.7), seed: random.seed())
        }
        return reverb(sound, room: 0.5, damp: 0.5, wet: 0.16, tail: 0.4)
    }

    /// Not enough money: two short, soft, low buzzes.
    static func denied() -> Stereo {
        var filter = Biquad()
        filter.set(.lowPass, 900, q: 0.7)
        var osc = Oscillator()
        return renderStereo(0.24) { t in
            let gate = envelope(t, attack: 0.005, hold: 0.06, release: 0.02) + envelope(t - 0.11, attack: 0.005, hold: 0.08, release: 0.03)
            return mono(filter.process(osc.harmonic(196, harmonics: 8)) * gate)
        }
    }

    /// The chest charges up (`ShopPage.burstTime`): it rattles faster and faster while a
    /// tone and a wash of air rise into the burst.
    static func chestCharge() -> Stereo {
        let length = 0.9
        var sound = Stereo(seconds: length)
        var random = Random(seed: 111)
        var at = 0.0
        var gap = 0.12
        while at < length - 0.04 {
            sound.addHit(at: at, frequency: random.range(700, 1_300), decay: 0.012, amplitude: 0.3 + 0.5 * at / length, noise: 0.6, pan: random.range(-0.3, 0.3), seed: random.seed())
            at += gap
            gap = max(0.03, gap * 0.86)
        }
        var noise = Random(seed: 112)
        var air = Biquad()
        var osc = Oscillator()
        sound.add(renderStereo(length) { t in
            let x = t / length
            air.set(.bandPass, 600 + 5_000 * x * x, q: 1.4)
            let rise = osc.sine(300 * pow(3, x)) * 0.25 + air.process(noise.noise()) * 0.6
            return mono(rise * pow(x, 1.8))
        })
        return reverb(sound, room: 0.5, damp: 0.4, wet: 0.15, tail: 0.2)
    }

    /// The chest bursts open, "splashy, fruity" like its animation: a cork-like pop, a juicy
    /// splash with bubbles, sparkling bells. The rare one adds a deep boom and a fanfare chord.
    static func chestBurst(rare: Bool) -> Stereo {
        var sound = Stereo(seconds: rare ? 2 : 1.3)
        var osc = Oscillator()
        sound.add(mono: render(0.06) { t in osc.sine(420 + 1_200 * min(t / 0.015, 1)) * decay(t, 0.02) })
        var noise = Random(seed: 121)
        var splash = Biquad()
        sound.add(mono: render(0.5) { t in
            splash.set(.bandPass, 2_800 - 1_800 * min(t / 0.4, 1), q: 1)
            return splash.process(noise.noise()) * decay(t, 0.09) * 0.8
        }, at: 0.01)
        // Bubbles: short chirps that rise, scattered through the splash.
        var random = Random(seed: 122)
        for _ in 0..<(rare ? 16 : 10) {
            let start = random.range(0.02, 0.45)
            let base = random.range(350, 900)
            var bubble = Oscillator()
            sound.add(mono: render(0.05) { t in bubble.sine(base * (1 + 3 * t / 0.05)) * decay(t, 0.012) }, at: start, gain: random.range(0.15, 0.35), pan: random.range(-0.7, 0.7))
        }
        let sparkle = [2_093.0, 2_637, 3_136, 4_186]
        sound.add(renderStereo(1) { t in
            var l = 0.0
            var r = 0.0
            for (index, note) in sparkle.enumerated() {
                let side = panned(fmBell(note, t - Double(index) * 0.045, length: 0.3, ratio: 3.5, index: 1.2) * 0.25, index % 2 == 0 ? -0.5 : 0.5)
                l += side.0
                r += side.1
            }
            return (l, r)
        }, at: 0.03)
        if rare {
            sound.add(mono: render(0.8) { t in softClip(sine(40 + 50 * exp(-t / 0.05), t) * decay(t, 0.25), drive: 1.5) }, gain: 0.8)
            sound.add(renderStereo(1.6) { t in
                let chord = [523.25, 659.25, 783.99, 1_046.5].map { saw($0, t, harmonics: 5) * 0.5 + fmBell($0 * 2, t, length: 0.6, ratio: 2, index: 0.8) }
                return mono(chord.reduce(0, +) * envelope(t, attack: 0.02, hold: 0.5, release: 1) * 0.12)
            }, at: 0.12)
        }
        return reverb(sound, room: 0.7, damp: 0.3, wet: rare ? 0.3 : 0.22, tail: 0.8)
    }

    /// A single car horn blast (for the rush hour's distant horns).
    static func horn(_ length: Double, frequencies: (Double, Double)) -> Stereo {
        var a = Oscillator()
        var b = Oscillator()
        var filter = Biquad()
        filter.set(.bandPass, 1_000, q: 0.8)
        return renderStereo(length) { t in
            mono(filter.process(softClip(a.harmonic(frequencies.0, harmonics: 10) + b.harmonic(frequencies.1, harmonics: 10), drive: 2)) * envelope(t, attack: 0.01, hold: length - 0.04, release: 0.03))
        }
    }

    // MARK: - Building blocks

    static func render(_ seconds: Double, _ sample: (Double) -> Double) -> [Double] {
        (0..<Int(seconds * rate)).map { sample(Double($0) / rate) }
    }

    static func renderStereo(_ seconds: Double, _ sample: (Double) -> (Double, Double)) -> Stereo {
        let count = Int(seconds * rate)
        var sound = Stereo(count: count)
        for i in 0..<count {
            let (l, r) = sample(Double(i) / rate)
            sound.left[i] = l
            sound.right[i] = r
        }
        return sound
    }

    static func mono(_ x: Double) -> (Double, Double) { (x, x) }

    /// Equal-power pan, -1 left … 1 right; the centre keeps the full level on both sides.
    static func panned(_ x: Double, _ pan: Double) -> (Double, Double) {
        let angle = (min(max(pan, -1), 1) + 1) * .pi / 4
        return (x * cos(angle) * 2.0.squareRoot(), x * sin(angle) * 2.0.squareRoot())
    }

    static func sine(_ frequency: Double, _ t: Double) -> Double { t < 0 ? 0 : sin(2 * .pi * frequency * t) }

    static func triangle(_ frequency: Double, _ t: Double) -> Double {
        let x = (frequency * t).truncatingRemainder(dividingBy: 1)
        return 4 * abs(x - 0.5) - 1
    }

    /// A band-limited saw from its first harmonics.
    static func saw(_ frequency: Double, _ t: Double, harmonics: Int) -> Double {
        var sum = 0.0
        for n in 1...harmonics where Double(n) * frequency < 16_000 {
            sum += sin(2 * .pi * frequency * Double(n) * t) / Double(n)
        }
        return sum * 0.6
    }

    /// Exponential decay with time constant `tau`.
    static func decay(_ t: Double, _ tau: Double) -> Double { t < 0 ? 0 : exp(-t / tau) }

    static func envelope(_ t: Double, attack: Double, hold: Double, release: Double) -> Double {
        if t < 0 { return 0 }
        if t < attack { return t / attack }
        if t < attack + hold { return 1 }
        return max(0, 1 - (t - attack - hold) / release)
    }

    /// A bell by frequency modulation: bright at the strike, purer as it rings out.
    static func fmBell(_ frequency: Double, _ t: Double, length: Double = 0.3, ratio: Double = 3.5, index: Double = 1.5) -> Double {
        guard t >= 0 else { return 0 }
        let attack = min(t / 0.002, 1)
        let modulator = sin(2 * .pi * frequency * ratio * t) * index * exp(-t / (length * 0.35))
        return attack * sin(2 * .pi * frequency * t + modulator) * exp(-t / length)
    }

    /// Struck metal: damped sine modes.
    static func modal(_ t: Double, _ frequencies: [Double], decays: [Double], amplitudes: [Double]) -> Double {
        guard t >= 0 else { return 0 }
        var sum = 0.0
        for i in frequencies.indices {
            sum += sin(2 * .pi * frequencies[i] * t) * exp(-t / decays[i]) * amplitudes[i]
        }
        return sum * min(t / 0.0008, 1)
    }

    static func softClip(_ x: Double, drive: Double) -> Double { tanh(x * drive) / tanh(drive) }

    /// A Freeverb-style room: parallel damped combs into allpasses, slightly different on
    /// each side, so the sound gets width and a place to sit.
    static func reverb(_ dry: Stereo, room: Double, damp: Double, wet: Double, tail: Double) -> Stereo {
        let count = dry.count + Int(tail * rate)
        let combs = [1_116, 1_188, 1_277, 1_356, 1_422, 1_491, 1_557, 1_617]
        let allpasses = [556, 441, 341, 225]
        let feedback = 0.7 + 0.28 * room
        func channel(_ input: [Double], spread: Int) -> [Double] {
            var output = input + Array(repeating: 0, count: count - input.count)
            var sum = Array(repeating: 0.0, count: count)
            for size in combs {
                var buffer = Array(repeating: 0.0, count: size + spread)
                var index = 0
                var store = 0.0
                for i in 0..<count {
                    let out = buffer[index]
                    store = out * (1 - damp) + store * damp
                    buffer[index] = (i < input.count ? input[i] : 0) * 0.015 + store * feedback
                    sum[i] += out
                    index = (index + 1) % buffer.count
                }
            }
            for size in allpasses {
                var buffer = Array(repeating: 0.0, count: size + spread)
                var index = 0
                for i in 0..<count {
                    let out = buffer[index]
                    buffer[index] = sum[i] + out * 0.5
                    sum[i] = out - sum[i]
                    index = (index + 1) % buffer.count
                }
            }
            for i in 0..<count { output[i] += sum[i] * wet * 3 }
            return output
        }
        return Stereo(left: channel(dry.left, spread: 0), right: channel(dry.right, spread: 23))
    }

    struct Stereo {
        var left: [Double]
        var right: [Double]

        init(left: [Double], right: [Double]) {
            self.left = left
            self.right = right
        }

        init(count: Int) {
            left = Array(repeating: 0, count: count)
            right = left
        }

        init(seconds: Double) { self.init(count: Int(seconds * SoundMaker.rate)) }

        var count: Int { left.count }

        private mutating func grow(to size: Int) {
            // Both sides by the same amount: `count` is the left side, so it is read once.
            let extra = size - count
            if extra > 0 {
                left += Array(repeating: 0, count: extra)
                right += Array(repeating: 0, count: extra)
            }
        }

        mutating func add(_ other: Stereo, at seconds: Double = 0, gain: Double = 1, pan: Double = 0) {
            let offset = Int(seconds * SoundMaker.rate)
            grow(to: offset + other.count)
            let (l, r) = SoundMaker.panned(gain, pan)
            for i in 0..<other.count {
                left[offset + i] += other.left[i] * l
                right[offset + i] += other.right[i] * r
            }
        }

        mutating func add(mono samples: [Double], at seconds: Double = 0, gain: Double = 1, pan: Double = 0) {
            add(Stereo(left: samples, right: samples), at: seconds, gain: gain, pan: pan)
        }

        /// One short struck sound: a damped sine blended with a noise burst.
        mutating func addHit(at seconds: Double, frequency: Double, decay: Double, amplitude: Double, noise: Double, pan: Double, seed: UInt64) {
            var random = Random(seed: seed)
            var filter = Biquad()
            filter.set(.bandPass, frequency, q: 3)
            let length = decay * 7
            let samples = SoundMaker.render(length) { t in
                let tone = sin(2 * .pi * frequency * t) * (1 - noise) + filter.process(random.noise()) * noise * 2.5
                return tone * exp(-t / decay) * min(t / 0.0005, 1) * amplitude
            }
            add(mono: samples, at: max(seconds, 0), pan: pan)
        }

        /// Silence at the end cut off, with a short fade so nothing clicks.
        func trimmed() -> Stereo {
            let peak = max(left.map(abs).max() ?? 0, right.map(abs).max() ?? 0)
            let floor = peak * 0.0008
            var end = count
            while end > 1, abs(left[end - 1]) < floor, abs(right[end - 1]) < floor { end -= 1 }
            var result = Stereo(left: Array(left[0..<end]), right: Array(right[0..<end]))
            let fade = min(Int(0.02 * SoundMaker.rate), end)
            for i in 0..<fade {
                let gain = Double(i) / Double(fade)
                result.left[end - 1 - i] *= gain
                result.right[end - 1 - i] *= gain
            }
            return result
        }

        func normalized(peak target: Double) -> Stereo {
            let peak = max(left.map(abs).max() ?? 0, right.map(abs).max() ?? 0)
            guard peak > 0 else { return self }
            return Stereo(left: left.map { $0 * target / peak }, right: right.map { $0 * target / peak })
        }
    }

    /// Seeded random numbers: the same seed gives the same sound on every run.
    struct Random {
        var state: UInt64
        init(seed: UInt64) { state = seed &* 2_862_933_555_777_941_757 &+ 3_037_000_493 }
        /// 0 ..< 1
        mutating func next() -> Double {
            state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
            return Double(state >> 11) * 0x1.0p-53
        }
        mutating func noise() -> Double { next() * 2 - 1 }
        mutating func range(_ low: Double, _ high: Double) -> Double { low + (high - low) * next() }
        mutating func seed() -> UInt64 {
            state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
            return state
        }
    }

    /// An oscillator that keeps its phase, so the pitch can glide without clicks.
    struct Oscillator {
        var phase = 0.0
        mutating func sine(_ frequency: Double) -> Double {
            phase = (phase + frequency / SoundMaker.rate).truncatingRemainder(dividingBy: 1)
            return sin(2 * .pi * phase)
        }
        /// A buzzy tone: odd harmonics strong, even ones softer — horns and sirens.
        mutating func harmonic(_ frequency: Double, harmonics: Int) -> Double {
            phase = (phase + frequency / SoundMaker.rate).truncatingRemainder(dividingBy: 1)
            var sum = 0.0
            for n in 1...harmonics where Double(n) * frequency < 14_000 {
                sum += sin(2 * .pi * phase * Double(n)) / Double(n) * (n % 2 == 1 ? 1 : 0.6)
            }
            return sum * 0.6
        }
    }

    /// A biquad filter (RBJ cookbook); `set` may be called every sample for sweeps.
    struct Biquad {
        enum Kind { case lowPass, highPass, bandPass }
        var b0 = 1.0, b1 = 0.0, b2 = 0.0, a1 = 0.0, a2 = 0.0
        var x1 = 0.0, x2 = 0.0, y1 = 0.0, y2 = 0.0

        mutating func set(_ kind: Kind, _ frequency: Double, q: Double) {
            let w = 2 * .pi * min(max(frequency, 10), SoundMaker.rate * 0.45) / SoundMaker.rate
            let cosW = cos(w)
            let alpha = sin(w) / (2 * q)
            let a0 = 1 + alpha
            switch kind {
            case .lowPass:
                b0 = (1 - cosW) / 2 / a0; b1 = (1 - cosW) / a0; b2 = b0
            case .highPass:
                b0 = (1 + cosW) / 2 / a0; b1 = -(1 + cosW) / a0; b2 = b0
            case .bandPass:
                b0 = alpha / a0; b1 = 0; b2 = -alpha / a0
            }
            a1 = -2 * cosW / a0
            a2 = (1 - alpha) / a0
        }

        mutating func process(_ x: Double) -> Double {
            let y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
            x2 = x1; x1 = x
            y2 = y1; y1 = y
            return y
        }
    }

    enum Ease {
        static func outCubic(_ x: Double) -> Double {
            let u = 1 - min(max(x, 0), 1)
            return 1 - u * u * u
        }
    }

    // MARK: - WAV

    /// A sample as 16 bit; anything that is not a number becomes silence instead of a crash.
    static func pcm(_ x: Double) -> Int16 {
        guard x.isFinite else { return 0 }
        return Int16((min(max(x, -1), 1) * 32_767).rounded())
    }

    static func wav(_ sound: Stereo) -> Data {
        var data = Data()
        func append<T: FixedWidthInteger>(_ value: T) {
            withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
        }
        let bytes = sound.count * 4
        data.append(contentsOf: Array("RIFF".utf8))
        append(UInt32(36 + bytes))
        data.append(contentsOf: Array("WAVEfmt ".utf8))
        append(UInt32(16))
        append(UInt16(1))            // PCM
        append(UInt16(2))            // stereo
        append(UInt32(rate))
        append(UInt32(rate) * 4)     // bytes per second
        append(UInt16(4))            // block align
        append(UInt16(16))           // bits per sample
        data.append(contentsOf: Array("data".utf8))
        append(UInt32(bytes))
        for i in 0..<sound.count {
            append(pcm(sound.left[i]))
            append(pcm(sound.right[i]))
        }
        return data
    }
}
