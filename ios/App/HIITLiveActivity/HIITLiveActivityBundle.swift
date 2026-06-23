import SwiftUI
import WidgetKit

@main
struct HIITLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.2, *) {
            HIITWorkoutLiveActivity()
        }
    }
}
