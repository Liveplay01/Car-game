/// All tuning values in one place. Start values from FOUNDATION.md, section 2.
///
/// Units: world units (wu), seconds, world units per second. The world has the same
/// size on every device, only the camera zooms, so timing is identical everywhere.
public struct Config: Sendable, Equatable {
    // MARK: Roundabout

    /// Places around the ring an arm can sit in, from the player's at the bottom in driving
    /// direction. The Street Builder puts arms in them (ROADMAP.md, M5).
    public var armSlotCount: Int = 16
    /// The slots that are built. Slot 0, the player's, is always there; four arms to start
    /// with, the Street Builder adds more.
    public var armSlots: [Int] = [0, 4, 8, 12]
    /// Two arms must be at least this many slots apart, so entries and exits keep their room.
    public var armSlotSpacing: Int = 2
    /// Every arm beyond the first four widens the ring by this much, so they all keep room.
    public var ringRadiusPerArm: Double = 18
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
    /// Extra time the next car needs to roll up once the launched one is a full slot ahead.
    /// 0, the default, is no cooldown: the next car follows right behind the launched one
    /// and is ready the moment that one has cleared the slot (FOUNDATION.md 2.2).
    public var queueAdvanceDuration: Double = 0
    /// Between two shifts the new cars drive up from this many slots behind, taking this long.
    public var queueFillSlots: Double = 5
    public var queueFillSeconds: Double = 1.5
    /// Between two shifts the ring speed glides to the new shift's tempo over this time.
    public var tempoGlideSeconds: Double = 1.5

    // MARK: AI traffic

    /// Cars on the road outside a shift: behind the start screen and in tests.
    public var freePlayDensity: Int = 5
    /// AI only enters with at least this much free time to the car ahead and behind.
    public var aiSafeGap: Double = 0.25
    /// While driving its entry path the AI keeps at least this much distance (seconds) to everyone.
    public var aiPathClearance: Double = 0.1
    /// Pause between two AI spawns.
    public var aiSpawnDelay: ClosedRange<Double> = 0.4...1.2
    /// An AI car waits this long at its stop line before it looks for a gap.
    public var aiReaction: ClosedRange<Double> = 0.2...0.8
    /// New cars appear this far behind their stop line, outside the picture, and drive up,
    /// braking at this share of g.
    public var aiApproachDistance: Double = 300
    public var aiApproachBrake: Double = 1
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
    /// Near Miss (ROADMAP.md, M6): closer than this, but no Tight Fit. "That was close."
    public var nearMissSeconds: Double = 0.2
    /// Perfect Input (M6): the car lands in the middle of its gap. The gaps ahead and behind
    /// may differ by at most this share of their sum, both at least `nearMissSeconds`…
    public var perfectBalance: Double = 0.25
    /// …and together at most this long: centring a car in an empty ring is no feat.
    public var perfectMaxGap: Double = 2

    // MARK: Scoring (FOUNDATION.md 2.3, 2.4)

    public var pointsClean: Int = 100
    public var pointsTightFit: Int = 200
    public var pointsNearMiss: Int = 125
    public var pointsPerfect: Int = 150
    public var comboClean: Int = 1
    public var comboTightFit: Int = 2
    public var comboNearMiss: Int = 1
    public var comboPerfect: Int = 1

    // MARK: Perfect Chain and Flow State (IDEA.md; ROADMAP.md, M6)

    /// Good actions in a row (Perfect Input, Near Miss, Tight Fit, takedown, a transporter
    /// paid) build the chain; a plain clean merge, a cut-off or a crash ends it. From this
    /// length on the player is in the flow: the feedback grows, nothing else changes.
    public var flowChain: Int = 5
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
    /// Share of shifts with criminals at all.
    public var criminalChance: Double = 1
    /// Shift time of the first criminal warning, and the pause after one is caught.
    public var criminalFirst: ClosedRange<Double> = 4...8
    public var criminalInterval: ClosedRange<Double> = 10...16
    /// "WANTED" warning before the pickup shows up at its arm.
    public var criminalWarning: Double = 2
    /// From the pickup's entry until it escapes and the shift is lost. One lap takes ~6 s,
    /// so it passes the player's entry about twice. Once your last car is in, it no longer
    /// counts: the shift is done.
    public var criminalTime: Double = 12
    /// Points for a takedown, times combo multiplier and rush hour.
    public var takedownPoints: Int = 1000
    /// Mass of the pickup relative to a car once a police car stops it. Anything else
    /// bounces off it: only the police can stop a criminal.
    public var criminalMass: Double = 2.5
    /// Emergency dispatch turns the next car into a police car and multiplies the combo by this.
    public var dispatchComboFactor: Double = 0.5
    /// A police car directly behind the criminal on the ring speeds up to this share of the
    /// ring speed and rams it (`Drivers.swift`). It keeps circling while it chases.
    public var policeChaseSpeedFactor: Double = 1.4

