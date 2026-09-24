import Foundation

/// Writes the placeholder sound effects to `Assets/Sounds` (16-bit mono WAV, 44.1 kHz).
///
///     cd TestWindow; swift run SoundMaker
///
/// Simple synthesis, deterministic, so the files can be rebuilt any time. Quiet and short on
/// purpose: the more often a sound plays, the less it does (FOUNDATION.md 3). The final
/// sounds come with the look & feel pass (M11), under the same file names.
@main
struct SoundMaker {
    static let rate = 44_100.0

    static func main() throws {
        let folder = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Assets").appendingPathComponent("Sounds")
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        // Name, samples and peak level: the frequent merge tick stays far below everything else.
        let sounds: [(String, [Double], Double)] = [
            ("merge", merge(), 0.14),
            ("tightFit", tightFit(), 0.55),
            ("nearMiss", nearMiss(), 0.28),
            ("perfect", perfect(), 0.4),
            ("cutOff", cutOff(), 0.3),
            ("comboUp", comboUp(), 0.4),
            ("crash", crash(), 0.7),
            ("rushHour", rushHour(), 0.35),
            ("shiftComplete", shiftComplete(), 0.45),
            ("shiftFailed", shiftFailed(), 0.35),
            ("wanted", wanted(), 0.4),
            ("takedown", takedown(), 0.6),
            ("dispatch", dispatch(), 0.35),
            ("escaped", escaped(), 0.45),
            ("secured", secured(), 0.35),
            ("paid", paid(), 0.45),
            ("seized", seized(), 0.45),
        ]
        for (name, samples, peak) in sounds {
            let url = folder.appendingPathComponent("\(name).wav")
            try wav(normalized(samples, peak: peak)).write(to: url)
            print(String(format: "%@  %.2f s", url.lastPathComponent, Double(samples.count) / rate))
        }
    }

    // MARK: - Sounds

    /// Clean merge, ~100 times a shift: a soft, short tick.
    static func merge() -> [Double] {
        render(0.06) { t in sine(1_320, t) * decay(t, 0.012) * 0.16 }
    }

    /// Near Miss (M6): a shorter, softer swoosh than the Tight Fit's, without the click.
    static func nearMiss() -> [Double] {
        var noise = Noise(seed: 7)
        var filter = BandPass()
        return render(0.14) { t in
            let x = t / 0.14
            return filter.process(noise.next(), center: 1_400 + 2_400 * x, q: 4) * sin(.pi * x) * 0.4
        }
    }

    /// Perfect Input (M6): a small, clean two-tone click — precise, not loud.
    static func perfect() -> [Double] {
        render(0.12) { t in
            let first = sine(1_760, t) * decay(t, 0.018) * 0.35
            let second = t > 0.045 ? sine(2_637, t) * decay(t - 0.045, 0.025) * 0.3 : 0
            return first + second
        }
    }

    /// Tight Fit: a short airy swoosh that rises, then a bright click on top.
    static func tightFit() -> [Double] {
        var noise = Noise(seed: 1)
        var filter = BandPass()
        return render(0.24) { t in
            let x = t / 0.24
            let swoosh = filter.process(noise.next(), center: 900 + 4_200 * x, q: 3.5) * sin(.pi * min(x * 1.3, 1)) * 0.55
            let click = t > 0.14 ? sine(2_640, t) * decay(t - 0.14, 0.02) * 0.3 : 0
            return swoosh + click
        }
    }

    /// Cut off: two low, dull blips going down.
    static func cutOff() -> [Double] {
        render(0.2) { t in
            let first = triangle(392, t) * envelope(t, attack: 0.004, hold: 0.05, release: 0.03)
            let second = t > 0.09 ? triangle(311, t) * envelope(t - 0.09, attack: 0.004, hold: 0.06, release: 0.04) : 0
            return (first + second) * 0.22
        }
    }

    /// New combo tier: three rising bell notes.
    static func comboUp() -> [Double] {
        let notes = [659.25, 830.61, 987.77]
        return render(0.42) { t in
            notes.enumerated().reduce(0) { sum, note in
                let start = Double(note.offset) * 0.06
                return t < start ? sum : sum + bell(note.element, t - start) * 0.18
            }
        }
    }

