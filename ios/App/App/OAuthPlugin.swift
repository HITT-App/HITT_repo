import Foundation
import Capacitor
import AuthenticationServices

// Capacitor 8 SPM plugins register by conforming to CAPBridgedPlugin in Swift.
// The CAP_PLUGIN ObjC macro is the old CocoaPods pattern and does not work here.
@objc(OAuthPlugin)
public class OAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "OAuthPlugin"
    public let jsName = "OAuthPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private var authSession: ASWebAuthenticationSession?

    @objc func authenticate(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString),
              let callbackScheme = call.getString("callbackScheme") else {
            call.reject("Missing url or callbackScheme")
            return
        }

        // keepAlive prevents Capacitor releasing the call before the async session completes.
        call.keepAlive = true

        DispatchQueue.main.async { [weak self] in
            guard let self = self else {
                call.reject("Plugin deallocated before OAuth could start")
                return
            }

            self.authSession = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error = error {
                    let asError = error as? ASWebAuthenticationSessionError
                    if asError?.code == .canceledLogin {
                        call.reject("USER_CANCELLED")
                    } else {
                        call.reject(error.localizedDescription)
                    }
                    return
                }
                guard let callbackURL = callbackURL else {
                    call.reject("No callback URL received")
                    return
                }
                call.resolve(["url": callbackURL.absoluteString])
            }

            self.authSession?.presentationContextProvider = self
            // false = share Safari cookies so users already signed into Google don't re-enter credentials
            self.authSession?.prefersEphemeralWebBrowserSession = false
            self.authSession?.start()
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = self.bridge?.viewController?.view.window {
            return window
        }
        if #available(iOS 15, *) {
            return UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow } ?? UIWindow()
        }
        return UIApplication.shared.windows.first(where: { $0.isKeyWindow }) ?? UIWindow()
    }
}
