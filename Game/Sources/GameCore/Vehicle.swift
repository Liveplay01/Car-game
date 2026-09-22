/// Vehicle types (FOUNDATION.md 4.6). The money transporter and trucks dock here later.
public enum VehicleType: Sendable, Equatable {
    case car
    /// From the player's queue: the only car that can stop a criminal.
    case police
    /// The criminal: heavy, ignores hazards, only a police car stops it.
    case pickup
    /// A money transporter: appears at an AI arm, marked, with exclusion zones
    /// fore and aft on the ring. Only a police car inside those zones captures it.
    /// Escapes safely = money.
    case transporter
    /// A lorry in normal traffic: longer, heavier, and the only vehicle a toll booth
    /// charges (FOUNDATION.md 2.9).
    case truck
}

/// Who sent the vehicle onto the road. Only player cars are rated and can cost strikes.
public enum Owner: Sendable, Equatable {
    case player
    case ai
}

/// Speed profile of a merge: fixed duration, ends exactly at ring speed (FOUNDATION.md 2.2).
///
/// Speed changes linearly from `startSpeed` to `endSpeed`. The entry path has the length a
/// car drives in `duration` at 100 % tempo, so at 100 % the car simply keeps its speed; in a
/// faster phase it starts slower and accelerates. Either way the timing stays learnable.
///
/// Times here are *planned* times at `ringSpeed`. If the ring speeds up during the merge
/// (rush hour), the merge runs faster by the same factor (`World.moveVehicles`), so every
/// gap the player timed stays exactly as planned.
public struct MergeProfile: Sendable, Equatable {
    public var duration: Double
    public var startSpeed: Double
    public var endSpeed: Double
    /// The ring speed the merge was planned for.
    public var ringSpeed: Double

    public init(pathLength: Double, duration: Double, ringSpeed: Double) {
        let average = pathLength / duration
        let end = min(ringSpeed, 2 * average)
        self.duration = duration
        self.endSpeed = end
        self.startSpeed = 2 * average - end
        self.ringSpeed = ringSpeed
    }

    /// Distance along the entry path after `time`.
    public func distance(at time: Double) -> Double {
        let t = min(max(time, 0), duration)
        return startSpeed * t + (endSpeed - startSpeed) * t * t / (2 * duration)
    }

    public func speed(at time: Double) -> Double {
        let t = min(max(time, 0), duration)
        return startSpeed + (endSpeed - startSpeed) * t / duration
    }
}

public struct Vehicle: Sendable, Equatable {
    public enum Phase: Sendable, Equatable {
        /// In the player's queue; the queue sets the position.
        case queued
        /// AI car at its stop line, waiting for a safe gap.
        case waiting(Waiting)
        /// On an entry path.
        case merging(Merging)
        case ring(Ring)
        case exiting(Exiting)
        /// Spinning out; takes no part in collisions any more.
        case crashed(Crashed)
    }

    public struct Waiting: Sendable, Equatable {
        public var arm: Arm
        /// Time left before the car starts looking for a gap, once it stands at the line.
        public var reaction: Double
        /// Distance still to drive up to the stop line: cars come from outside the picture
        /// instead of appearing on it.
        public var approach: Double = 0
    }

    public struct Merging: Sendable, Equatable {
        public var arm: Arm
        public var exitArm: Arm
        public var profile: MergeProfile
        /// Planned time since launch (see `MergeProfile`); equals real time at constant tempo.
        public var elapsed: Double
        /// Smallest gap to any other vehicle so far, in seconds (surface to surface ÷ ring speed).
        public var minGap: Double = .infinity
        /// The vehicle that came closest.
        public var closest: Int?

        public var distance: Double { profile.distance(at: elapsed) }
        public var remaining: Double { profile.duration - elapsed }
        public var speed: Double { profile.speed(at: elapsed) }
    }

    public struct Ring: Sendable, Equatable {
        /// Distance along the ring.
        public var s: Double
        public var exitArm: Arm
        /// Ring distance left until the exit starts.
        public var distanceToExit: Double
        /// The finished merge, kept for exactly the step in which it ended so it can be rated.
        public var justMerged: Merging?
        public var drive = Drive()
        /// Time on the ring since the merge; infinite for cars that were placed on the ring.
        public var sinceMerge = Double.infinity
    }

    /// Leaving at ring speed, so cars never catch up with each other on an exit.
    public struct Exiting: Sendable, Equatable {
        public var arm: Arm
        public var s: Double
        public var drive = Drive()
    }

    /// A wreck: a rigid body skidding on its tyres (`CrashPhysics`).
    public struct Crashed: Sendable, Equatable {
        public var velocity: Vec2
        /// Angular velocity, radians per second.
        public var spin: Double
        public var elapsed: Double
        /// Where the car was hit first, in its own frame: x forward, y to the left.
        public var damage: Vec2
    }

    public let id: Int
    public internal(set) var type: VehicleType
    public var owner: Owner
    public var phase: Phase
    public var position: Vec2
    public var heading: Double
    /// Pose at the start of the last step, for interpolation between steps.
    public var previousPosition: Vec2
    public var previousHeading: Double
    /// Sheet metal damage, one dent per hit (`World.addDent`).
    public internal(set) var dents: [Dent] = []
    /// Marked for removal at the end of the step.
    var isRetired = false

    init(id: Int, type: VehicleType = .car, owner: Owner, phase: Phase, pose: Path.Pose) {
        self.id = id
        self.type = type
        self.owner = owner
        self.phase = phase
        position = pose.position
        heading = pose.heading
        previousPosition = pose.position
        previousHeading = pose.heading
    }

    /// Vehicles on the road collide; queued, waiting and crashed ones do not.
    public var isCollidable: Bool {
        switch phase {
        case .merging, .ring, .exiting: true
        case .queued, .waiting, .crashed: false
        }
    }

    public var isCrashed: Bool {
        if case .crashed = phase { return true }
        return false
    }

    /// One of the player's police cars, still in one piece.
    public var isPlayerPolice: Bool {
        type == .police && owner == .player && !isCrashed
    }

    /// A merge that is rated this step: still on the entry path, or finished in this very step.
    public var activeMerge: Merging? {
        switch phase {
        case let .merging(m): m
        case let .ring(r): r.justMerged
        default: nil
        }
    }

    mutating func place(_ pose: Path.Pose) {
        position = pose.position
        heading = pose.heading
    }
}

/// How a car on the ring or an exit is driven. In normal traffic every car flows at ring
/// speed (`speed == nil`), so the ring itself never crashes and the timing stays exact.
/// After a crash drivers see the hazard, react with a delay and brake (`Drivers.swift`).
public struct Drive: Sendable, Equatable {
    /// Own speed; nil while the car flows with the ring.
    public var speed: Double?
    /// Seconds until the driver reacts to the hazard ahead; 0 once in control. Nil: all clear.
    public var reaction: Double?
    /// A police car chasing the criminal right ahead of it (`World.pursue`).
    public var isPursuing = false

    public init() {}

    public var isInFlow: Bool { speed == nil && reaction == nil }
}

/// A dent in the sheet metal.
public struct Dent: Sendable, Equatable {
    /// Where, in the car's own frame: x forward, y to the left.
    public var point: Vec2
    /// How deep, in world units.
    public var depth: Double
}
