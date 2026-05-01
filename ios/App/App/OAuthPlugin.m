@import Capacitor;

// CAP_PLUGIN registers OAuthPlugin with Capacitor's runtime at app load,
// before the bridge is initialised — the only guaranteed registration path
// for a local Swift plugin in Capacitor 8.
CAP_PLUGIN(OAuthPlugin, "OAuthPlugin",
    CAP_PLUGIN_METHOD(authenticate, CAPPluginReturnPromise);
)
