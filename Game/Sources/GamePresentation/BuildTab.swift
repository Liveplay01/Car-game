import GameCore

/// The Build tab (Leo, 26.09.2026): the Upgrades and the Street Builder on one tab, a
/// segment each, like the Shop's sections. Both pages draw the same header and segmented
/// control; switching between them keeps that chrome still (`ScreenTransition`) while the
/// thumb glides over and the page under it swipes in from its side.
public enum BuildTab {
    /// Where the segmented control sits: under the header, like the Shop's.
    static let top = Metrics.sceneInsets.top + 22
    /// Where the pages' own content starts, under the segments.
    static let contentTop = top + ShopPage.segmentHeight + 10
    /// How long the thumb glides.
    static let glide = 0.35

    static func segmentsRect(viewport: Vec2) -> Rect {
        let width = min(viewport.x - 2 * ShopPage.gap, 460)
        let left = (viewport.x - width) / 2
        return Rect(minX: left, minY: top, maxX: left + width, maxY: top + ShopPage.segmentHeight)
    }

    /// The page whose segment is under a point; nil beside the control.
    public static func page(at point: Vec2, viewport: Vec2) -> Tab? {
        let rect = segmentsRect(viewport: viewport)
        guard rect.contains(point) else { return nil }
        let index = Int((point.x - rect.minX) / (rect.width / Double(Tab.build.count)))
        return Tab.build[min(max(index, 0), Tab.build.count - 1)]
    }

    /// The header and the segments. `thumb` is the thumb's position, 0 for Upgrades, 1 for
    /// the Street Builder, in between while it glides.
    static func addChrome(page: Tab, thumb: Double, money: String, viewport: Vec2, to list: inout RenderList) {
        var id = RenderID.buildChrome
        MenuKit.header(Strings.Tabs.title(.upgrades), money: money, viewport: viewport, id: &id, to: &list)
        let labels = Tab.build.map(Strings.Tabs.buildSegment)
        MenuKit.segmented(labels, chosen: Tab.build.firstIndex(of: page) ?? 0, thumb: thumb, in: segmentsRect(viewport: viewport), id: &id, to: &list)
    }

    /// Whether an item is part of the chrome, which stays put while the pages switch.
    static func isChrome(_ item: RenderItem) -> Bool {
        (RenderID.buildChrome..<RenderID.buildChrome + 100).contains(item.id)
    }
}
