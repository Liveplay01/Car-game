import Foundation
import GameCore

/// The Upgrades tab: a card per upgrade with a picture of what it does, the steps bought so
/// far and the price of the next one. One tap opens the details below, a double tap buys
/// (FOUNDATION.md 3).
///
/// The motion follows the rules in FOUNDATION.md 3: pressing gives feedback at once, the
/// details slide in under 250 ms, and only the rare moment — a purchase — is allowed to
/// celebrate. Reduce Motion keeps the colours and drops every movement.
public enum UpgradePage {
    /// Cards in a row.
    static let columns = 2
    static let gap = 12.0
    static let cardCorner = 14.0
    /// Enter: each card a little after the one before it.
    static let stagger = 0.04
    static let enterDuration = 0.25
    /// A press is felt at once and lets go just as quickly.
    static let pressDuration = 0.12
    static let pressScale = 0.97
    /// A purchase: the card springs, a ring runs outwards, the new step pops in.
    static let purchaseDuration = 0.45
    /// Not enough money: a short shake, and the price flashes.
    static let deniedDuration = 0.4
    /// The balance counts down to what is left.
    static let countDuration = 0.4

    /// What the page is doing right now; the session keeps it and ages it every frame.
    public struct State: Sendable, Equatable {
        public var selected: Upgrade?
        /// Real time since the page was opened, for the cards coming in.
        public var age = 0.0
        /// The card being pressed, and for how long.
        public var pressed: (upgrade: Upgrade, age: Double)?
        /// A bought step: the card that got it, its steps before, and how long ago.
        public var purchase: (upgrade: Upgrade, steps: Int, age: Double)?
        /// A refused purchase (not enough money) and how long ago.
        public var denied: (upgrade: Upgrade, age: Double)?
        /// Money before the last purchase, counted down from.
        public var moneyBefore: Int?

        public init() {}

        public static func == (a: State, b: State) -> Bool {
            a.selected == b.selected && a.age == b.age && a.pressed?.upgrade == b.pressed?.upgrade
                && a.purchase?.upgrade == b.purchase?.upgrade && a.denied?.upgrade == b.denied?.upgrade
                && a.moneyBefore == b.moneyBefore
        }

        /// Ages every animation by one frame and drops the finished ones.
        public mutating func age(by delta: Double) {
            age += delta
            if var press = pressed {
                press.age += delta
                pressed = press.age < UpgradePage.pressDuration ? press : nil
            }
            if var purchase {
                purchase.age += delta
                self.purchase = purchase.age < UpgradePage.purchaseDuration ? purchase : nil
                if self.purchase == nil { moneyBefore = nil }
            }
            if var denied {
                denied.age += delta
                self.denied = denied.age < UpgradePage.deniedDuration ? denied : nil
            }
        }
    }

    // MARK: - Layout

    /// Where each card sits, in screen points.
    public static func cards(viewport: Vec2, bottomInset: Double, upgrades: [Upgrade] = Upgrade.allCases) -> [(upgrade: Upgrade, rect: Rect)] {
        let width = min(viewport.x - 2 * gap, 460)
        let left = (viewport.x - width) / 2
        let top = Metrics.sceneInsets.top + 34
        let rows = Double((upgrades.count + columns - 1) / columns)
        let available = viewport.y - bottomInset - detailHeight - gap - top
        let cardWidth = (width - gap * Double(columns - 1)) / Double(columns)
        let cardHeight = min(132, (available - gap * (rows - 1)) / rows)
        return upgrades.enumerated().map { index, upgrade in
            let column = Double(index % columns)
            let row = Double(index / columns)
            let origin = Vec2(left + column * (cardWidth + gap), top + row * (cardHeight + gap))
            return (upgrade, Rect(minX: origin.x, minY: origin.y, maxX: origin.x + cardWidth, maxY: origin.y + cardHeight))
        }
    }

    static let detailHeight = 132.0

    /// The card under a point; nil between or outside them.
    public static func card(at point: Vec2, viewport: Vec2, bottomInset: Double, upgrades: [Upgrade] = Upgrade.allCases) -> Upgrade? {
        cards(viewport: viewport, bottomInset: bottomInset, upgrades: upgrades).first { $0.rect.contains(point) }?.upgrade
    }

    // MARK: - Drawing

