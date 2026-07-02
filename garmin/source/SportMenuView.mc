// Sport picker menu — the first screen the user sees after launching HITT
// from the Connect IQ Apps list. Six sports match the HITT iPhone app's
// activity categories and cover the vast majority of user sessions.

import Toybox.WatchUi;
import Toybox.Application;
import Toybox.Lang;

class SportMenuView extends WatchUi.Menu2 {

    function initialize() {
        Menu2.initialize({ :title => Application.loadResource(Rez.Strings.MenuTitle) });

        addItem(new WatchUi.MenuItem(
            Application.loadResource(Rez.Strings.SportRun),
            null, :run, {}));
        addItem(new WatchUi.MenuItem(
            Application.loadResource(Rez.Strings.SportWalk),
            null, :walk, {}));
        addItem(new WatchUi.MenuItem(
            Application.loadResource(Rez.Strings.SportBike),
            null, :bike, {}));
        addItem(new WatchUi.MenuItem(
            Application.loadResource(Rez.Strings.SportSwim),
            null, :swim, {}));
        addItem(new WatchUi.MenuItem(
            Application.loadResource(Rez.Strings.SportStrength),
            null, :strength, {}));
        addItem(new WatchUi.MenuItem(
            Application.loadResource(Rez.Strings.SportHIIT),
            null, :hiit, {}));

        // Pair-with-phone entry point — offered at the bottom of the list
        // when the watch doesn't have a JWT in Storage. Reset-pairing item
        // shown INSTEAD when a JWT is already stored, so users who got
        // stuck (server-side revoked but watch didn't know) can self-serve.
        if (!PushClient.hasToken()) {
            addItem(new WatchUi.MenuItem(
                Application.loadResource(Rez.Strings.MenuPair),
                Application.loadResource(Rez.Strings.MenuPairSub),
                :pair, {}));
        } else {
            addItem(new WatchUi.MenuItem(
                Application.loadResource(Rez.Strings.MenuReset),
                Application.loadResource(Rez.Strings.MenuResetSub),
                :reset_pairing, {}));
        }
    }
}
