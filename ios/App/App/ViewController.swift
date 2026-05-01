import UIKit
import Capacitor

// Capacitor 8 does not auto-discover local plugins via ObjC runtime.
// registerPluginType() must be called explicitly on CAPBridgeViewController
// using capacitorDidLoad(), which fires after the bridge is initialised.
class ViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        registerPluginType(OAuthPlugin.self)
    }
}