    static func add(
        career: Career,
        config: Config,
        upgrades: [Upgrade] = Upgrade.allCases,
        state: State,
        format: TextFormat,
        reduceMotion: Bool,
        showsKeys: Bool,
        bottomInset: Double,
        to list: inout RenderList
    ) {
        let viewport = list.camera.viewport
        var id = RenderID.menu
        list.add(.roundedRect(center: viewport / 2, size: viewport, cornerRadius: 0, rotation: 0), color: .scrim, space: .screen, id: id)
        id += 1

        // Title and balance. The balance counts down after a purchase.
        let shown = countedMoney(career: career, state: state)
        MenuKit.header(Strings.Upgrades.title, money: Strings.Upgrades.balance(format.number(shown)), viewport: viewport, id: &id, to: &list)

        for (index, card) in cards(viewport: viewport, bottomInset: bottomInset, upgrades: upgrades).enumerated() {
            addCard(card.upgrade, index: index, rect: card.rect, career: career, config: config, state: state, format: format, reduceMotion: reduceMotion, showsKeys: showsKeys, id: &id, to: &list)
        }
        addDetail(career: career, config: config, state: state, format: format, reduceMotion: reduceMotion, showsKeys: showsKeys, bottomInset: bottomInset, id: &id, to: &list)
    }

    /// The colour of an upgrade's theme, for its picture tile.
    static func tint(of upgrade: Upgrade) -> ColorToken {
        switch upgrade {
        case .morePatrols, .interceptor, .dispatchRadio, .backup: .juiceBlue
        case .longerPursuit: .juicePurple
        case .quietStreets: .juiceGreen
        case .cashRoute, .overtime, .doubleRun: .juiceYellow
        case .freight: .juiceOrange
        case .insurance, .robberyInsurance: .juiceRed
        }
    }

    /// The balance right after a purchase: it counts down from what it was.
    static func countedMoney(career: Career, state: State) -> Int {
        guard let before = state.moneyBefore, let purchase = state.purchase else { return career.money }
        let x = Ease.outCubic(purchase.age / countDuration)
        return before + Int((Double(career.money - before) * x).rounded())
    }

