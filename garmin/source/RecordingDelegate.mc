// Input handling during a recording session.
//
//   Short-press START/STOP (or on-screen SELECT on touch devices)
//     → toggle pause
//
//   BACK button, MENU button, OR hold START/STOP
//     → HITT stop-flash, then save/discard confirmation
//
// Garmin users have different muscle memory across watch families: some hold
// STOP (which the OS routes to onMenu on fenix / forerunner / Venu), some
// press BACK (Instinct / stock-app convention), some press MENU directly.
// Wiring onBack + onMenu to the same handler catches all three so nobody
// gets stuck ending a workout.
//
// The save confirmation itself is a native WatchUi.Confirmation dialog,
// which handles the two-button "Yes / No" UI consistently across the
// device matrix (round + rect, small + large displays).

import Toybox.WatchUi;
import Toybox.Application;
import Toybox.Lang;

class RecordingDelegate extends WatchUi.BehaviorDelegate {

    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() as Boolean {
        var view = WatchUi.getCurrentView()[0];
        if (view instanceof RecordingView) {
            (view as RecordingView).togglePause();
        }
        return true;
    }

    function onBack() as Boolean {
        return triggerEndWorkout();
    }

    function onMenu() as Boolean {
        return triggerEndWorkout();
    }

    private function triggerEndWorkout() as Boolean {
        var view = WatchUi.getCurrentView()[0];
        if (view instanceof RecordingView) {
            var rv = view as RecordingView;
            // Saved flash showing? Let the button pop cleanly to the sport
            // picker instead of trying to open a save prompt for a session
            // that's already saved. Otherwise: HITT flash + save prompt.
            if (rv.isFinished()) {
                return false;
            }
            rv.showSavePrompt();
        }
        return true;
    }
}

class SaveConfirmDelegate extends WatchUi.ConfirmationDelegate {

    private var mRecordingView as RecordingView;

    function initialize(view as RecordingView) {
        ConfirmationDelegate.initialize();
        mRecordingView = view;
    }

    function onResponse(response as WatchUi.Confirm) as Boolean {
        if (response == WatchUi.CONFIRM_YES) {
            // RecordingView switches to its "Saved" flash (HITT logo +
            // "Saved" text) and auto-pops itself back to the sport picker
            // after ~1.8s. Don't pop here — the confirmation dialog auto-pops
            // when we return true, and we want the recording view to remain
            // visible so the flash can render.
            mRecordingView.saveAndShowFinished();
        } else {
            mRecordingView.discardAndExit();
            // No flash for a discard — pop straight back to the picker.
            WatchUi.popView(WatchUi.SLIDE_RIGHT);
        }
        return true;
    }
}
