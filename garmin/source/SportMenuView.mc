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
    }
}