    private static func addCard(
        _ upgrade: Upgrade,
        index: Int,
        rect: Rect,
        career: Career,
        config: Config,
        state: State,
        format: TextFormat,
        reduceMotion: Bool,
        showsKeys: Bool,
        id: inout Int,
        to list: inout RenderList
    ) {
        let steps = career.steps(of: upgrade)
        let price = career.price(of: upgrade, config: config)
        let isSelected = state.selected == upgrade
        let purchase = state.purchase?.upgrade == upgrade ? state.purchase : nil
        let denied = state.denied?.upgrade == upgrade ? state.denied : nil

        // Coming in: a short rise and fade, one card after the other.
        let enter = Ease.outCubic((state.age - Double(index) * stagger) / enterDuration)
        guard enter > 0 else { return }
        var center = Vec2((rect.minX + rect.maxX) / 2, (rect.minY + rect.maxY) / 2)
        var scale = 1.0
        if !reduceMotion {
            // It rises past its place and settles, like the chest (`MenuKit.cardEnter`).
            let motion = MenuKit.cardEnter(Ease.spring((state.age - Double(index) * stagger) / (enterDuration + 0.2)))
            center.y += motion.rise
            scale = motion.scale
            // Pressed: it gives way a little. Bought: it springs.
            if let pressed = state.pressed, pressed.upgrade == upgrade {
                scale = pressScale + (1 - pressScale) * Ease.outCubic(pressed.age / pressDuration)
            }
            if let purchase {
                let x = purchase.age / purchaseDuration
                scale = 1 + 0.04 * sin(.pi * Ease.outCubic(x))
            }
            if let denied {
                // Three shakes that fade out.
                let x = denied.age / deniedDuration
                center.x += sin(x * .pi * 6) * 5 * (1 - x)
            }
        }
        let size = Vec2((rect.maxX - rect.minX) * scale, (rect.maxY - rect.minY) * scale)
        let opacity = enter

        list.add(.roundedRect(center: center, size: size, cornerRadius: cardCorner, rotation: 0), color: .surface, opacity: opacity, space: .screen, id: id)
        id += 1
        if isSelected {
            list.add(.roundedRect(center: center, size: size + Vec2(4, 4), cornerRadius: cardCorner + 2, rotation: 0), color: .accent, opacity: 0.55 * opacity, space: .screen, id: id)
            id += 1
            list.add(.roundedRect(center: center, size: size, cornerRadius: cardCorner, rotation: 0), color: .surface, opacity: opacity, space: .screen, id: id)
            id += 1
        }
        // The purchase ring runs outwards and fades.
        if let purchase, !reduceMotion {
            let x = Ease.outCubic(purchase.age / purchaseDuration)
            list.add(.roundedRect(center: center, size: size + Vec2(24 * x, 24 * x), cornerRadius: cardCorner + 12 * x, rotation: 0), color: .accent, opacity: 0.5 * (1 - x) * opacity, space: .screen, id: id)
            id += 1
            list.add(.roundedRect(center: center, size: size, cornerRadius: cardCorner, rotation: 0), color: .surface, opacity: opacity, space: .screen, id: id)
            id += 1
        }

        // The picture sits in its own darker panel.
        let pictureHeight = min(56.0, size.y * 0.44)
        let picture = Rect(
            minX: center.x - size.x / 2 + 10,
            minY: center.y - size.y / 2 + 10,
            maxX: center.x + size.x / 2 - 10,
            maxY: center.y - size.y / 2 + 10 + pictureHeight
        )
        let tile = Vec2((picture.minX + picture.maxX) / 2, (picture.minY + picture.maxY) / 2)
        list.add(.roundedRect(center: tile, size: Vec2(picture.maxX - picture.minX, pictureHeight), cornerRadius: 10, rotation: 0), color: .island, opacity: opacity, space: .screen, id: id)
        id += 1
        // Lit in the colour of its theme: police blue, chase purple, quiet green, money
        // yellow, freight orange, insurance red. Light, not a fill: on dark a fill turns muddy.
        MenuKit.glow(at: tile, radius: pictureHeight * 0.62, color: tint(of: upgrade), opacity: 0.45 * opacity, id: &id, to: &list)
        UpgradeArt.add(upgrade, in: picture, opacity: opacity, id: &id, to: &list)

        // Two rows under the picture: the name with its steps, then the pips with the price.
        // Each row keeps its own lane, so nothing overlaps however short the card gets.
        let textLeft = center.x - size.x / 2 + 12
        let textRight = center.x + size.x / 2 - 12
        let nameY = picture.maxY + (center.y + size.y / 2 - picture.maxY) * 0.36
        list.add(.text(Strings.Upgrades.name(upgrade), position: Vec2(textLeft, nameY), size: 14, alignment: .leading, weight: .bold), color: .primary, opacity: opacity, space: .screen, id: id)
        id += 1
        list.add(.text(Strings.Upgrades.steps(steps, of: upgrade.maxSteps), position: Vec2(textRight, nameY), size: 12, alignment: .trailing, weight: .regular), color: .muted, opacity: opacity, space: .screen, id: id)
        id += 1
        if showsKeys {
            list.add(.text(Strings.Keys.number(index + 1), position: Vec2(picture.maxX - 8, picture.minY + 10), size: 11, alignment: .trailing, weight: .regular), color: .muted, opacity: 0.7 * opacity, space: .screen, id: id)
            id += 1
        }

        // One pip per step: filled for what is bought. The new one pops in. They stop short
        // of the price.
        let priceY = center.y + size.y / 2 - 14
        let pipY = priceY
        let pipGap = 2.5
        let priceRoom = 82.0
        let pipWidth = min(9.0, (size.x - 24 - priceRoom - pipGap * Double(upgrade.maxSteps - 1)) / Double(upgrade.maxSteps))
        for step in 0..<upgrade.maxSteps {
            let filled = step < steps
            var pip = Vec2(textLeft + pipWidth / 2 + Double(step) * (pipWidth + pipGap), pipY)
            var pipSize = Vec2(pipWidth, 5)
            if let purchase, step == purchase.steps, !reduceMotion {
                // Overshoots a little, then settles.
                let x = Ease.outCubic(purchase.age / 0.3)
                let pop = 1 + 0.6 * sin(.pi * x)
                pipSize = pipSize * pop
                pip.y -= 0
            }
            list.add(.roundedRect(center: pip, size: pipSize, cornerRadius: 2.5, rotation: 0), color: filled ? .accent : .marking, opacity: (filled ? 1 : 0.6) * opacity, space: .screen, id: id)
            id += 1
        }

        // Price, or "Max" once every step is bought.
        let affordable = price.map { career.money >= $0 } ?? false
        var priceColor: ColorToken = price == nil ? .accent : (affordable ? .primary : .muted)
        if denied != nil { priceColor = .destructive }
        let priceAt = Vec2(center.x + size.x / 2 - 12, priceY)
        if let price {
            Icons.moneyTag(format.number(price), at: priceAt, size: 14, alignment: .trailing, color: priceColor, noteColor: priceColor, opacity: opacity, id: &id, to: &list)
        } else {
            list.add(.text(Strings.Upgrades.maxed, position: priceAt, size: 14, alignment: .trailing, weight: .bold), color: priceColor, opacity: opacity, space: .screen, id: id)
            id += 1
        }
    }