    /// Crash: a dull thump under a short burst of noise.
    static func crash() -> [Double] {
        var noise = Noise(seed: 7)
        var low = LowPass()
        return render(0.45) { t in
            let thump = sine(70 - 30 * min(t / 0.2, 1), t) * decay(t, 0.09) * 0.7
            let burst = low.process(noise.next(), cutoff: 2_400 - 1_800 * min(t / 0.3, 1)) * decay(t, 0.08) * 0.8
            return thump + burst
        }
    }

    /// Rush hour: a rising two-tone sweep that pulses.
    static func rushHour() -> [Double] {
        var phase = 0.0
        return render(0.7) { t in
            let x = t / 0.7
            let frequency = 330 + 550 * x * x
            phase += frequency / rate
            let tone = sin(2 * .pi * phase) + 0.35 * sin(4 * .pi * phase)
            let pulse = 0.6 + 0.4 * sin(2 * .pi * 9 * t)
            return tone * pulse * envelope(t, attack: 0.03, hold: 0.55, release: 0.12) * 0.22
        }
    }

    /// Shift complete: a major arpeggio that rings out.
    static func shiftComplete() -> [Double] {
        let notes = [523.25, 659.25, 783.99, 1_046.5]
        return render(1.2) { t in
            notes.enumerated().reduce(0) { sum, note in
                let start = Double(note.offset) * 0.11
                return t < start ? sum : sum + bell(note.element, t - start, length: 0.35) * 0.16
            }
        }
    }

    /// Shift aborted: two soft notes going down a minor third.
    static func shiftFailed() -> [Double] {
        render(0.8) { t in
            let first = triangle(392, t) * envelope(t, attack: 0.01, hold: 0.18, release: 0.1)
            let second = t > 0.24 ? triangle(329.63, t) * envelope(t - 0.24, attack: 0.01, hold: 0.25, release: 0.25) : 0
            return (first + second) * 0.25
        }
    }

    /// A criminal is coming: two quick rounds of a two-tone siren.
    static func wanted() -> [Double] {
        var phase = 0.0
        return render(0.9) { t in
            let high = Int(t / 0.225) % 2 == 0
            let frequency = high ? 960.0 : 720.0
            phase += frequency / rate
            let tone = sin(2 * .pi * phase) + 0.25 * sin(6 * .pi * phase)
            return tone * envelope(t, attack: 0.02, hold: 0.8, release: 0.08) * 0.2
        }
    }

    /// The good crash: a heavy thump, then a bright rising double chime.
    static func takedown() -> [Double] {
        let notes = [783.99, 1_174.66]
        return render(0.7) { t in
            let thump = sine(58, t) * decay(t, 0.08) * 0.8
            let chime = notes.enumerated().reduce(0) { sum, note in
                let start = 0.06 + Double(note.offset) * 0.09
                return t < start ? sum : sum + bell(note.element, t - start, length: 0.25) * 0.3
            }
            return thump + chime
        }
    }

    /// Emergency dispatch: one short siren whoop going up.
    static func dispatch() -> [Double] {
        var phase = 0.0
        return render(0.35) { t in
            let x = t / 0.35
            phase += (500 + 700 * x) / rate
            return sin(2 * .pi * phase) * envelope(t, attack: 0.01, hold: 0.26, release: 0.08) * 0.25
        }
    }

    /// The criminal got away: a siren sinking and fading into the distance.
    static func escaped() -> [Double] {
        var phase = 0.0
        return render(1.1) { t in
            let x = t / 1.1
            let wobble = Int(t / 0.18) % 2 == 0 ? 1.0 : 0.8
            phase += (820 - 420 * x) * wobble / rate
            return sin(2 * .pi * phase) * (1 - x) * envelope(t, attack: 0.02, hold: 1, release: 0.08) * 0.25
        }
    }

    /// A money transporter is coming: a calm two-tone chime, twice. Not a siren, so it
    /// never sounds like "WANTED".
    static func secured() -> [Double] {
        let notes = [659.25, 523.25, 659.25, 523.25]
        return render(0.95) { t in
            notes.enumerated().reduce(0) { sum, note in
                let start = Double(note.offset) * 0.2
                return t < start ? sum : sum + bell(note.element, t - start, length: 0.3) * 0.3
            }
        }
    }

    /// The transporter left safely: a bright cash-register ding with a coin shimmer.
    static func paid() -> [Double] {
        let notes = [1_046.5, 1_567.98]
        return render(0.6) { t in
            let ding = notes.enumerated().reduce(0) { sum, note in
                let start = Double(note.offset) * 0.07
                return t < start ? sum : sum + bell(note.element, t - start, length: 0.3) * 0.35
            }
            let shimmer = sine(3_520, t) * sine(29, t) * decay(t - 0.1, 0.12) * (t < 0.1 ? 0 : 0.08)
            return ding + shimmer
        }
    }