    // MARK: Money transporter (ROADMAP.md, M4)

    /// Time until the first transporter appears, and the pause after one is dealt with.
    public var transporterFirst: ClosedRange<Double> = 8...14
    public var transporterInterval: ClosedRange<Double> = 15...25
    /// "SECURED": warning before the transporter shows up at its arm.
    public var transporterWarning: Double = 2
    /// From the transporter's entry until it leaves the ring safely. One lap takes ~6 s,
    /// so it passes the player's entry about twice. If your last car is in before, it is
    /// paid right away.
    public var transporterTime: Double = 10
    /// Arc along the ring, fore and aft of the transporter, that is a "secure zone".
    /// A police car inside either zone holds it; normal cars shield it and earn a bonus.
    public var transporterSecureArc: Double = 130
    /// Money for a transporter that leaves safely, times rush hour.
    public var transporterPay: Int = 800
    /// Bonus for a normal car standing in a secure zone while the transporter passes.
    public var shieldBonus: Int = 100
    /// Money for a transporter captured by a police car (it is seized, no money).
    public var transporterSeized: Int = 0
    /// Mass of the transporter relative to a car: heavy, but a crash wrecks it like any car,
    /// and its money is lost.
    public var transporterMass: Double = 1.6

    // MARK: Ring modules and trucks (FOUNDATION.md 2.9)

    /// Slots for modules around the ring. A fixed number: once they are full, a module is
    /// swapped for another, never added.
    public var moduleSlotCount: Int = 6
    /// The modules in play, by slot. Set from the career (`Career.config`).
    public var modules: [Int: RoadModule] = [:]
    /// Share of normal traffic that is a lorry.
    public var truckChance: Double = 0.22
    /// A lorry is longer than a car — harder to slip in front of, and it blocks more.
    public var truckLength: Double = 36
    /// And heavier: it pushes what it hits out of the way.
    public var truckMass: Double = 2.2
    /// What a lorry pays at a toll booth.
    public var tollPerTruck: Int = 120
    /// How far around the booth traffic is held back, and how fast it may still go there.
    public var tollZoneArc: Double = 150
    public var tollSpeedFactor: Double = 0.55
    /// What a car over the limit pays.
    public var cameraFine: Int = 45
    /// The camera only earns above this share of the base ring speed: a calm shift pays
    /// nothing, rush hour pays with every car.
    public var cameraLimitFactor: Double = 1.08
    /// Short and sharp: everyone snatches at the brakes right at the camera.
    public var cameraZoneArc: Double = 44
    public var cameraSpeedFactor: Double = 0.7
    public var tollBoothCost: Int = 8_000
    public var speedCameraCost: Int = 12_000

    // MARK: Strikes (FOUNDATION.md 2.6)

    /// Crashes of normal cars that end the shift. 1, the default, is the classic hard
    /// "Car Circle" mode: your first normal crash is game over. 3 is the soft variant.
    public var maxStrikes: Int = 1
    /// Crashes of police cars a shift survives; the next one ends it. They cost points and
    /// the combo, but no strike.
    public var maxPoliceCrashes: Int = 3

    // MARK: Shift (FOUNDATION.md 2.5)

    /// Cars the player has to bring into traffic. There is no clock: the shift is done once
    /// the last one is in. Set per shift from the level (`forLevel`); a good player needs
    /// about 20 s for 15 cars.
    public var shiftCars: Int = 15
    /// The last this-many cars are rush hour: faster, denser, points ×2.
    public var rushHourCars: Int = 4
    /// Density and tempo rise from their start to their end values over this time, and
    /// stay there: whoever waits for the perfect gap gets more traffic, not an easier one.
    public var rampSeconds: Double = 20
    /// Cars on the road (ring, merging, waiting) at the start and at the end of the ramp.
    public var densityStart: Int = 6
    public var densityEnd: Int = 10
    public var rushHourDensityBonus: Int = 2
    /// Tempo (share of `ringSpeed`) at the start and at the end of the ramp.
    public var tempoStart: Double = 1.05
    public var tempoEnd: Double = 1.2
    public var rushHourTempo: Double = 1.35
    /// Time over which the tempo rises to `rushHourTempo`, so the jump stays readable.
    public var rushHourRamp: Double = 1
    /// Points for merges during rush hour are multiplied by this.
    public var rushHourScoreFactor: Double = 2

