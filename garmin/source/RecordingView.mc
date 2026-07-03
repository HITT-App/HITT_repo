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
import Toybox.Time;
import Toybox.Time.Gregorian;
import Toybox.Timer;
import Toybox.Position;
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
    private var mStopFlashTimer as Timer.Timer?;
    private var mStartMs as Number = 0;
    private var mAccumulatedMs as Number = 0;
    private var mPaused as Boolean = false;
    private var mFinished as Boolean = false;
    private var mStopFlash as Boolean = false;
    private var mSessionStarted as Boolean = false;

    function initialize(sport as ActivityRecording.Sport, subSport as ActivityRecording.SubSport, name as String) {
        View.initialize();
        mSport = sport;
        mSubSport = subSport;
        mName = name;
    }

    // onShow fires on FIRST show AND every time the view returns from being
    // covered — most commonly when a system notification pops up over us
    // and the user dismisses it. Two things matter:
    //
    //   1. Only create the ActivityRecording.Session once. Calling
    //      createSession() twice throws (a session is already active), and
    //      that's the source of the "notification dismiss → IQ error" bug.
    //
    //   2. Timers were stopped in onHide, so restart whichever ones the
    //      current state needs. Otherwise the Saved-flash auto-dismiss
    //      never fires, the stop-flash never advances to the save
    //      dialog, and the timer that ticks the elapsed display freezes.
    function onShow() as Void {
        if (!mSessionStarted) {
            mSessionStarted = true;
            var opts = {
                :sport => mSport,
                :subSport => mSubSport,
                :name => mName
            };
            mSession = ActivityRecording.createSession(opts);
            mSession.start();
            mStartMs = System.getTimer();

            // Belt-and-braces: ActivityRecording auto-enables GPS internally
            // for outdoor sports (running, walking, cycling, swimming) so the
            // FIT file records position, but on some device/firmware combos
            // the live Activity.getActivityInfo().elapsedDistance stays null
            // for the UI until Position events are ALSO subscribed. Explicit
            // enable here guarantees distance climbs on-screen for the user.
            // Skipped for indoor / non-GPS sports (strength, HIIT) — no
            // reason to burn GPS battery when distance is meaningless.
            if (isGpsBased(mSport)) {
                Position.enableLocationEvents(
                    Position.LOCATION_CONTINUOUS,
                    method(:onPositionUpdate)
                );
            }
        }

        // Elapsed-display tick — only while actively recording.
        if (mTickTimer == null && !mFinished && !mStopFlash && !mPaused) {
            mTickTimer = new Timer.Timer();
            mTickTimer.start(method(:onTick), 1000, true);
        }

        // Saved-flash auto-dismiss — restart with the same 1.8s window if
        // we were interrupted mid-flash. Slightly more time on screen than
        // the original schedule is fine; too little would strand the user.
        if (mFinished && mFinishTimer == null) {
            mFinishTimer = new Timer.Timer();
            mFinishTimer.start(method(:autoDismiss), 1800, false);
        }

        // Phase-1 brand flash (post-Save-Yes, pre-Saved-screen) — restart
        // its timer if a notification interrupted it. Same 700ms; the
        // callback advances into the Saved screen.
        if (mStopFlash && mStopFlashTimer == null) {
            mStopFlashTimer = new Timer.Timer();
            mStopFlashTimer.start(method(:enterSavedScreen), 700, false);
        }
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
        if (mStopFlashTimer != null) {
            mStopFlashTimer.stop();
            mStopFlashTimer = null;
        }
    }

    function onTick() as Void {
        if (!mPaused && !mFinished && !mStopFlash) {
            WatchUi.requestUpdate();
        }
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        if (mFinished) {
            drawFinishedScreen(dc);
        } else if (mStopFlash) {
            drawStopFlash(dc);
        } else {
            drawRecordingScreen(dc);
        }
    }

    // Full-screen HITT flash between the Stop press and the save/discard
    // confirmation. Same source frame as the phone's CompletionIntro so the
    // two apps feel like siblings.
    //
    // Belt-and-braces: paint the whole screen HITT-orange first, then centre
    // the logo bitmap on top. If loadResource returns null on a device that
    // can't decode the PNG (older Instinct, some MIP screens) we still get
    // an unmistakable orange flash + "HITT" wordmark rather than a black
    // frame that looks like the app hung.
    private function drawStopFlash(dc as Graphics.Dc) as Void {
        dc.setColor(HITT_ORANGE, HITT_ORANGE);
        dc.clear();

        var cx = dc.getWidth() / 2;
        var cy = dc.getHeight() / 2;

        var icon = Application.loadResource(Rez.Drawables.StopFlash) as WatchUi.BitmapResource?;
        if (icon != null) {
            dc.drawBitmap(cx - (icon.getWidth() / 2), cy - (icon.getHeight() / 2), icon);
        } else {
            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, cy, Graphics.FONT_LARGE, "HITT",
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
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

        // Distance + Calories row — pulled live from Activity.getActivityInfo().
        // Distance shows in km or miles based on device settings; calories are
        // whole kcal. Both hide themselves when Activity has no reading yet
        // (first ~2 seconds of a session) so the row doesn't flicker.
        //
        // Rendered BELOW the timer at the same gap as the sport name is above,
        // so the timer stays vertically centred and this row balances it out.
        //
        // Suppressed while paused — the PAUSED pill takes that slot instead
        // (see below). Bandwidth for one row of secondary info, not two.
        var metricsY = cy + (timerH / 2) + gap + (smallH / 2);
        var info = Toybox.Activity.getActivityInfo();
        if (!mPaused && info != null) {
            // Defensive reads — Garmin's Activity.Info returns values as
            // Number OR Float depending on device / firmware, and `as Float`
            // coercion has thrown "TypeCoercionException" on some fenix
            // firmwares when the underlying value was a Number. .toFloat()
            // safely widens either. Also unit-lookup wrapped so a missing
            // devices-setting field doesn't crash the whole draw pass.
            var useMetric = true;
            try {
                var settings = System.getDeviceSettings();
                if (settings != null && settings.distanceUnits != null) {
                    useMetric = settings.distanceUnits == System.UNIT_METRIC;
                }
            } catch (ex) { /* leave useMetric = true */ }

            var distStr = "-";
            var dist = info.elapsedDistance;
            if (dist != null) {
                var meters = dist.toFloat();
                if (useMetric) {
                    distStr = (meters / 1000.0).format("%.2f") + " km";
                } else {
                    distStr = (meters * 0.000621371).format("%.2f") + " mi";
                }
            }

            var calStr = "-";
            var cals = info.calories;
            if (cals != null) {
                calStr = cals.toNumber().format("%d") + " kcal";
            }

            // Two-column layout — distance left of centre, calories right.
            // Values in HITT orange, labels in dim grey underneath.
            var colWidth = dc.getWidth() / 2;
            var leftX = colWidth / 2 + 6;
            var rightX = colWidth + colWidth / 2 - 6;

            dc.setColor(HITT_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(leftX,  metricsY, smallFont, distStr,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
            dc.drawText(rightX, metricsY, smallFont, calStr,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }

        // Paused — HITT-orange rounded pill below the timer with the same gap.
        if (mPaused) {
            var pausedText = Application.loadResource(Rez.Strings.Paused) as String;
            var pausedY = cy + (timerH / 2) + gap + (smallH / 2);
            var textW = dc.getTextWidthInPixels(pausedText, smallFont);
            var padX = 14;
            var padY = 6;
            var pillW = textW + padX * 2;
            var pillH = smallH + padY * 2;
            var pillX = cx - pillW / 2;
            var pillY = pausedY - pillH / 2;
            var radius = pillH / 2;

            dc.setColor(HITT_ORANGE, Graphics.COLOR_TRANSPARENT);
            dc.fillRoundedRectangle(pillX, pillY, pillW, pillH, radius);

            dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, pausedY, smallFont, pausedText,
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

    function isFinished() as Boolean {
        return mFinished;
    }

    // Push the save/discard confirmation dialog immediately when the user
    // presses BACK. The HITT branded flash now runs *after* Save is picked,
    // between the confirmation and the "Saved" screen (see
    // saveAndShowFinished below) — v0.1.4 originally had it before, but
    // that got in the way of the natural stop→confirm rhythm.
    function showSavePrompt() as Void {
        if (mFinished) { return; }
        var prompt = new WatchUi.Confirmation(
            Application.loadResource(Rez.Strings.SavePrompt) as String
        );
        WatchUi.pushView(prompt,
            new SaveConfirmDelegate(self),
            WatchUi.SLIDE_IMMEDIATE);
    }

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

    // Called by SaveConfirmDelegate on "Yes". Two-phase transition:
    //
    //   Phase 1 (~700ms) — HITT-logo flash on orange background. Same
    //   visual as the stop-flash we used to show before the confirmation.
    //   Owner asked for the brand beat to land here instead, between
    //   confirm and Saved, so the flash reads as "recording, saved".
    //
    //   Phase 2 (~1.8s) — "Saved" text + HITT logo + elapsed recap.
    //   drawFinishedScreen renders this. autoDismiss pops the view.
    //
    // Also fires a non-blocking direct HTTP push to push-garmin-watch-workout
    // via PushClient. Push failures are silent — the Fit-file path via
    // Garmin Connect → Apple Health still catches this workout.
    function saveAndShowFinished() as Void {
        var totalMs = mAccumulatedMs;
        if (mSession != null) {
            if (!mPaused && mStartMs > 0) {
                totalMs += System.getTimer() - mStartMs;
            }
            if (!mPaused) {
                mSession.stop();
            }
            mSession.save();
            mSession = null;
            disableGpsIfActive();
        }
        if (mTickTimer != null) {
            mTickTimer.stop();
            mTickTimer = null;
        }

        // Phase 1: brand flash. drawStopFlash draws the orange background +
        // HITT bitmap; we reuse mStopFlash so no new state / draw path.
        mStopFlash = true;
        WatchUi.requestUpdate();

        // Fire-and-forget push right away — no reason to wait 700ms for
        // network I/O to start.
        //
        // Wrapped in try/catch because Communications.makeWebRequest can
        // throw synchronously — most commonly PermissionRequiredException
        // if the user denied the Communications permission at install, or
        // a stale-JWT edge case where the connection setup itself fails.
        // Push failures MUST be silent from the user's perspective: the
        // Fit-file path via Apple Health still catches this workout, and
        // an uncaught exception here would surface the generic IQ error
        // dialog that casey saw (2026-07-02).
        try {
            var durationSec = totalMs / 1000;
            var now = Time.now();
            var endedAt = formatIso(now);
            var startedAt = formatIso(new Time.Moment(now.value() - durationSec));
            PushClient.pushWorkout({
                "workout_type"     => mName.toLower(),
                "start_time"       => startedAt,
                "end_time"         => endedAt,
                "duration_seconds" => durationSec,
            });
        } catch (ex) {
            System.println("[RecordingView] push failed silently: " + ex.getErrorMessage());
        }

        // After 700ms, drop into the "Saved" screen (Phase 2).
        mStopFlashTimer = new Timer.Timer();
        mStopFlashTimer.start(method(:enterSavedScreen), 700, false);
    }

    // Fired by mStopFlashTimer at the end of Phase 1. Flips into the
    // "Saved" screen and starts the auto-dismiss timer.
    function enterSavedScreen() as Void {
        mStopFlash = false;
        mStopFlashTimer = null;
        mFinished = true;
        WatchUi.requestUpdate();

        mFinishTimer = new Timer.Timer();
        mFinishTimer.start(method(:autoDismiss), 1800, false);
    }

    // ISO-8601 UTC formatter, no fractional seconds. Garmin's built-in
    // Time.Gregorian.info() returns local time by default; we force UTC
    // via the FORMAT_SHORT + explicit format string.
    private function formatIso(m as Time.Moment) as String {
        var info = Time.Gregorian.utcInfo(m, Time.FORMAT_SHORT);
        return info.year.format("%04d") + "-"
             + info.month.format("%02d") + "-"
             + info.day.format("%02d") + "T"
             + info.hour.format("%02d") + ":"
             + info.min.format("%02d") + ":"
             + info.sec.format("%02d") + "Z";
    }

    function discardAndExit() as Void {
        if (mSession != null) {
            if (!mPaused) {
                mSession.stop();
            }
            mSession.discard();
            mSession = null;
            disableGpsIfActive();
        }
    }

    // Returns true for sports where GPS distance is the expected primary
    // metric. Kept in one place so future sports (Hike, Row, Elliptical
    // outdoors) are easy to add.
    private function isGpsBased(sport as ActivityRecording.Sport) as Boolean {
        return sport == ActivityRecording.SPORT_RUNNING
            || sport == ActivityRecording.SPORT_WALKING
            || sport == ActivityRecording.SPORT_CYCLING
            || sport == ActivityRecording.SPORT_SWIMMING;
    }

    // Position events fire ~1 Hz once GPS locks — we just need them
    // subscribed so Activity.getActivityInfo() populates for the UI. The
    // callback itself is intentionally empty; the FIT recording engine
    // is the actual consumer of the position data.
    function onPositionUpdate(info as Position.Info) as Void {
        // no-op — see comment above
    }

    // Symmetric with the enable in onShow — only needs to disable if we
    // enabled. Safe to call unconditionally (no-op if never enabled).
    // Passes the same callback we registered on enable — some Garmin
    // firmwares crash if you pass null here instead of a Method ref.
    private function disableGpsIfActive() as Void {
        if (isGpsBased(mSport)) {
            Position.enableLocationEvents(
                Position.LOCATION_DISABLE,
                method(:onPositionUpdate)
            );
        }
    }

    function autoDismiss() as Void {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
    }
}
