import GameCore
import GamePresentation
import SwiftUI

/// The whole screen: the drawn game, touch, and the few native controls the keyboard of
/// the test window stood in for.
struct GameScreen: View {
    let model: GameModel

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                Palette.color(.background, opacity: 1).ignoresSafeArea()
                GameCanvas(model: model)
                    .touchInput(model)
                    .onAppear { model.viewport = Vec2(geometry.size.width, geometry.size.height) }
                    .onChange(of: geometry.size) { _, size in model.viewport = Vec2(size.width, size.height) }
                NativeControls(model: model)
            }
        }
        .sheet(isPresented: Binding(
            get: { model.settingsContent != nil },
            set: { shown in if !shown { model.send(.perform(.closeSettings)) } }
        )) {
            SettingsSheet(model: model)
                .presentationDetents([.medium, .large])
        }
    }
}

/// Dispatch while playing; duty and settings before a shift. The Daily Shift needs no button:
/// it is the first shift of the day by itself.
struct NativeControls: View {
    let model: GameModel

    var body: some View {
        VStack {
            if model.screen == .ready {
                HStack(spacing: 10) {
                    Picker("Duty", selection: Binding(
                        get: { model.duty },
                        set: { model.send(.perform(.setDuty($0))) }
                    )) {
                        Text("Normal").tag(Duty.normal)
                        Text("High Alert").tag(Duty.highAlert)
                    }
                    .pickerStyle(.segmented)
                    .frame(maxWidth: 220)
                    Button {
                        model.send(.perform(.openSettings))
                    } label: {
                        Image(systemName: "gearshape.fill")
                    }
                    // Liquid Glass (iOS 26): the traffic shines through, and the button gives
                    // under the finger with the system's own spring.
                    .buttonStyle(.glass)
                    .accessibilityLabel("Settings")
                }
                .padding(.top, 150)
                .padding(.horizontal, 16)
            }
            Spacer()
            if model.screen == .playing {
                HStack {
                    Spacer()
                    Button {
                        model.send(.dispatch)
                    } label: {
                        Label("Dispatch", systemImage: "light.beacon.max.fill")
                            .font(.headline)
                    }
                    .buttonStyle(.glassProminent)
                    .tint(.blue)
                    .padding(.trailing, 16)
                    .padding(.bottom, 24)
                }
            }
        }
    }
}

/// Settings as a native form, built from the game's own settings content.
struct SettingsSheet: View {
    let model: GameModel

    var body: some View {
        NavigationStack {
            Form {
                if let content = model.settingsContent {
                    ForEach(Array(content.items.enumerated()), id: \.offset) { _, item in
                        if item.action != .closeSettings {
                            Button {
                                model.send(.perform(item.action))
                            } label: {
                                LabeledContent(item.label, value: item.value ?? "")
                            }
                        }
                    }
                }
            }
            .navigationTitle(model.settingsContent?.title ?? "Settings")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { model.send(.perform(.closeSettings)) }
                }
            }
        }
    }
}