    // MARK: Levels (ROADMAP.md, M5; `Levels.swift`)

    /// From this level on, the traffic values of this file apply in full: properly hard.
    /// Below it they are eased towards the level 1 values, so you get into the game.
    public var hardLevel: Int = 5
    /// Cars per shift: about `levelOneCars` at level 1 and `carsPerLevel` more per level,
    /// up to `maxShiftCars`. Every attempt draws a count within ± `shiftCarsSpread`.
    public var levelOneCars: Int = 10
    public var carsPerLevel: Double = 1.1
    public var shiftCarsSpread: Int = 2
    public var maxShiftCars: Int = 30
    /// Level 1 traffic: fewer and slower cars, wider AI gaps, a longer chase, more police.
    public var easyDensityStart: Int = 3
    public var easyDensityEnd: Int = 6
    public var easyTempoStart: Double = 0.95
    public var easyTempoEnd: Double = 1.05
    public var easyRushHourTempo: Double = 1.2
    public var easyAiSafeGap: Double = 0.4
    public var easyCriminalTime: Double = 16
    public var easyPoliceShare: Double = 0.3
    /// Beyond `hardLevel`, per level: faster, up to `maxLevelTempoBonus` on every tempo,
    /// and a shorter chase, down to `minCriminalTime`.
    public var tempoPerLevel: Double = 0.01
    public var maxLevelTempoBonus: Double = 0.4
    public var criminalTimePerLevel: Double = 0.25
    public var minCriminalTime: Double = 8

    // MARK: Duty (IDEA.md: push your luck; ROADMAP.md, M5)

    /// High Alert: this many cars more to bring in, a chase this much shorter (never below
    /// `minCriminalTime`) and a criminal in every shift. The traffic itself stays as the
    /// level has it: denser or faster traffic on top of a high level made those levels
    /// unplayable rather than riskier. Criminals closer together (a factor below 1) did the
    /// same — it turned high levels into one long chase — so that one stays at 1.
    public var highAlertCars: Double = 1.15
    public var highAlertCriminalTime: Double = 0.8
    public var highAlertCriminalInterval: Double = 1
    public var highAlertPay: Double = 3

    // MARK: Money and upgrades (ROADMAP.md, M5; `Upgrades.swift`)

    /// Money for a completed shift; set per level by `forLevel`: `shiftPayBase` plus
    /// `shiftPayPerLevel` for every level.
    public var shiftPay: Int = 260
    public var shiftPayBase: Int = 200
    public var shiftPayPerLevel: Int = 60
    /// Price of the first arm the Street Builder adds; every further one costs
    /// `armCostGrowth` times as much.
    public var armBaseCost: Int = 25_000
    public var armCostGrowth: Double = 2
    /// Every arm beyond the first four brings this much more traffic and this much more pay,
    /// and lets transporters come this much sooner (IDEA.md: a bigger map spawns more bots).
    public var trafficPerArm: Double = 0.25
    public var payPerArm: Double = 0.3
    public var transporterPerArm: Double = 0.15
    /// Price of an upgrade's first step (times its price factor); every further step costs
    /// `upgradeCostGrowth` times as much.
    public var upgradeBaseCost: Int = 2000
    public var upgradeCostGrowth: Double = 1.5
    /// What one step of each upgrade does.
    public var patrolsPerStep: Double = 0.03
    public var pursuitPerStep: Double = 1
    public var quietStreetsPerStep: Double = 0.1
    public var interceptorPerStep: Double = 0.1
    public var dispatchRadioPerStep: Double = 0.1
    public var backupPerStep: Int = 1
    public var cashRoutePerStep: Double = 1
    public var overtimePerStep: Double = 0.2
    /// Insurance and Robbery Insurance: this much less of a cost per step; 7 steps cover it all.
    public var insurancePerStep: Double = 0.15
    /// Freight: this much more lorry traffic per step (more tolls, denser traffic).
    public var freightPerStep: Double = 0.03
    /// Double Run: this much more chance per step of a second transporter right after one.
    public var doubleRunPerStep: Double = 0.1

    // MARK: Risk and insurance (IDEA.md: Crash-Economy, Financial Loss; ROADMAP.md, M7)

