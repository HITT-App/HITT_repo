// Handles the sport picker selection — creates an ActivityRecording
// session with the appropriate sport / sub-sport codes and pushes the
// recording view.

import Toybox.WatchUi;
import Toybox.ActivityRecording;
import Toybox.Application;
import Toybox.Lang;

class SportMenuDelegate extends WatchUi.Menu2InputDelegate {

    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var sport = ActivityRecording.SPORT_GENERIC;
        var subSport = ActivityRecording.SUB_SPORT_GENERIC;
        var name = item.getLabel();

        // Sport code table — see Toybox.ActivityRecording.Sport enum in the
        // Connect IQ SDK docs. Strength / HIIT map to SPORT_TRAINING with a
        // sub-sport hint so Garmin Connect categorises the FIT properly.
        switch (item.getId()) {
            case :run:
                sport = ActivityRecording.SPORT_RUNNING;
                break;
            case :walk:
                sport = ActivityRecording.SPORT_WALKING;
                break;
            case :bike:
                sport = ActivityRecording.SPORT_CYCLING;
                break;
            case :swim:
                sport = ActivityRecording.SPORT_SWIMMING;
                break;
            case :strength:
                sport = ActivityRecording.SPORT_TRAINING;
                subSport = ActivityRecording.SUB_SPORT_STRENGTH_TRAINING;
                break;
            case :hiit:
                sport = ActivityRecording.SPORT_TRAINING;
                subSport = ActivityRecording.SUB_SPORT_CARDIO_TRAINING;
                break;
        }

        WatchUi.pushView(
            new RecordingView(sport, subSport, name),
            new RecordingDelegate(),
            WatchUi.SLIDE_LEFT
        );
    }
}