    /// The police seized the transporter: a thump and a falling "denied" tone.
    static func seized() -> [Double] {
        var phase = 0.0
        return render(0.7) { t in
            let thump = sine(62, t) * decay(t, 0.07) * 0.7
            let x = min(t / 0.6, 1)
            phase += (440 - 180 * x) / rate
            let tone = (sin(2 * .pi * phase) + 0.3 * sin(4 * .pi * phase)) * envelope(t, attack: 0.03, hold: 0.45, release: 0.2) * 0.22
            return thump + tone
        }
    }

    // MARK: - Building blocks

    static func render(_ seconds: Double, _ sample: (Double) -> Double) -> [Double] {
        let count = Int(seconds * rate)
        var samples = (0..<count).map { sample(Double($0) / rate) }
        // 3 ms fade at both ends: no clicks.
        let fade = Int(0.003 * rate)
        for i in 0..<min(fade, count) {
            let gain = Double(i) / Double(fade)
            samples[i] *= gain
            samples[count - 1 - i] *= gain
        }
        return samples
    }

    static func normalized(_ samples: [Double], peak: Double) -> [Double] {
        let current = samples.map(abs).max() ?? 0
        return current > 0 ? samples.map { $0 * peak / current } : samples
    }

    static func sine(_ frequency: Double, _ t: Double) -> Double { sin(2 * .pi * frequency * t) }

    static func triangle(_ frequency: Double, _ t: Double) -> Double {
        let x = (frequency * t).truncatingRemainder(dividingBy: 1)
        return 4 * abs(x - 0.5) - 1
    }

    /// Exponential decay with time constant `tau`.
    static func decay(_ t: Double, _ tau: Double) -> Double { t < 0 ? 0 : exp(-t / tau) }

    static func envelope(_ t: Double, attack: Double, hold: Double, release: Double) -> Double {
        if t < 0 { return 0 }
        if t < attack { return t / attack }
        if t < attack + hold { return 1 }
        return max(0, 1 - (t - attack - hold) / release)
    }

    /// A soft bell: fundamental plus a quiet, faster-decaying overtone.
    static func bell(_ frequency: Double, _ t: Double, length: Double = 0.18) -> Double {
        let attack = min(t / 0.004, 1)
        return attack * (sine(frequency, t) * decay(t, length) + 0.3 * sine(frequency * 2.01, t) * decay(t, length / 3))
    }

    struct Noise {
        var state: UInt64
        init(seed: UInt64) { state = seed }
        mutating func next() -> Double {
            state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
            return Double(state >> 11) * 0x1.0p-53 * 2 - 1
        }
    }

    struct LowPass {
        var value = 0.0
        mutating func process(_ input: Double, cutoff: Double) -> Double {
            let alpha = 1 - exp(-2 * .pi * cutoff / SoundMaker.rate)
            value += alpha * (input - value)
            return value
        }
    }

    /// State-variable band-pass filter.
    struct BandPass {
        var low = 0.0
        var band = 0.0
        mutating func process(_ input: Double, center: Double, q: Double) -> Double {
            let f = 2 * sin(.pi * min(center, SoundMaker.rate / 6) / SoundMaker.rate)
            low += f * band
            let high = input - low - band / q
            band += f * high
            return band
        }
    }

    // MARK: - WAV

    static func wav(_ samples: [Double]) -> Data {
        var data = Data()
        func append<T: FixedWidthInteger>(_ value: T) {
            withUnsafeBytes(of: value.littleEndian) { data.append(contentsOf: $0) }
        }
        let bytes = samples.count * 2
        data.append(contentsOf: Array("RIFF".utf8))
        append(UInt32(36 + bytes))
        data.append(contentsOf: Array("WAVEfmt ".utf8))
        append(UInt32(16))
        append(UInt16(1))            // PCM
        append(UInt16(1))            // mono
        append(UInt32(rate))
        append(UInt32(rate) * 2)     // bytes per second
        append(UInt16(2))            // block align
        append(UInt16(16))           // bits per sample
        data.append(contentsOf: Array("data".utf8))
        append(UInt32(bytes))
        for sample in samples {
            append(Int16((min(max(sample, -1), 1) * 32_767).rounded()))
        }
        return data
    }
}
