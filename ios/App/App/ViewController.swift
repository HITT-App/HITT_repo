import UIKit
import Capacitor

// Capacitor 8 does not auto-discover local plugins.
// registerPluginType() is on CAPBridgeProtocol and must be called from
// capacitorDidLoad(), which fires after the bridge is fully initialised.
class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginType(OAuthPlugin.self)
    }
}
