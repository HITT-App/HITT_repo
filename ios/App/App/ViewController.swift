import UIKit
import Capacitor

// ViewController exists solely so the storyboard can reference a local class.
// OAuthPlugin self-registers via CAPBridgedPlugin conformance — no manual
// registerPluginType() call needed.
class ViewController: CAPBridgeViewController {}
