import CRaylib
import Foundation
import GameCore
import GamePresentation

// Test window: draws, takes input, plays sound. No game logic here; that lives in `Game/`.

let options = LaunchOptions(arguments: CommandLine.arguments)

SetConfigFlags(UInt32(FLAG_WINDOW_RESIZABLE.rawValue | FLAG_MSAA_4X_HINT.rawValue | FLAG_VSYNC_HINT.rawValue))
SetTraceLogLevel(Int32(LOG_WARNING.rawValue))
InitWindow(430, 900, Strings.windowTitle)
if let size = options.size {
    SetWindowSize(Int32(size.width), Int32(size.height))
} else {
    fitWindowToMonitor()
}
// Esc pauses; the window closes only with its close button.
SetExitKey(0)
// Shapes are drawn as triangle fans in either winding.
rlDisableBackfaceCulling()

let renderer = Renderer()
let audio = RaylibAudio(folder: ProjectFiles.sounds)
let music = RaylibMusic(folder: ProjectFiles.music)
let session = GameSession(
    random: SeedSource(fixed: options.seed),
    store: FileSaveStore(url: ProjectFiles.saveGame),
    audio: audio,
    timeScale: options.timeScale
)
session.isDebugVisible = options.startWithDebug
if let level = options.level {
    session.setLevel(level)
}
if let rarity = options.chestPreview {
    session.previewChestOpening(rarity)
}
session.forcedWeather = options.weather
session.forcedMapSkin = options.mapSkin
session.forcedEvent = options.event
if let duty = options.duty {
    session.perform(.setDuty(duty))
}
print("Save game: \(ProjectFiles.saveGame.path)  (level \(session.save.career.level), \(session.save.career.money) money)")
loadTuning(into: session, createIfMissing: false)
if options.startsShift {
    session.perform(.startShift)
} else if let tab = options.tab {
    session.perform(.showTab(tab))
} else if options.opensSettings {
    session.perform(.openSettings)
}

var runTime = 0.0
var screenshotAt = options.screenshotAfterCrash == nil ? options.screenshotAt : .infinity
var nextAutotap = options.autotapInterval ?? .infinity
var wasFocused = IsWindowFocused()