    /// The panel at the bottom: what the selected upgrade does, and how to buy it.
    private static func addDetail(
        career: Career,
        config: Config,
        state: State,
        format: TextFormat,
        reduceMotion: Bool,
        showsKeys: Bool,
        bottomInset: Double,
        id: inout Int,
        to list: inout RenderList
    ) {
        let viewport = list.camera.viewport
        let width = min(viewport.x - 2 * gap, 460)
        let top = viewport.y - bottomInset - detailHeight
        let center = Vec2(viewport.x / 2, top + detailHeight / 2 - 6)
        let enter = Ease.outCubic((state.age - 0.1) / enterDuration)
        let rise = reduceMotion ? 0 : (1 - enter) * 8
        list.add(.roundedRect(center: center + Vec2(0, rise), size: Vec2(width, detailHeight - 12), cornerRadius: cardCorner, rotation: 0), color: .surface, opacity: enter, space: .screen, id: id)
        id += 1

        let left = center.x - width / 2 + 16
        let right = center.x + width / 2 - 16
        var y = center.y - detailHeight / 2 + 26 + rise
        func text(_ string: String, _ position: Vec2, size: Double, weight: FontWeight = .regular, color: ColorToken, alignment: TextAlignment = .leading) {
            list.add(.text(string, position: position, size: size, alignment: alignment, weight: weight), color: color, opacity: enter, space: .screen, id: id)
            id += 1
        }

        guard let upgrade = state.selected else {
            text(Strings.Upgrades.pickOne, Vec2(center.x, center.y + rise), size: 15, color: .muted, alignment: .center)
            if showsKeys {
                text(Strings.Upgrades.keys, Vec2(center.x, center.y + 22 + rise), size: 12, color: .muted, alignment: .center)
            }
            return
        }
        let steps = career.steps(of: upgrade)
        let price = career.price(of: upgrade, config: config)
        text(Strings.Upgrades.name(upgrade), Vec2(left, y), size: 17, weight: .bold, color: .primary)
        if let price {
            let affordable = career.money >= price
            let priceColor: ColorToken = affordable ? .accent : .muted
            Icons.moneyTag(format.number(price), at: Vec2(right, y), size: 17, alignment: .trailing, color: priceColor, noteColor: priceColor, opacity: enter, id: &id, to: &list)
        } else {
            text(Strings.Upgrades.maxed, Vec2(right, y), size: 15, weight: .bold, color: .accent, alignment: .trailing)
        }
        y += 22
        for line in wrap(Strings.Upgrades.explanation(upgrade), width: width - 32, size: 13) {
            text(line, Vec2(left, y), size: 13, color: .muted)
            y += 17
        }
        y += 4
        text(Strings.Upgrades.stepEffect(upgrade, steps: steps, config: config), Vec2(left, y), size: 13, weight: .bold, color: .primary)
        y += 20
        if price == nil {
            text(Strings.Upgrades.everyStepBought, Vec2(left, y), size: 12, color: .muted)
        } else if career.money >= price! {
            text(showsKeys ? Strings.Upgrades.buyHintKeys : Strings.Upgrades.buyHint, Vec2(left, y), size: 12, color: .muted)
        } else {
            text(Strings.Upgrades.missing(format.number(price! - career.money)), Vec2(left, y), size: 12, color: .destructive)
        }
    }

