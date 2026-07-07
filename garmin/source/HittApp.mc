// HITT — Garmin Connect IQ app entry point.
//
// v0.1.0 MVP: sport picker → native ActivityRecording session. When the
// user saves, the FIT file lands on the watch and syncs to Garmin Connect,
// which then syncs to Apple Health (if the user has that turned on), which
// the HITT iPhone app picks up via its HealthKit aggregator. No BLE pairing
// with the phone in this version — that lands in CIQ-14 (Capacitor plugin
// wrapping ConnectIQ.xcframework) per SPEC_garmin_connect_iq.md §9.

import Toybox.Application;
import Toybox.WatchUi;
import Toybox.Lang;

class HittApp extends Application.AppBase {

    function initialize() {
        AppBase.initialize();
    }

    // Cold start, resume from background, from-glance launch — all land here.
    function onStart(state as Dictionary?) as Void {
        // Flush any workouts that couldn't push last time (e.g. the phone was
        // out of range mid-run). Safe no-op when the queue is empty or there's
        // no token / no connectivity; a failed drain re-queues itself.
        PushClient.drainPendingIfAny();
    }

    function onStop(state as Dictionary?) as Void {
        // AppBase teardown handles the ActivityRecording session if one is
        // in-flight — we don't try to persist state across app kills in v0.1.
        // Crash-recovery ("resume previous workout") lands in CIQ-11.
    }

    function getInitialView() as [Views] or [Views, InputDelegates] {
        return [ new SportMenuView(), new SportMenuDelegate() ];
    }
}
