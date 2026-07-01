// Live recording screen — shows the elapsed time in HH:MM:SS while a
// native Garmin ActivityRecording session is running underneath. The
// physical START/STOP button (top-right on wrist watches) toggles pause;
// BACK opens the save/discard confirmation.
//
// Kept minimal on purpose for v0.1.0: no lap markers, no HR / pace overlay,
// no distance banner. Those add value but they also multiply the device
// matrix testing surface (round vs rect displays, 208×208 up to 454×454).
// Every metric added is another chance to render badly on a device we
// don't own. Ship this first, iterate on layout after we have real
// user reports.

import Toybox.WatchUi;
import Toybox.ActivityRecording;
import Toybox.Graphics;
import Toybox.System;
import Toybox.Timer;
import Toybox.Application;
import Toybox.Lang;

class RecordingView extends WatchUi.View {

    private var mSession as ActivityRecording.Session?;
    private var mSport as ActivityRecording.Sport;
    private var mSubSport as ActivityRecording.SubSport;
    private var mName as String;

    private var mTimer as Timer.Timer?;
    private var mStartMs as Number = 0;
    private var mAccumulatedMs as Number = 0;  // time from finished segments
    private var mPaused as Boolean = false;

    function initialize(sport as ActivityRecording.Sport, subSport as ActivityRecording.SubSport, name as String) {
        View.initialize();
        mSport = sport;
        mSubSport = subSport;
        mName = name;
    }

    function onShow() as Void {
        // Fresh session — createSession is idempotent per view lifecycle.
        var opts = {
            :sport => mSport,
            :subSport => mSubSport,
            :name => mName
        };
        mSession = ActivityRecording.createSession(opts);
        mSession.start();
        mStartMs = System.getTimer();

        // Redraw once per second for the elapsed counter. The activity
        // itself keeps recording at native cadence (HR ~1Hz, GPS ~1Hz).
        mTimer = new Timer.Timer();
        mTimer.start(method(:onTick), 1000, true);
    }

    function onHide() as Void {
        if (mTimer != null) {
            mTimer.stop();
            mTimer = null;
        }
    }

    function onTick() as Void {
        if (!mPaused) {
            WatchUi.requestUpdate();
        }
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        var w = dc.getWidth();
        var h = dc.getHeight();
        var centerX = w / 2;
        var centerY = h / 2;

        dc.drawText(centerX, centerY - 40, Graphics.FONT_SMALL, mName,
            Graphics.TEXT_JUSTIFY_CENTER);

        dc.drawText(centerX, centerY - 15, Graphics.FONT_NUMBER_MEDIUM, formatElapsed(),
            Graphics.TEXT_JUSTIFY_CENTER);

        if (mPaused) {
            dc.setColor(Graphics.COLOR_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(centerX, centerY + 30, Graphics.FONT_SMALL,
                Application.loadResource(Rez.Strings.Paused),
                Graphics.TEXT_JUSTIFY_CENTER);
        }
    }

    private function formatElapsed() as String {
        var totalMs = mAccumulatedMs;
        if (!mPaused && mStartMs > 0) {
            totalMs += System.getTimer() - mStartMs;
        }
        var totalSec = totalMs / 1000;
        var hours = totalSec / 3600;
        var minutes = (totalSec / 60) % 60;
        var seconds = totalSec % 60;
        if (hours > 0) {
            return hours.format("%d") + ":" + minutes.format("%02d") + ":" + seconds.format("%02d");
        }
        return minutes.format("%d") + ":" + seconds.format("%02d");
    }

    // Called by RecordingDelegate on physical START/STOP press.
    function togglePause() as Void {
        if (mSession == null) { return; }
        if (mPaused) {
            mSession.start();
            mStartMs = System.getTimer();
            mPaused = false;
        } else {
            mSession.stop();
            mAccumulatedMs += System.getTimer() - mStartMs;
            mStartMs = 0;
            mPaused = true;
        }
        WatchUi.requestUpdate();
    }

    // Called after the user picks "Yes" on the save confirmation.
    function saveAndExit() as Void {
        if (mSession == null) { return; }
        if (!mPaused) {
            mSession.stop();
        }
        mSession.save();
        mSession = null;
    }

    // Called after the user picks "No" on the save confirmation.
    function discardAndExit() as Void {
        if (mSession == null) { return; }
        if (!mPaused) {
            mSession.stop();
        }
        mSession.discard();
        mSession = null;
    }
}
