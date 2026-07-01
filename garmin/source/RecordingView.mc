// Live recording screen + post-save confirmation flash.
//
// Layout — three rows centred vertically, spaced using each font's height
// so nothing overlaps regardless of device screen size:
//
//     [sport name]           FONT_SMALL, dim
//     [big elapsed timer]    FONT_NUMBER_MEDIUM, white
//     [PAUSED if paused]     FONT_SMALL, HITT orange
//
// After the user picks Save on the confirmation dialog, the same view
// switches to a "Saved" flash (HITT logo + orange text) for ~1.8s before
// auto-popping back to the sport picker. Cleaner than pushing a new
// view: no view-stack juggling with the ConfirmationDelegate.

import Toybox.WatchUi;
import Toybox.ActivityRecording;
import Toybox.Graphics;
import Toybox.System;
import Toybox.Timer;
import Toybox.Application;
import Toybox.Lang;

class RecordingView extends WatchUi.View {

    private const HITT_ORANGE = 0xF97316;

    private var mSession as ActivityRecording.Session?;
    private var mSport as ActivityRecording.Sport;
    private var mSubSport as ActivityRecording.SubSport;
    private var mName as String;

    private var mTickTimer as Timer.Timer?;
    private var mFinishTimer as Timer.Timer?;
    private var mStartMs as Number = 0;
    private var mAccumulatedMs as Number = 0;
    private var mPaused as Boolean = false;
    private var mFinished as Boolean = false;

    function initialize(sport as ActivityRecording.Sport, subSport as ActivityRecording.SubSport, name as String) {
        View.initialize();
        mSport = sport;
        mSubSport = subSport;
        mName = name;
    }

    function onShow() as Void {
        var opts = {
            :sport => mSport,
            :subSport => mSubSport,
            :name => mName
        };
        mSession = ActivityRecording.createSession(opts);
        mSession.start();
        mStartMs = System.getTimer();

        mTickTimer = new Timer.Timer();
        mTickTimer.start(method(:onTick), 1000, true);
    }

    function onHide() as Void {
        if (mTickTimer != null) {
            mTickTimer.stop();
            mTickTimer = null;
        }
        if (mFinishTimer != null) {
            mFinishTimer.stop();
            mFinishTimer = null;
        }
    }

    function onTick() as Void {
        if (!mPaused && !mFinished) {
            WatchUi.requestUpdate();
        }
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        if (mFinished) {
            drawFinishedScreen(dc);
        } else {
            drawRecordingScreen(dc);
        }
    }

    private function drawRecordingScreen(dc as Graphics.Dc) as Void {
        var cx = dc.getWidth() / 2;
        var cy = dc.getHeight() / 2;

        var timerFont = Graphics.FONT_NUMBER_MEDIUM;
        var smallFont = Graphics.FONT_SMALL;
        var timerH = dc.getFontHeight(timerFont);
        var smallH = dc.getFontHeight(smallFont);
        var gap = 14;

        // Sport name — above the timer, gap+halfHeight above the timer's top edge.
        var sportY = cy - (timerH / 2) - gap - (smallH / 2);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, sportY, smallFont, mName,
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Timer — vertical centre of the screen.
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, cy, timerFont, formatElapsed(),
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Paused — below the timer with the same gap.
        if (mPaused) {
            var pausedY = cy + (timerH / 2) + gap + (smallH / 2);
            dc.setColor(HITT_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, pausedY, smallFont,
                Application.loadResource(Rez.Strings.Paused) as String,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }
    }

    private function drawFinishedScreen(dc as Graphics.Dc) as Void {
        var cx = dc.getWidth() / 2;
        var cy = dc.getHeight() / 2;

        var savedFont = Graphics.FONT_MEDIUM;
        var smallFont = Graphics.FONT_SMALL;
        var savedH = dc.getFontHeight(savedFont);
        var smallH = dc.getFontHeight(smallFont);

        // HITT icon — centred above the "Saved" text.
        var icon = Application.loadResource(Rez.Drawables.LauncherIcon) as WatchUi.BitmapResource;
        var iconY = cy - (savedH / 2) - 20 - icon.getHeight();
        dc.drawBitmap(cx - (icon.getWidth() / 2), iconY, icon);

        // "Saved" — HITT orange, medium font.
        dc.setColor(HITT_ORANGE, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, cy, savedFont,
            Application.loadResource(Rez.Strings.Saved) as String,
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);

        // Elapsed time recap — dim, below.
        var recapY = cy + (savedH / 2) + 10 + (smallH / 2);
        dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
        dc.drawText(cx, recapY, smallFont, formatElapsed(),
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
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

    // ── Called from RecordingDelegate ──────────────────────────────────

    function togglePause() as Void {
        if (mSession == null || mFinished) { return; }
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

    // Called by SaveConfirmDelegate on "Yes". Saves the session then flips
    // this view into "finished" state — the HITT-logo "Saved" flash renders
    // for ~1.8s, then autoDismiss pops back to the sport picker.
    function saveAndShowFinished() as Void {
        if (mSession != null) {
            if (!mPaused) {
                mSession.stop();
            }
            mSession.save();
            mSession = null;
        }
        mFinished = true;
        if (mTickTimer != null) {
            mTickTimer.stop();
            mTickTimer = null;
        }
        WatchUi.requestUpdate();

        mFinishTimer = new Timer.Timer();
        mFinishTimer.start(method(:autoDismiss), 1800, false);
    }

    function discardAndExit() as Void {
        if (mSession != null) {
            if (!mPaused) {
                mSession.stop();
            }
            mSession.discard();
            mSession = null;
        }
    }

    function autoDismiss() as Void {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
    }
}
