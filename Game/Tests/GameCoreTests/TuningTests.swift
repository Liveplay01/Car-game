import Foundation
import Testing
@testable import GameCore

@Suite("Live tuning")
struct TuningTests {
    func load(_ json: String) throws -> Tuning {
        try Tuning.load(Data(json.utf8))
    }

    @Test func setsGivenValuesAndKeepsTheRest() throws {
        let tuning = try load(#"{ "tightFitSeconds": 0.1, "maxStrikes": 1, "comboThresholds": [4, 8, 16] }"#)
        #expect(tuning.config.tightFitSeconds == 0.1)
        #expect(tuning.config.maxStrikes == 1)
        #expect(tuning.config.comboThresholds == [4, 8, 16])
        #expect(tuning.config.ringSpeed == Config().ringSpeed)
        #expect(tuning.keys == ["tightFitSeconds", "maxStrikes", "comboThresholds"])
        #expect(tuning.unknownKeys.isEmpty)
    }

    @Test func reportsUnknownKeys() throws {
        let tuning = try load(#"{ "tightFit": 0.1, "ringSpeed": 120 }"#)
        #expect(tuning.unknownKeys == ["tightFit"])
        #expect(tuning.config.ringSpeed == 120)
    }

    @Test func rejectsWrongTypes() {
        #expect(throws: Tuning.Failure.self) { try load(#"{ "ringSpeed": "fast" }"#) }
        #expect(throws: Tuning.Failure.self) { try load(#"{ "maxStrikes": 2.5 }"#) }
        #expect(throws: Tuning.Failure.self) { try load("[1, 2]") }
        #expect(throws: Tuning.Failure.self) { try load("{ not json") }
    }

    @Test func rejectsUnplayableValues() {
        #expect(throws: Tuning.Failure.self) { try load(#"{ "ringSpeed": -5 }"#) }
        #expect(throws: Tuning.Failure.self) { try load(#"{ "maxStrikes": 0 }"#) }
        #expect(throws: Tuning.Failure.self) { try load(#"{ "comboThresholds": [5, 10] }"#) }
        #expect(throws: Tuning.Failure.self) { try load(#"{ "comboThresholds": [10, 5, 20] }"#) }
        #expect(throws: Tuning.Failure.self) { try load(#"{ "maxPoliceCrashes": -1 }"#) }
        #expect(throws: Tuning.Failure.self) { try load(#"{ "policeChaseSpeedFactor": 0.8 }"#) }
        #expect(throws: Tuning.Failure.self) { try load(#"{ "queueAdvanceDuration": -0.1 }"#) }
    }

    @Test func theDefaultsAreAlwaysLoadable() throws {
        // No tap cooldown is a valid value, not a broken one.
        let tuning = try load(#"{ "queueAdvanceDuration": 0 }"#)
        #expect(tuning.config == Config())
    }

    @Test func generatedFileRoundTrips() throws {
        var config = Config()
        config.tightFitSeconds = 0.09
        config.comboMultipliers = [1.25, 2, 4]
        let tuning = try Tuning.load(Data(Tuning.json(for: config).utf8))
        #expect(tuning.config == config)
        #expect(tuning.unknownKeys.isEmpty)
        #expect(tuning.keys.count == Tuning.fields.count)
    }

    @Test func listsDifferencesFromConfigSwift() {
        var config = Config()
        config.tightFitSeconds = 0.1
        config.maxStrikes = 3
        #expect(Tuning.differences(config) == [
            "tightFitSeconds 0.1 (Config.swift 0.12)",
            "maxStrikes 3 (Config.swift 1)",
        ])
        #expect(Tuning.differences(Config()).isEmpty)
    }
}
