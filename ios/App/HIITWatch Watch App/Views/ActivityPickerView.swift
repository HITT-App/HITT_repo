import SwiftUI

private let hiitOrange    = Color(red: 1,     green: 0.541, blue: 0.149)
private let hiitOrangeDim = Color(red: 0.227, green: 0.141, blue: 0.071)
private let dimText       = Color(white: 0.541)

// Crown-scrubbed sport picker. 5 visible rows centered on the focused row,
// orange-tinted focused row with glow, crown-position indicator on the right.
struct ActivityPickerView: View {
    let onSelect: (WatchActivity) -> Void
    let onCancel: () -> Void

    @State private var crownValue: Double = 0
    @State private var selectedIdx: Int = 0
    @FocusState private var crownFocused: Bool

    private var activities: [WatchActivity] { WATCH_ACTIVITIES }

    private let rowHeight: CGFloat = 36
    private let rowSpacing: CGFloat = 4

    var body: some View {
        ZStack(alignment: .topLeading) {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                HStack(spacing: 6) {
                    Button(action: onCancel) {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(hiitOrange)
                            .frame(width: 22, height: 22)
                            .background(Color.white.opacity(0.08))
                            .clipShape(Circle())
                    }
                    .buttonStyle(.plain)
                    HiitTopLabel("CHOOSE SPORT")
                }
                .padding(.leading, 6)
                ZStack {
                    rowStack
                    fadeTop
                    fadeBottom
                }
                .clipped()
            }

            crownIndicator
                .padding(.trailing, 4)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
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
            crownValue = Double(selectedIdx)
        }
    }

    // MARK: - Subviews

    // Stack of visible rows (focused + 2 above + 2 below).
    private var rowStack: some View {
        GeometryReader { geo in
            let center = geo.size.height / 2 - rowHeight / 2
            ZStack {
                ForEach(-2...2, id: \.self) { off in
                    let i = ((selectedIdx + off) % activities.count + activities.count) % activities.count
                    let activity = activities[i]
                    PickerRow(activity: activity, focused: off == 0)
                        .onTapGesture {
                            if off == 0 { onSelect(activity) } else { selectedIdx = i }
                        }
                        .offset(y: center + CGFloat(off) * (rowHeight + rowSpacing))
                        .animation(.easeOut(duration: 0.18), value: selectedIdx)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
    }

    private var fadeTop: some View {
        VStack {
            LinearGradient(colors: [.black, .clear], startPoint: .top, endPoint: .bottom)
                .frame(height: 20)
                .allowsHitTesting(false)
            Spacer()
        }
    }

    private var fadeBottom: some View {
        VStack {
            Spacer()
            LinearGradient(colors: [.clear, .black], startPoint: .top, endPoint: .bottom)
                .frame(height: 20)
                .allowsHitTesting(false)
        }
    }

    private var crownIndicator: some View {
        GeometryReader { geo in
            let trackTop: CGFloat = 28
            let trackBottom: CGFloat = 18
            let trackHeight = geo.size.height - trackTop - trackBottom
            let chipHeight: CGFloat = 28
            let denom = max(1, activities.count - 1)
            let chipY = trackTop + (CGFloat(selectedIdx) / CGFloat(denom)) * (trackHeight - chipHeight)
            ZStack(alignment: .top) {
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(Color.white.opacity(0.08))
                    .frame(width: 3, height: trackHeight)
                    .offset(y: trackTop)
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(hiitOrange)
                    .frame(width: 3, height: chipHeight)
                    .shadow(color: hiitOrange.opacity(0.8), radius: 3)
                    .offset(y: chipY)
                    .animation(.easeOut(duration: 0.18), value: selectedIdx)
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .frame(width: 6)
    }
}

private struct PickerRow: View {
    let activity: WatchActivity
    let focused: Bool

    var body: some View {
        HStack(spacing: 6) {
            ZStack {
                Circle()
                    .fill(focused ? activity.color.opacity(0.18) : Color.white.opacity(0.09))
                    .frame(width: 24, height: 24)
                Image(systemName: activity.icon)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(focused ? activity.color : Color(white: 0.65))
            }
            Text(activity.name)
                .font(.system(size: focused ? 12 : 10, weight: focused ? .bold : .semibold))
                .foregroundColor(focused ? .white : Color(white: 0.62))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 8)
        .frame(maxWidth: .infinity)
        .frame(height: 36)
        .background(rowBackground)
        .overlay(rowBorder)
        .cornerRadius(10)
        .shadow(color: focused ? hiitOrange.opacity(0.25) : .clear, radius: 6)
        .padding(.horizontal, 10)
    }

    private var rowBackground: some View {
        Group {
            if focused {
                LinearGradient(
                    colors: [hiitOrangeDim, Color(red: 0.227, green: 0.118, blue: 0.039).opacity(0.4)],
                    startPoint: .leading, endPoint: .trailing
                )
            } else {
                Color.white.opacity(0.07)
            }
        }
    }

    private var rowBorder: some View {
        RoundedRectangle(cornerRadius: 10)
            .stroke(focused ? hiitOrange : Color.white.opacity(0.08), lineWidth: focused ? 1.5 : 0.8)
    }
}