while !WindowShouldClose() {
    runTime += Double(GetFrameTime())
    var actions: [InputAction] = []
    let viewport = Vec2(Double(GetScreenWidth()), Double(GetScreenHeight()))
    if IsKeyPressed(key(KEY_SPACE)) {
        actions.append(.tap)
    }
    let mouse = Vec2(Double(GetMousePosition().x), Double(GetMousePosition().y))
    let tabBar = session.screen.showsTabBar ? TabStrip.height : 0
    if IsMouseButtonPressed(Int32(MOUSE_BUTTON_LEFT.rawValue)) {
        // A click on the tab strip switches the page; on a page it belongs to the page;
        // anywhere else it is a tap into the game.
        if session.screen.showsTabBar, let tab = TabStrip.tab(at: mouse, viewport: viewport) {
            actions.append(.selectTab(tab))
        } else if session.screen == .page(.upgrades),
                  let upgrade = UpgradePage.card(at: mouse, viewport: viewport, bottomInset: tabBar, upgrades: session.visibleUpgrades) {
            // One click opens the card, a second one right after buys it.
            actions.append(.tapUpgrade(upgrade))
        } else if session.screen == .page(.shop),
                  let target = ShopPage.target(at: mouse, viewport: viewport, bottomInset: tabBar, career: session.save.career, state: session.shopPage) {
            actions.append(.tapShop(target))
        } else if session.screen == .page(.shop) {
            // A click beside everything on the shop does nothing.
        } else if session.screen == .page(.streetBuilder) {
            actions.append(.pointerDown(mouse))
        } else if session.screen == .settings {
            // A row changes its setting, "Done" closes; a click beside them does nothing.
            if let content = session.content, let action = SettingsPage.action(at: mouse, content: content, viewport: viewport) {
                actions.append(.perform(action))
            }
        } else {
            actions.append(.tap)
        }
    }
    // Dragging a part across the Street Builder.
    if session.screen == .page(.streetBuilder) {
        if IsMouseButtonDown(Int32(MOUSE_BUTTON_LEFT.rawValue)) {
            actions.append(.pointerMove(mouse))
        }
        if IsMouseButtonReleased(Int32(MOUSE_BUTTON_LEFT.rawValue)) {
            actions.append(.pointerUp(mouse))
        }
    }
    if IsKeyPressed(key(KEY_TAB)) {
        actions.append(.nextTab)
    }
    if let interval = options.autotapInterval, runTime >= nextAutotap {
        actions.append(.tap)
        nextAutotap += interval
    }
    if IsKeyPressed(key(KEY_E)) || IsMouseButtonPressed(Int32(MOUSE_BUTTON_RIGHT.rawValue)) {
        actions.append(.dispatch)
    }
    if IsKeyPressed(key(KEY_ENTER)) || IsKeyPressed(key(KEY_KP_ENTER)) {
        actions.append(.confirm)
    }
    if IsKeyPressed(key(KEY_ESCAPE)) {
        actions.append(.back)
    }
    for number in 1...9 where IsKeyPressed(key(KEY_ONE) + Int32(number - 1)) || IsKeyPressed(key(KEY_KP_1) + Int32(number - 1)) {
        actions.append(.choose(number))
    }
    if IsKeyPressed(key(KEY_R)) {
        actions.append(.restart)
    }
    if IsKeyPressed(key(KEY_F1)) {
        actions.append(.toggleDebug)
    }
    if IsKeyPressed(key(KEY_F2)) {
        actions.append(.cycleSlowMotion)
    }
    if IsKeyPressed(key(KEY_D)) {
        actions.append(.perform(.toggleDaily))
    }
    if IsKeyPressed(key(KEY_H)) {
        actions.append(.perform(.setDuty(session.save.career.duty == .normal ? .highAlert : .normal)))
    }
    if IsKeyPressed(key(KEY_T)) {
        loadTuning(into: session, createIfMissing: true)
    }
    let isFocused = IsWindowFocused()
    // Screenshot runs are unattended: they must not pause when another window takes focus.
    if wasFocused && !isFocused && options.screenshotFile == nil {
        actions.append(.focusLost)
    }
    if !wasFocused && isFocused {
        actions.append(.focusGained)
    }
    wasFocused = isFocused

    let frame = session.frame(
        delta: Double(GetFrameTime()),
        actions: actions,
        viewport: viewport,
        fps: Int(GetFPS())
    )
    music.update(mix: session.musicMix, enabled: session.save.settings.sound, delta: Double(GetFrameTime()))

    if let delay = options.screenshotAfterCrash, screenshotAt == .infinity,
       frame.events.contains(where: { if case .crash = $0 { true } else { false } }) {
        screenshotAt = runTime + delay
    }

    BeginDrawing()
    renderer.draw(frame.renderList)
    let screenshotDue = options.screenshotFile != nil && runTime >= screenshotAt
    if screenshotDue, let file = options.screenshotFile {
        // raylib batches draw calls until EndDrawing; flush first. Saved into the working directory.
        rlDrawRenderBatchActive()
        TakeScreenshot(file)
    }
    EndDrawing()
    if screenshotDue {
        break
    }
}

music.unload()
audio.unload()
renderer.unload()
CloseWindow()

// MARK: - Helpers

func key(_ key: KeyboardKey) -> Int32 {
    Int32(key.rawValue)
}

/// Reads `tuning.json` and hands it to the session (T). A missing file is written with the
/// current values, so there is always one to edit.
func loadTuning(into session: GameSession, createIfMissing: Bool) {
    let url = ProjectFiles.tuning
    guard let data = try? Data(contentsOf: url) else {
        guard createIfMissing else { return }
        try? Tuning.json(for: session.baseConfig).write(to: url, atomically: true, encoding: .utf8)
        session.showNotice(Strings.Notice.tuningMissing)
        return
    }
    session.loadTuning(data)
    for difference in Tuning.differences(session.config) {
        print("tuning.json: \(difference)")
    }
}

/// Portrait window, as tall as the monitor comfortably allows, centred.
func fitWindowToMonitor() {
    let monitor = GetCurrentMonitor()
    let monitorWidth = Int(GetMonitorWidth(monitor))
    let monitorHeight = Int(GetMonitorHeight(monitor))
    guard monitorWidth > 0, monitorHeight > 0 else { return }
    let height = min(900, monitorHeight - 120)
    let width = Int(Double(height) * 0.48)
    SetWindowSize(Int32(width), Int32(height))
    SetWindowPosition(Int32((monitorWidth - width) / 2), Int32((monitorHeight - height) / 2))
}
