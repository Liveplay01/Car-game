import Foundation
import Testing
@testable import GameCore
@testable import GamePresentation

@Test func zzDumpPoliceLights() throws {
    var frames: [[String: Any]] = []
    let config = Config()
    let times = stride(from: 0.0, to: 4.8, by: 0.05).map { $0 }
    for t in times {
        var list = RenderList(camera: Camera(viewport: Vec2(100, 100), center: .zero, focus: Vec2(50, 50), scale: 1), background: .background)
        CarArt.add(id: 0, type: .police, pose: Path.Pose(position: .zero, heading: .pi / 2), dents: [], lights: t / CarArt.strobeCycle, config: config, to: &list)
        var items: [[String: Any]] = []
        for item in list.items {
            let c = Theme.color(item.color)
            var d: [String: Any] = ["rgba": [c.r, c.g, c.b, c.a], "o": item.opacity]
            switch item.primitive {
            case let .roundedRect(center, size, r, rot): d["k"] = "rr"; d["v"] = [center.x, center.y, size.x, size.y, r, rot]
            case let .circle(center, radius): d["k"] = "c"; d["v"] = [center.x, center.y, radius]
            case let .line(a, b, th): d["k"] = "l"; d["v"] = [a.x, a.y, b.x, b.y, th]
            case let .polygon(p): d["k"] = "p"; d["v"] = p.flatMap { [$0.x, $0.y] }
            default: continue
            }
            items.append(d)
        }
        frames.append(["t": t, "items": items])
    }
    let data = try JSONSerialization.data(withJSONObject: frames)
    try data.write(to: URL(fileURLWithPath: "C:/Users/leona/AppData/Local/Temp/claude/c--Car-game/eb7e9b8f-c196-4367-8b05-a488e497f80c/scratchpad/lights.json"))
}
