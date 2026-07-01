// Input handling during a recording session.
//
//   Physical START/STOP button (or on-screen SELECT on touch devices)
//     → toggle pause
//
//   BACK button
//     → open save/discard confirmation (Garmin convention)
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
        var view = WatchUi.getCurrentView()[0];
        if (view instanceof RecordingView) {
            var prompt = new WatchUi.Confirmation(
                Application.loadResource(Rez.Strings.SavePrompt) as String
            );
            WatchUi.pushView(prompt,
                new SaveConfirmDelegate(view as RecordingView),
                WatchUi.SLIDE_IMMEDIATE);
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
            mRecordingView.saveAndExit();
        } else {
            mRecordingView.discardAndExit();
        }
        // Pop the RecordingView so the user lands back on the sport picker.
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
        return true;
    }
}
