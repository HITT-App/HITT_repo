// Mirror of the shared ActivityAttributes type used by `capacitor-live-activity`.
//
// The plugin always starts/updates/ends `Activity<GenericAttributes>` — there is no way
// to register a custom Attributes type. The widget extension MUST declare a struct that
// is name- and shape-identical so the OS can decode the activity payload for our widget.
//
// Keep this file in sync with:
// node_modules/capacitor-live-activity/ios/Sources/LiveActivityPlugin/Shared/GenericAttributes.swift

import ActivityKit
import Foundation

@available(iOS 16.2, *)
public struct GenericAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var values: [String: String]
        public init(values: [String: String]) { self.values = values }
    }

    public var id: String
    public var staticValues: [String: String]

    public init(id: String, staticValues: [String: String]) {
        self.id = id
        self.staticValues = staticValues
    }
}
