/// Typed events. `GamePresentation` turns them into effects, sounds and haptics;
/// later systems (adaptive music, replays) hook in here too.
public enum GameEvent: Sendable, Equatable {
    /// The front car of the queue drove off.
    case launched(vehicle: Int, time: Double)
    /// A tap came while the next car was still rolling up and another tap is already held
    /// for it (`PlayerQueue.heldTap`); it is ignored, so a bouncing finger sends one car.
    case tapRejected(time: Double)
    /// A player car finished its merge without touching anyone, rated and scored.
    case merged(MergeReport)
    case crash(CrashReport)
    case exited(vehicle: Int, arm: Arm)
    /// The combo changed: up after a merge, back to 0 after a crash or a cut-off.
    case comboChanged(ComboChange)
    /// The last cars of the shift: faster, denser, points ×2.
    case rushHour(time: Double)
    /// The shift is over: driven to the end, aborted by a crash, or a criminal escaped.
    case shiftEnded(ShiftResult)
    /// "WANTED": a criminal pickup will show up at `arm` in `Config.criminalWarning` seconds.
    case criminalWarning(arm: Arm, time: Double)
    /// The pickup entered; it escapes at `deadline` (shift time) unless the police stop it.
    case criminalEntered(vehicle: Int, deadline: Double)
    /// A police car stopped the criminal: the good crash.
    case takedown(TakedownReport)
    /// The countdown ran out: the pickup got away, the shift is lost.
    case criminalEscaped(vehicle: Int, time: Double)
    /// Emergency dispatch: the next car in the queue is now a police car.
    case dispatched(vehicle: Int, combo: Int)
    /// "SECURED": a money transporter will show up at `arm` in `Config.transporterWarning` seconds.
    case transporterWarning(arm: Arm, time: Double)
    /// The transporter entered; it leaves the ring at shift time `deadline` unless stopped.
    case transporterEntered(vehicle: Int, deadline: Double)
    /// A police car seized the transporter inside a secure zone: wrecked, no money.
    case transporterSeized(vehicle: Int, police: Int, point: Vec2, time: Double)
    /// The transporter was wrecked in a crash: lost, no money.
    case transporterLost(vehicle: Int, point: Vec2, time: Double)
    /// The countdown ran out: the transporter left safely and the player was paid.
    case transporterEscaped(vehicle: Int, time: Double)
    /// Money paid for a transporter, or nothing for a seized one.
    case transporterPaid(vehicle: Int?, amount: Int, time: Double)
    /// A module on the ring earned money: a lorry paid its toll, a camera caught someone.
    case modulePaid(module: RoadModule, slot: Int, amount: Int, point: Vec2, time: Double)
    /// The Perfect Chain reached `Config.flowChain`, or the flow ended with it (M6). Only
    /// feedback reacts: music, glow and haptics grow a little; nothing is shown as text.
    case flowChanged(FlowChange)
}

public struct FlowChange: Sendable, Equatable {
    public var isInFlow: Bool
    /// The Perfect Chain at that moment.
    public var chain: Int
    public var time: Double
}

public struct TakedownReport: Sendable, Equatable {
    public var criminal: Int
    public var police: Int
    public var point: Vec2
    public var time: Double
    public var points: Int
    /// Seconds that were left on the countdown.
    public var timeLeft: Double
}

public struct MergeReport: Sendable, Equatable {
    public var vehicle: Int
    /// Smallest gap during the merge in seconds, `.infinity` if the ring was empty.
    public var minGap: Double
    public var closest: Int?
    /// Free time left to the car behind when the merge ended, `.infinity` if there is none.
    public var gapBehind: Double
    public var position: Vec2
    public var time: Double
    public var rating: MergeRating
    /// Points added to the score, after multiplier and rush hour.
    public var points: Int
    /// Combo after this merge.
    public var combo: Int
    /// True if the car ended in a transporter's secure zone and shielded it (M4).
    public var shielded = false
    /// Free time left to the car ahead when the merge ended, `.infinity` if there is none.
    public var gapAhead = Double.infinity
    /// Perfect Chain after this merge (M6).
    public var chain = 0
}

public struct CrashReport: Sendable, Equatable {
    public var first: Int
    public var second: Int
    /// Where the two cars touched.
    public var point: Vec2
    public var time: Double
    /// False only if two AI cars collide, which the AI rules are built to prevent.
    public var involvesPlayer: Bool
    /// Closing speed at the contact point (world units per second): how hard the hit was.
    public var impact: Double
    /// The player's mistake: a merging player car crashed. Costs points and the combo, and a
    /// strike, or for a police car one of its `maxPoliceCrashes`. Follow-up crashes in the
    /// traffic behind cost nothing (unless `chainCrashesCostStrikes`).
    public var isStrike: Bool
    /// The mistake was a police car's: it counts as a police crash, not as a strike.
    public var isPoliceCrash: Bool
    /// A police car stopped the criminal: no strike, a reward (see `.takedown`).
    public var isTakedown: Bool
    /// Points actually taken off (never more than the score had).
    public var penalty: Int
    /// Strikes and police crashes after this crash.
    public var strikes: Int
    public var policeCrashes: Int
    /// Money the crash cost (level 20 and up, after insurance), and what the insurance paid (M7).
    public var cost = 0
    public var covered = 0
}

public struct ComboChange: Sendable, Equatable {
    public var previous: Int
    public var combo: Int
    /// Index into the combo tiers: 0 is ×1, 1 the first threshold and so on.
    public var previousTier: Int
    public var tier: Int
    public var multiplier: Double

    public var isTierUp: Bool { tier > previousTier }
}
