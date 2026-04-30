import UIKit
import Capacitor

// Subclass CAPBridgeViewController to register local plugins.
// Capacitor 5+ does not auto-discover plugins in the Xcode project —
// they must be registered explicitly via the bridge here.
class ViewController: CAPBridgeViewController {
    override open func viewDidLoad() {
        super.viewDidLoad()
        bridge?.registerPlugin(OAuthPlugin.self)
    }
}
