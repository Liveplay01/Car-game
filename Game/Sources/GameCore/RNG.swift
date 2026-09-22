/// Deterministic random numbers (SplitMix64).
///
/// Same seed → same sequence on every platform. Deliberately independent of the
/// standard library's own random algorithms, which may differ between Swift versions,
/// so a seed noted on Windows replays the same shift on the iPhone.
/// Where the seed comes from (clock, `--seed`, fixed in tests) is the platform's choice.
public struct SeededRandom: RandomNumberGenerator, Sendable, Equatable {
    private var state: UInt64

    public init(seed: UInt64) {
        state = seed
    }

    public mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    /// Uniform in [0, 1).
    public mutating func unit() -> Double {
        Double(next() >> 11) * 0x1.0p-53
    }

    public mutating func double(in range: ClosedRange<Double>) -> Double {
        range.lowerBound + (range.upperBound - range.lowerBound) * unit()
    }

    public mutating func int(in range: ClosedRange<Int>) -> Int {
        range.lowerBound + Int(next() % UInt64(range.count))
    }

    public mutating func pick<T>(_ items: [T]) -> T {
        precondition(!items.isEmpty, "pick from an empty list")
        return items[int(in: 0...(items.count - 1))]
    }
}
