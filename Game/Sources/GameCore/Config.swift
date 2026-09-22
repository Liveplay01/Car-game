/// All tuning values in one place. Start values from FOUNDATION.md, section 2.
///
/// Units: world units (wu), seconds, world units per second. The world has the same
/// size on every device, only the camera zooms, so timing is identical everywhere.
public struct Config: Sendable, Equatable {
    // MARK: Roundabout

    /// Radius of the ring lane's centre line. At `ringSpeed` one lap takes ~6.9 s.
    public var ringRadius: Double = 120
    /// Width of one lane. The ring has one lane, the arms two.
    public var laneWidth: Double = 24
    /// Angle past its arm at which an entry path meets the ring (radians).
    /// Exits leave the same angle before their arm.
    public var mergeAngle: Double = 0.26

    // MARK: Vehicles

    public var carLength: Double = 24
    public var carWidth: Double = 13

    // MARK: Motion

    /// Ring speed at 100 % tempo.
    public var ringSpeed: Double = 110
    /// Every merge takes exactly this long and ends at ring speed (FOUNDATION.md 2.2).
    public var mergeDuration: Double = 0.5

    // MARK: Player queue

    /// Distance between queued cars, centre to centre.
    public var queueSpacing: Double = 32
    /// Cars visible in the queue on a regular iPhone (the camera fits this many).
    public var queueVisible: Int = 4
    /// Time the next car needs to roll up to the stop line.
    public var queueAdvanceDuration: Double = 0.2

    // MARK: AI traffic

    /// Cars on the road outside a shift: behind the start screen and in tests.
    public var freePlayDensity: Int = 5
    /// AI only enters with at least this much free time to the car ahead and behind.
    public var aiSafeGap: Double = 0.35
    /// While driving its entry path the AI keeps at least this much distance (seconds) to everyone.
    public var aiPathClearance: Double = 0.1
    /// Pause between two AI spawns.
    public var aiSpawnDelay: ClosedRange<Double> = 0.4...1.2
    /// An AI car waits this long at its stop line before it looks for a gap.
    public var aiReaction: ClosedRange<Double> = 0.2...0.8
    /// Every car leaves the ring 1–3 arms after the one it came from (never South).
    public var exitArmsAhead: ClosedRange<Int> = 1...3

    // MARK: Crash physics (FOUNDATION.md 2.6, `CrashPhysics`)

    /// Wrecks skid, spin out and disappear within this time. They never touch live traffic again.
    public var crashDuration: Double = 2.2
    /// Share of the closing speed that bounces back; the rest goes into the crumple zones.
    public var crashRestitution: Double = 0.3
    /// Friction between two car bodies scraping along each other.
    public var crashFriction: Double = 0.4
    /// Tyre grip of a skidding wreck as a share of g: braking along the car, grip across it.
    public var tireGripBrake: Double = 0.8
    public var tireGripSide: Double = 1.0
    /// Real length of a car in metres; scales gravity into world units.
    public var carLengthMeters: Double = 4.5
    /// Crumple depth per unit of closing speed, and the deepest dent (world units).
    public var dentPerImpact: Double = 0.05
    public var maxDent: Double = 6

    // MARK: Drivers (`Drivers.swift`)

    /// Time a driver needs to react to a surprise ahead; every driver is a little different.
    /// Real brake reaction times lie around 0.5–1.5 s.
    public var driverReaction: ClosedRange<Double> = 0.5...1.5
    /// Hardest braking and the acceleration back into the flow (share of g).
    public var driverBrake: Double = 0.9
    public var driverAcceleration: Double = 0.4
    /// Room (surface to surface) drivers leave when they stop behind something.
    public var stopGap: Double = 6
    /// A driver reacts once keeping the speed would need at least this much braking (share of g).
    public var hazardBraking: Double = 0.05
    /// Follow-up crashes are the consequence of one mistake: by default only a crash of the
    /// player's own merge costs a strike.
    public var chainCrashesCostStrikes = false
    /// A player car stays the player's responsibility this long after its merge: merging
    /// into a visible pile-up is a mistake, not a free merge.
    public var mergeResponsibility: Double = 1

    // MARK: Rating (FOUNDATION.md 2.3)

    /// A merge closer than this (seconds, surface to surface) is a Tight Fit.
    public var tightFitSeconds: Double = 0.12
    /// "Cut off!": the car behind is left less than this (seconds) when the merge ends.
    /// Resets the combo, costs no strike. 0 = off, the default; decided in the playtest.
    public var sloppyWindow: Double = 0