    /// Breaks a line at spaces so it fits the panel; the test window draws single lines.
    static func wrap(_ text: String, width: Double, size: Double) -> [String] {
        let perCharacter = size * 0.52
        let limit = max(8, Int(width / perCharacter))
        var lines: [String] = []
        var line = ""
        for word in text.split(separator: " ") {
            let candidate = line.isEmpty ? String(word) : line + " " + word
            if candidate.count <= limit {
                line = candidate
            } else {
                if !line.isEmpty { lines.append(line) }
                line = String(word)
            }
        }
        if !line.isEmpty { lines.append(line) }
        return lines
    }
}

/// A small picture for every upgrade, drawn from the same shapes as the game: the app can
/// put these in its SwiftUI cells, the test window draws them straight into the page.
public enum UpgradeArt {
    public static func add(_ upgrade: Upgrade, in rect: Rect, opacity: Double, id: inout Int, to list: inout RenderList) {
        let center = Vec2((rect.minX + rect.maxX) / 2, (rect.minY + rect.maxY) / 2)
        let unit = min(rect.maxX - rect.minX, rect.maxY - rect.minY) / 56
        func add(_ primitive: Primitive, _ color: ColorToken, _ share: Double = 1) {
            list.add(primitive, color: color, opacity: share * opacity, space: .screen, id: id)
            id += 1
        }
        /// A car seen from above: body, roof and, for the police, its light bar.
        func car(_ at: Vec2, _ scale: Double, body: ColorToken, roof: ColorToken?, lights: Bool) {
            add(.roundedRect(center: at, size: Vec2(16, 27) * scale * unit, cornerRadius: 5 * scale * unit, rotation: 0), body)
            if let roof {
                add(.roundedRect(center: at, size: Vec2(11, 12) * scale * unit, cornerRadius: 3 * scale * unit, rotation: 0), roof)
            }
            if lights {
                add(.roundedRect(center: at - Vec2(2.6, 0) * scale * unit, size: Vec2(4, 3) * scale * unit, cornerRadius: 1, rotation: 0), .lightBlue)
                add(.roundedRect(center: at + Vec2(2.6, 0) * scale * unit, size: Vec2(4, 3) * scale * unit, cornerRadius: 1, rotation: 0), .lightBlue)
            }
        }

        switch upgrade {
        case .morePatrols:
            car(center - Vec2(13, 0) * unit, 0.85, body: .vehiclePolice, roof: .vehiclePoliceRoof, lights: true)
            car(center + Vec2(4, 0) * unit, 0.85, body: .vehiclePolice, roof: .vehiclePoliceRoof, lights: true)
            add(.roundedRect(center: center + Vec2(19, -6) * unit, size: Vec2(12, 3) * unit, cornerRadius: 1.5, rotation: 0), .accent)
            add(.roundedRect(center: center + Vec2(19, -6) * unit, size: Vec2(3, 12) * unit, cornerRadius: 1.5, rotation: 0), .accent)

        case .longerPursuit:
            // A stopwatch with more time on it.
            add(.arc(center: center, radius: 15 * unit, thickness: 3 * unit, startAngle: 0, endAngle: Angle.tau), .vehicleCriminal)
            add(.roundedRect(center: center - Vec2(0, 18) * unit, size: Vec2(8, 5) * unit, cornerRadius: 2, rotation: 0), .vehicleCriminal)
            add(.line(from: center, to: center + Vec2(0, -10) * unit, thickness: 2.5 * unit), .primary)
            add(.line(from: center, to: center + Vec2(8, 3) * unit, thickness: 2.5 * unit), .primary)

        case .quietStreets:
            // A pickup that stays away.
            car(center - Vec2(6, 0) * unit, 0.9, body: .vehicleCriminal, roof: .vehicleBed, lights: false)
            add(.line(from: center + Vec2(-18, 14) * unit, to: center + Vec2(8, -14) * unit, thickness: 3 * unit), .destructive, 0.9)

        case .interceptor:
            car(center + Vec2(4, 0) * unit, 0.95, body: .vehiclePolice, roof: .vehiclePoliceRoof, lights: true)
            for line in 0..<3 {
                let y = center.y + Double(line - 1) * 7 * unit
                add(.line(from: Vec2(center.x - 22 * unit, y), to: Vec2(center.x - 10 * unit, y), thickness: 2.5 * unit), .lightBlue, 0.8 - Double(line) * 0.15)
            }

        case .dispatchRadio:
            add(.circle(center: center + Vec2(-8, 6) * unit, radius: 4 * unit), .lightBlue)
            for ring in 1...3 {
                let radius = Double(ring) * 8 * unit
                add(.arc(center: center + Vec2(-8, 6) * unit, radius: radius, thickness: 2 * unit, startAngle: -1.5, endAngle: 0.3), .lightBlue, 0.9 - Double(ring) * 0.2)
            }

        case .backup:
            // A shield with a light bar.
            add(.polygon([
                center + Vec2(0, -18) * unit,
                center + Vec2(15, -10) * unit,
                center + Vec2(15, 4) * unit,
                center + Vec2(0, 18) * unit,
                center + Vec2(-15, 4) * unit,
                center + Vec2(-15, -10) * unit,
            ]), .vehiclePolice)
            add(.roundedRect(center: center - Vec2(3.5, 0) * unit, size: Vec2(6, 4) * unit, cornerRadius: 1.5, rotation: 0), .lightRed)
            add(.roundedRect(center: center + Vec2(3.5, 0) * unit, size: Vec2(6, 4) * unit, cornerRadius: 1.5, rotation: 0), .lightBlue)

        case .cashRoute:
            // The transporter, with its way ahead.
            add(.roundedRect(center: center - Vec2(6, 0) * unit, size: Vec2(18, 30) * unit, cornerRadius: 4 * unit, rotation: 0), .vehicleCargo)
            add(.roundedRect(center: center - Vec2(6, 6) * unit, size: Vec2(12, 10) * unit, cornerRadius: 2 * unit, rotation: 0), .hazard)
            add(.line(from: center + Vec2(12, 10) * unit, to: center + Vec2(12, -8) * unit, thickness: 2.5 * unit), .accent, 0.9)
            add(.line(from: center + Vec2(12, -8) * unit, to: center + Vec2(7, -3) * unit, thickness: 2.5 * unit), .accent, 0.9)
            add(.line(from: center + Vec2(12, -8) * unit, to: center + Vec2(17, -3) * unit, thickness: 2.5 * unit), .accent, 0.9)

        case .freight:
            // A lorry: long box, short cab.
            add(.roundedRect(center: center + Vec2(0, 5) * unit, size: Vec2(17, 26) * unit, cornerRadius: 3 * unit, rotation: 0), .vehicleTruckBox)
            add(.roundedRect(center: center - Vec2(0, 14) * unit, size: Vec2(15, 10) * unit, cornerRadius: 3 * unit, rotation: 0), .vehicleTruck)
            add(.roundedRect(center: center + Vec2(19, -6) * unit, size: Vec2(12, 3) * unit, cornerRadius: 1.5, rotation: 0), .accent)
            add(.roundedRect(center: center + Vec2(19, -6) * unit, size: Vec2(3, 12) * unit, cornerRadius: 1.5, rotation: 0), .accent)

        case .doubleRun:
            // Two transporters, one behind the other.
            for (offset, opacity) in [(Vec2(-9, 6), 0.6), (Vec2(7, -4), 1.0)] {
                add(.roundedRect(center: center + offset * unit, size: Vec2(14, 24) * unit, cornerRadius: 3 * unit, rotation: 0), .vehicleCargo, opacity)
                add(.roundedRect(center: center + (offset - Vec2(0, 5)) * unit, size: Vec2(9, 8) * unit, cornerRadius: 2 * unit, rotation: 0), .hazard, opacity)
            }

        case .insurance, .robberyInsurance:
            // A shield; with a car for crashes, with the pickup for robberies.
            add(.polygon([
                center + Vec2(0, -18) * unit,
                center + Vec2(15, -10) * unit,
                center + Vec2(15, 4) * unit,
                center + Vec2(0, 18) * unit,
                center + Vec2(-15, 4) * unit,
                center + Vec2(-15, -10) * unit,
            ]), .accent, 0.85)
            let body: ColorToken = upgrade == .insurance ? .vehicleCar : .vehicleCriminal
            car(center, 0.55, body: body, roof: upgrade == .insurance ? nil : .vehicleBed, lights: false)

        case .overtime:
            // A stack of coins.
            for coin in 0..<3 {
                let y = center.y + 8 * unit - Double(coin) * 7 * unit
                add(.circle(center: Vec2(center.x, y), radius: 13 * unit), .vehicleCargo, 0.7 + Double(coin) * 0.15)
                add(.circle(center: Vec2(center.x, y), radius: 9 * unit), .hazard, 0.5 + Double(coin) * 0.15)
            }
        }
    }
}
