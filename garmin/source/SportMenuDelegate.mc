// Handles the sport picker selection — creates an ActivityRecording
// session with the appropriate sport / sub-sport codes and pushes the
// recording view.

import Toybox.WatchUi;
import Toybox.Activity;
import Toybox.Application;
import Toybox.Lang;

class SportMenuDelegate extends WatchUi.Menu2InputDelegate {

    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var sport = Activity.SPORT_GENERIC;
        var subSport = Activity.SUB_SPORT_GENERIC;
        var name = item.getLabel();

        // Sport code table — see Toybox.Activity.Sport enum in the
        // Connect IQ SDK docs. Strength / HIIT map to SPORT_TRAINING with a
        // sub-sport hint so Garmin Connect categorises the FIT properly.
        switch (item.getId()) {
            case :run:
                sport = Activity.SPORT_RUNNING;
                break;
            case :walk:
                sport = Activity.SPORT_WALKING;
                break;
            case :bike:
                sport = Activity.SPORT_CYCLING;
                break;
            case :swim:
                sport = Activity.SPORT_SWIMMING;
                break;
            case :strength:
                sport = Activity.SPORT_TRAINING;
                subSport = Activity.SUB_SPORT_STRENGTH_TRAINING;
                break;
            case :hiit:
                sport = Activity.SPORT_TRAINING;
                subSport = Activity.SUB_SPORT_CARDIO_TRAINING;
                break;
            case :pair:
                // Pair-with-phone flow. Doesn't start a session — pushes
                // AuthPairingView and returns to the sport picker on
                // completion (via popBack in AuthPairingView).
                var pairView = new AuthPairingView();
                WatchUi.pushView(
                    pairView,
                    new AuthPairingDelegate(pairView),
                    WatchUi.SLIDE_LEFT
                );
                return;
            case :reset_pairing:
                // Self-serve recovery. Clear the stored JWT so next time
                // the sport picker is rebuilt the "Pair with iPhone" entry
                // reappears in place of this one. Also drop the pending
                // queue so we don't push stale workouts under a new pairing.
                PushClient.clearToken();
                Application.Storage.deleteValue("hitt.pending");
                // Force the menu to rebuild — pop this view and re-open
                // the sport picker with fresh menu items.
                WatchUi.popView(WatchUi.SLIDE_RIGHT);
                WatchUi.pushView(
                    new SportMenuView(),
                    new SportMenuDelegate(),
                    WatchUi.SLIDE_LEFT
                );
                return;
        }

        WatchUi.pushView(
            new RecordingView(sport, subSport, name),
            new RecordingDelegate(),
            WatchUi.SLIDE_LEFT
        );
    }
}