    // MARK: Scoring (FOUNDATION.md 2.3, 2.4)

    public var pointsClean: Int = 100
    public var pointsTightFit: Int = 200
    public var comboClean: Int = 1
    public var comboTightFit: Int = 2
    /// Taken off the score per crash, never below 0.
    public var crashPenalty: Int = 250
    /// For a shift driven to the end.
    public var completionBonus: Int = 1000
    /// Combo from which each multiplier applies, ascending. Below the first one: ×1.
    public var comboThresholds: [Int] = [5, 10, 20]
    public var comboMultipliers: [Double] = [1.5, 2, 3]

    // MARK: Police and criminals (ROADMAP.md, M3)

    /// Share of police cars in the player's queue.
    public var policeShare: Double = 0.2
    /// Shift time of the first criminal warning, and the pause after one is caught.
    public var criminalFirst: ClosedRange<Double> = 15...25
    public var criminalInterval: ClosedRange<Double> = 18...30
    /// "WANTED" warning before the pickup shows up at its arm.
    public var criminalWarning: Double = 2
    /// From the pickup's entry until it escapes and the shift is lost. One lap takes ~7 s,
    /// so it passes the player's entry about twice.
    public var criminalTime: Double = 15
    /// Points for a takedown, times combo multiplier and rush hour.
    public var takedownPoints: Int = 1000
    /// Mass of the pickup relative to a car once a police car stops it. Anything else
    /// bounces off it: only the police can stop a criminal.
    public var criminalMass: Double = 2.5
    /// Emergency dispatch turns the next car into a police car and multiplies the combo by this.
    public var dispatchComboFactor: Double = 0.5

    // MARK: Money transporter (ROADMAP.md, M4)

    /// Time until the first transporter appears, and the pause after one is dealt with.
    public var transporterFirst: ClosedRange<Double> = 25...40
    public var transporterInterval: ClosedRange<Double> = 30...50
    /// "SECURED": warning before the transporter shows up at its arm.
    public var transporterWarning: Double = 2
    /// From the transporter's entry until it leaves the ring safely. One lap takes ~7 s,
    /// so it passes the player's entry about twice.
    public var transporterTime: Double = 14
    /// Arc along the ring, fore and aft of the transporter, that is a "secure zone".
    /// A police car inside either zone holds it; normal cars shield it and earn a bonus.
    public var transporterSecureArc: Double = 130
    /// Money for a transporter that leaves safely, times rush hour.
    public var transporterPay: Int = 2500
    /// Bonus for a normal car standing in a secure zone while the transporter passes.
    public var shieldBonus: Int = 500
/// Money for a transporter captured by a police car (it is seized, no money).
    public var transporterSeized: Int = 0
    /// Mass of the transporter relative to a car. Heavier than a normal car, so ramming it
    /// costs the player a proper crash.
    public var transporterMass: Double = 1.6

    // MARK: Strikes (FOUNDATION.md 2.6)

    /// The shift is aborted at this many crashes. 1 is the classic hard "Car Circle" mode.
    public var maxStrikes: Int = 3

    // MARK: Shift (FOUNDATION.md 2.5)

    public var shiftSeconds: Double = 120
    /// The last this-many seconds of a shift are rush hour.
    public var rushHourSeconds: Double = 20
    /// Cars on the road (ring, merging, waiting) at the start and at the end of the build-up.
    public var densityStart: Int = 3
    public var densityEnd: Int = 7
    public var rushHourDensityBonus: Int = 2
    /// Tempo (share of `ringSpeed`) at the start and at the end of the build-up.
    public var tempoStart: Double = 1
    public var tempoEnd: Double = 1.1
    public var rushHourTempo: Double = 1.25
    /// Time over which the tempo rises to `rushHourTempo`, so the jump stays readable.
    public var rushHourRamp: Double = 1
    /// Points for merges during rush hour are multiplied by this.
    public var rushHourScoreFactor: Double = 2

    public init() {}

    /// 9.81 m/s² in world units per second².
    public var gravity: Double { 9.81 * carLength / carLengthMeters }
    /// Length of every entry path. Chosen so that a merge at 100 % tempo drives at constant speed.
    public var mergePathLength: Double { ringSpeed * mergeDuration }
    /// Shift time at which rush hour begins.
    public var rushHourStart: Double { max(0, shiftSeconds - rushHourSeconds) }
}
