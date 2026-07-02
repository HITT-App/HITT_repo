// 6-digit pairing code entry screen. Shown once, on first launch when no
// pairing JWT exists in PersistedContent. After successful pair the
// watch stores the JWT and this view isn't shown again unless the phone
// revokes the pairing.
//
// Layout — three rows centred vertically:
//
//     [Enter code from iPhone]     FONT_SMALL, dim
//     [ _ _ _ _ _ _ ]              FONT_NUMBER_MEDIUM, current digit highlighted
//     [UP/DOWN change · START ok]  FONT_XTINY, dim
//
// Input:
//   UP    → current digit +1 (wraps 0..9)
//   DOWN  → current digit -1
//   START → advance cursor; on 6th press, submit
//   BACK  → cancel + pop back to sport picker (user can pair later)

import Toybox.WatchUi;
import Toybox.Graphics;
import Toybox.System;
import Toybox.Timer;
import Toybox.Lang;

class AuthPairingView extends WatchUi.View {

    private const HITT_ORANGE = 0xF97316;

    private var mDigits as Array<Number> = [0, 0, 0, 0, 0, 0];
    private var mCursor as Number = 0;
    private var mSubmitting as Boolean = false;
    private var mResultMessage as String = "";
    private var mResultIsError as Boolean = false;

    function initialize() {
        View.initialize();
    }

    function onUpdate(dc as Graphics.Dc) as Void {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();

        var cx = dc.getWidth() / 2;
        var cy = dc.getHeight() / 2;
        var digitFont = Graphics.FONT_NUMBER_MEDIUM;
        var smallFont = Graphics.FONT_SMALL;
        var tinyFont  = Graphics.FONT_XTINY;
        var digitH    = dc.getFontHeight(digitFont);
        var smallH    = dc.getFontHeight(smallFont);
        var tinyH     = dc.getFontHeight(tinyFont);
        var gap       = 12;

        // Title (or result message)
        var titleY = cy - (digitH / 2) - gap - (smallH / 2);
        if (mResultMessage.length() > 0) {
            dc.setColor(mResultIsError ? HITT_ORANGE : Graphics.COLOR_GREEN, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, titleY, smallFont, mResultMessage,
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        } else {
            dc.setColor(Graphics.COLOR_LT_GRAY, Graphics.COLOR_TRANSPARENT);
            dc.drawText(cx, titleY, smallFont, "Enter code from iPhone",
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }

        // Digits — 6 slots centered horizontally. Highlight the current cursor.
        var slotW = dc.getTextWidthInPixels("0", digitFont) + 4;
        var totalW = slotW * 6;
        var startX = cx - totalW / 2 + slotW / 2;
        for (var i = 0; i < 6; i++) {
            var x = startX + i * slotW;
            var isCursor = (i == mCursor) && !mSubmitting;
            dc.setColor(isCursor ? HITT_ORANGE : Graphics.COLOR_WHITE, Graphics.COLOR_TRANSPARENT);
            dc.drawText(x, cy, digitFont, mDigits[i].format("%d"),
                Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
        }

        // Hint
        var hintY = cy + (digitH / 2) + gap + (tinyH / 2);
        dc.setColor(Graphics.COLOR_DK_GRAY, Graphics.COLOR_TRANSPARENT);
        var hint = mSubmitting ? "Pairing…" : "UP/DOWN change · START ok";
        dc.drawText(cx, hintY, tinyFont, hint,
            Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
    }

    // ── Called from AuthPairingDelegate ────────────────────────────────

    function incCurrent() as Void {
        if (mSubmitting) { return; }
        mDigits[mCursor] = (mDigits[mCursor] + 1) % 10;
        WatchUi.requestUpdate();
    }

    function decCurrent() as Void {
        if (mSubmitting) { return; }
        mDigits[mCursor] = (mDigits[mCursor] + 9) % 10;
        WatchUi.requestUpdate();
    }

    function advanceOrSubmit() as Void {
        if (mSubmitting) { return; }
        if (mCursor < 5) {
            mCursor++;
            WatchUi.requestUpdate();
            return;
        }
        submit();
    }

    private function submit() as Void {
        mSubmitting = true;
        mResultMessage = "";
        WatchUi.requestUpdate();
        var code = "";
        for (var i = 0; i < 6; i++) {
            code = code + mDigits[i].format("%d");
        }
        var deviceLabel = System.getDeviceSettings().partNumber as String;
        PushClient.redeemCode(code, deviceLabel, method(:onPairResult));
    }

    function onPairResult(success as Boolean, message as String) as Void {
        mSubmitting = false;
        mResultMessage = message;
        mResultIsError = !success;
        WatchUi.requestUpdate();
        if (success) {
            // Brief celebratory beat, then pop back to sport picker.
            var t = new Timer.Timer();
            t.start(method(:popBack), 1200, false);
        }
    }

    function popBack() as Void {
        WatchUi.popView(WatchUi.SLIDE_RIGHT);
    }
}

class AuthPairingDelegate extends WatchUi.BehaviorDelegate {

    private var mView as AuthPairingView;

    function initialize(view as AuthPairingView) {
        BehaviorDelegate.initialize();
        mView = view;
    }

    function onSelect() as Boolean {
        mView.advanceOrSubmit();
        return true;
    }

    function onNextPage() as Boolean {
        mView.decCurrent();
        return true;
    }

    function onPreviousPage() as Boolean {
        mView.incCurrent();
        return true;
    }

    function onBack() as Boolean {
        // Cancel pairing — user can retry later from the sport picker.
        return false;   // let watchOS pop us back to the sport picker
    }
}