    /// The level this shift is played at; set by `forLevel`.
    public var level: Int = 1
    /// From this level on, crashes and escapes cost money. Below it, mistakes are free.
    public var crashCostLevel: Int = 20
    /// What the player's crash costs, by how hard it was: below the first impact (wu/s) the
    /// first cost, and so on. A follow-up crash in the traffic costs nothing.
    public var crashCosts: [Int] = [60, 120, 200]
    public var crashCostImpacts: [Double] = [80, 140]
    /// What an escaped criminal costs on top of the lost shift.
    public var escapeLoss: Int = 350
    /// Share of crash costs and escape losses the insurances pay (0…1); set by the upgrades.
    public var crashInsurance: Double = 0
    public var robberyInsurance: Double = 0
    /// Chance that a second transporter follows a paid one, and how soon.
    public var doubleRunChance: Double = 0
    public var doubleRunDelay: ClosedRange<Double> = 2...3

    // MARK: Weather (IDEA.md: the third difficulty axis; ROADMAP.md, M8; `Weather.swift`)

    /// This shift's weather; drawn per shift by the career (`Career.config`).
    public var weather: Weather = .clear
    /// The first level each kind of weather can come at.
    public var lightRainLevel: Int = 6
    public var heavyRainLevel: Int = 12
    public var stormLevel: Int = 18
    public var extremeLevel: Int = 25
    /// Chance of bad weather: this much more per level from `lightRainLevel` on, up to a limit.
    public var badWeatherPerLevel: Double = 0.03
    public var maxBadWeatherChance: Double = 0.6
    /// Per step of weather (light rain 1 … extreme 4): tyre grip lost, driver reaction added
    /// (seconds), braking lost, and from heavy rain on cars added.
    public var weatherGripLoss: Double = 0.15
    public var weatherReactionDelay: Double = 0.1
    public var weatherBrakeLoss: Double = 0.1
    public var weatherDensityPerStep: Int = 1
    /// In a storm the AI squeezes into gaps this much smaller.
    public var stormAiGapFactor: Double = 0.8

    // MARK: City events (IDEA.md; ROADMAP.md, M8; `CityEvents.swift`)

    /// This shift's event, if any; drawn per shift by the career.
    public var cityEvent: CityEvent?
    /// From this level on, a shift has an event with this chance.
    public var cityEventLevel: Int = 4
    public var cityEventChance: Double = 0.25
    /// Roadworks: where on the ring (share of a lap), how long a stretch, and how fast.
    public var roadworksAt: Double = 0
    public var roadworksArc: Double = 110
    public var roadworksSpeedFactor: Double = 0.6
    /// Road closure: the slot of the closed AI arm.
    public var closedArmSlot: Int?
    /// Concert: this many more cars, and AI spawns this much quicker.
    public var concertDensityBonus: Int = 2
    public var concertSpawnFactor: Double = 0.5
    /// VIP convoy: the AI keeps gaps this much longer.
    public var vipGapFactor: Double = 1.6
    /// Police operation: this much more police in the queue.
    public var policeOperationShare: Double = 0.15

    // MARK: Late levels (ROADMAP.md, M7: level 14 felt too easy)

    /// From this level on the traffic gets denser, by this many cars per level, up to a limit.
    public var lateLevel: Int = 10
    public var lateDensityPerLevel: Double = 0.2
    public var maxLateDensityBonus: Int = 3

    public init() {}

    /// The slots that carry an arm: sorted in driving order, the player's first, and only
    /// the ones far enough apart (`armSlotSpacing`).
    public var builtArmSlots: [Int] {
        var built = [0]
        for slot in armSlots.sorted() where slot != 0 {
            guard slot > 0, slot < max(3, armSlotCount) else { continue }
            if built.allSatisfy({ Self.slotDistance($0, slot, slots: armSlotCount) >= armSlotSpacing }) {
                built.append(slot)
            }
        }
        return built
    }

    /// How many slots apart two slots are, the short way round.
    public static func slotDistance(_ a: Int, _ b: Int, slots: Int) -> Int {
        let slots = max(3, slots)
        let raw = abs(a - b) % slots
        return min(raw, slots - raw)
    }

    /// 9.81 m/s² in world units per second².
    public var gravity: Double { 9.81 * carLength / carLengthMeters }
    /// Length of every entry path. Chosen so that a merge at 100 % tempo drives at constant speed.
    public var mergePathLength: Double { ringSpeed * mergeDuration }
}
