import Foundation
import Capacitor
import AuthenticationServices

// Native OAuth handler using ASWebAuthenticationSession.
// SFSafariViewController (used by @capacitor/browser) cannot forward custom URL
// scheme redirects on iOS 11+. ASWebAuthenticationSession handles this natively.
@objc(OAuthPlugin)
public class OAuthPlugin: CAPPlugin, ASWebAuthenticationPresentationContextProviding {
    private var authSession: ASWebAuthenticationSession?

    @objc func authenticate(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString),
              let callbackScheme = call.getString("callbackScheme") else {
            call.reject("Missing url or callbackScheme")
            return
        }

        // keepAlive prevents Capacitor from releasing this call reference
        // before ASWebAuthenticationSession completes (it's async/modal).
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
            // false = share cookies with Safari so users already signed into
            // Google on device don't need to re-enter credentials.
            self.authSession?.prefersEphemeralWebBrowserSession = false
            self.authSession?.start()
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Prefer the live window; fall back to first connected scene window.
        // Never return a bare UIWindow() — it has no windowScene on iOS 13+
        // and causes ASWebAuthenticationSession to crash at presentation.
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
