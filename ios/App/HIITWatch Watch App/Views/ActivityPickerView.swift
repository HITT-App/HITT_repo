import SwiftUI

private let hiitOrange = Color(red: 1, green: 0.541, blue: 0.149)

struct ActivityPickerView: View {
    let onSelect: (WatchActivity) -> Void
    let onCancel: () -> Void

    @State private var crownValue: Double = 0
    @State private var selectedIdx: Int = 0
    @FocusState private var crownFocused: Bool

    private var activities: [WatchActivity] { WATCH_ACTIVITIES }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                Color.black.ignoresSafeArea()

                VStack(spacing: 0) {
                    // Header
                    Text("CHOOSE SPORT")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(1.2)
                        .foregroundColor(Color(white: 0.54))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 12)
                        .padding(.top, 8)
                        .padding(.bottom, 6)

                    // Picker rows
                    ScrollViewReader { proxy in
                        ScrollView(.vertical, showsIndicators: false) {
                            LazyVStack(spacing: 4) {
                                // Padding items top
                                Color.clear.frame(height: geo.size.height * 0.25)

                                ForEach(Array(activities.enumerated()), id: \.element.id) { i, activity in
                                    PickerRowButton(
                                        activity: activity,
                                        index: i,
                                        selectedIdx: selectedIdx,
                                        onTap: {
                                            if i == selectedIdx { onSelect(activity) }
                                            else { selectedIdx = i }
                                        }
                                    )
                                    .id(i)
                                }

                                // Padding items bottom
                                Color.clear.frame(height: geo.size.height * 0.25)
                            }
                        }
                        .onChange(of: selectedIdx) { idx in
                            withAnimation(.easeOut(duration: 0.18)) {
                                proxy.scrollTo(idx, anchor: .center)
                            }
                        }
                    }
                }

                // Scrollbar indicator (right edge)
                VStack {
                    Spacer()
                    GeometryReader { _ in
                        let progress = activities.isEmpty ? 0 : Double(selectedIdx) / Double(activities.count - 1)
                        VStack {
                            Spacer(minLength: progress * (geo.size.height - 60))
                            Capsule()
                                .fill(hiitOrange)
                                .frame(width: 3, height: 24)
                                .shadow(color: hiitOrange.opacity(0.8), radius: 4)
                        }
                    }
                    .frame(width: 6)
                    Spacer()
                }
                .frame(maxWidth: .infinity, alignment: .trailing)
                .padding(.trailing, 2)
            }
        }
        .focusable()
        .focused($crownFocused)
        .digitalCrownRotation(
            $crownValue,
            from: 0,
            through: Double(activities.count - 1),
            by: 1,
            sensitivity: .medium,
            isContinuous: false,
            isHapticFeedbackEnabled: true
        )
        .onChange(of: crownValue) { v in
            selectedIdx = max(0, min(activities.count - 1, Int(v.rounded())))
        }
        .onAppear {
            crownFocused = true
            crownValue = 0
        }
    }
}

private struct PickerRowButton: View {
    let activity: WatchActivity
    let index: Int
    let selectedIdx: Int
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ActivityRow(
                activity: activity,
                isFocused: index == selectedIdx,
                offset: abs(index - selectedIdx)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct ActivityRow: View {
    let activity: WatchActivity
    let isFocused: Bool
    let offset: Int   // distance from selected (0 = selected)

    var body: some View {
        let scale: Double = isFocused ? 1.0 : (offset == 1 ? 0.95 : 0.90)
        let opacity: Double = isFocused ? 1.0 : (offset == 1 ? 0.65 : 0.35)
        let hiitOrange = Color(red: 1, green: 0.541, blue: 0.149)

        HStack(spacing: 10) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(isFocused ? activity.color.opacity(0.25) : Color.white.opacity(0.06))
                    .frame(width: 34, height: 34)
                Image(systemName: activity.icon)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(isFocused ? activity.color : Color(white: 0.54))
            }

            Text(activity.name)
                .font(.system(size: isFocused ? 15 : 13, weight: isFocused ? .semibold : .regular))
                .foregroundColor(isFocused ? .white : Color(white: 0.54))

            Spacer()

            if isFocused {
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(hiitOrange)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isFocused ? Color.white.opacity(0.08) : Color.clear)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isFocused ? hiitOrange.opacity(0.7) : Color.clear, lineWidth: 1.5)
                )
        )
        .scaleEffect(scale)
        .opacity(opacity)
        .animation(.easeOut(duration: 0.15), value: isFocused)
    }
}
