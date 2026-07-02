// HTTP wrapper for pushing completed workouts to the HITT backend.
//
// Called from RecordingView.saveAndShowFinished() after the user
// confirms Save. Fire-and-forget from the user's point of view — we
// never block the "Saved" flash or the pop-back to the sport picker.
//
// If we don't have a JWT (unpaired) or the push fails, the Fit-file
// path via Garmin Connect → Apple Health → HITT still catches the
// workout later. Direct push is the "faster + richer payload" upgrade
// path, not the only source of truth.
//
// Persisted storage:
//   hitt.jwt    → the pairing JWT minted by redeem-garmin-pairing
//   hitt.pending → JSON array of workouts we couldn't push last time.
//                  Sent one-shot on next successful pair or on next
//                  successful push. Cap at 8 rows to bound flash usage.

import Toybox.Application;
import Toybox.Communications;
import Toybox.Lang;
import Toybox.System;

module PushClient {

    const BASE_URL     = "https://pbrqdlkjoxvglcdlixbi.supabase.co";
    const PUSH_PATH    = "/functions/v1/push-garmin-watch-workout";
    const KEY_JWT      = "hitt.jwt";
    const KEY_PENDING  = "hitt.pending";
    const MAX_PENDING  = 8;

    // Persistent JWT accessors ────────────────────────────────────────────

    function hasToken() as Boolean {
        var props = Application.Storage;
        var token = props.getValue(KEY_JWT);
        return token != null && (token as String).length() > 0;
    }

    function setToken(token as String) as Void {
        Application.Storage.setValue(KEY_JWT, token);
    }

    function clearToken() as Void {
        Application.Storage.deleteValue(KEY_JWT);
    }

    // Push flow ──────────────────────────────────────────────────────────

    // Push a completed workout. Silent on success and failure — caller
    // doesn't wait or block. On failure the payload is queued into
    // pending storage for retry on next launch.
    function pushWorkout(payload as Dictionary) as Void {
        var token = Application.Storage.getValue(KEY_JWT) as String?;
        if (token == null) {
            queuePending(payload);
            return;
        }
        var headers = {
            "Authorization" => "Bearer " + token,
            "Content-Type"  => Communications.REQUEST_CONTENT_TYPE_JSON,
        };
        var options = {
            :method       => Communications.HTTP_REQUEST_METHOD_POST,
            :headers      => headers,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
        };
        Communications.makeWebRequest(
            BASE_URL + PUSH_PATH,
            payload,
            options,
            new Lang.Method(PushClient, :onPushResponse)
        );
    }

    // Web request completion. On 401 (token invalid or pairing revoked),
    // clear the JWT so next launch prompts re-pair. On any other failure
    // we queue for retry.
    function onPushResponse(responseCode as Number, data as Dictionary or String or Null) as Void {
        if (responseCode == 200) {
            drainPendingIfAny();
            return;
        }
        if (responseCode == 401) {
            clearToken();
        }
        // Non-fatal — the Fit-file path still catches this workout.
        // No user-facing error surface on the watch.
    }

    // Retry queue ────────────────────────────────────────────────────────

    function queuePending(payload as Dictionary) as Void {
        var pending = Application.Storage.getValue(KEY_PENDING) as Array?;
        if (pending == null) { pending = []; }
        pending.add(payload);
        // Trim to the newest MAX_PENDING entries; flash is finite.
        if (pending.size() > MAX_PENDING) {
            pending = pending.slice(pending.size() - MAX_PENDING, pending.size());
        }
        Application.Storage.setValue(KEY_PENDING, pending);
    }

    // Called from onPushResponse on 200. Best-effort — if the drain
    // itself fails, the pending queue stays as-is for the next attempt.
    function drainPendingIfAny() as Void {
        var pending = Application.Storage.getValue(KEY_PENDING) as Array?;
        if (pending == null || pending.size() == 0) { return; }
        var token = Application.Storage.getValue(KEY_JWT) as String?;
        if (token == null) { return; }
        // Send them one at a time — Garmin doesn't have a batch endpoint
        // on our side and the volume is bounded (<= MAX_PENDING).
        var next = pending[0] as Dictionary;
        Application.Storage.setValue(KEY_PENDING, pending.slice(1, pending.size()));

        var headers = {
            "Authorization" => "Bearer " + token,
            "Content-Type"  => Communications.REQUEST_CONTENT_TYPE_JSON,
        };
        var options = {
            :method       => Communications.HTTP_REQUEST_METHOD_POST,
            :headers      => headers,
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
        };
        Communications.makeWebRequest(
            BASE_URL + PUSH_PATH,
            next,
            options,
            new Lang.Method(PushClient, :onPushResponse)  // recursion via 200 chain
        );
    }

    // ── Pairing flow ─────────────────────────────────────────────────────

    // Redeem a 6-digit pairing code for a JWT. Called from
    // AuthPairingDelegate when the user submits the code.
    function redeemCode(
        code as String,
        deviceLabel as String,
        onResult as Method(success as Boolean, message as String)
    ) as Void {
        var payload = {
            "code"         => code,
            "device_label" => deviceLabel,
        };
        // Content-Type MUST use the Communications.REQUEST_CONTENT_TYPE_*
        // constant (a Number Garmin recognises internally) — not the raw
        // string "application/json". With the string form, some device
        // firmwares silently reject the request before it goes out and
        // never fire the callback. Confirmed for casey's stuck pair on
        // 2026-07-02 (v0.2.3 → v0.2.4 → v0.2.5 fix).
        var options = {
            :method       => Communications.HTTP_REQUEST_METHOD_POST,
            :headers      => { "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON },
            :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON,
            :context      => onResult,
        };
        Communications.makeWebRequest(
            BASE_URL + "/functions/v1/redeem-garmin-pairing",
            payload,
            options,
            new Lang.Method(PushClient, :onRedeemResponse)
        );
    }

    function onRedeemResponse(
        responseCode as Number,
        data as Dictionary or String or Null,
        context as Object
    ) as Void {
        var callback = context as Method(success as Boolean, message as String);
        if (responseCode == 200 && data instanceof Dictionary) {
            var token = (data as Dictionary)["token"] as String?;
            if (token != null) {
                setToken(token);
                if (callback != null) { callback.invoke(true, "Paired"); }
                return;
            }
        }
        // Surface the exact response code in the error message so we can
        // triage without server logs. Garmin conventions:
        //   200-599: real HTTP status from the server
        //   negative: local Communications error (BLE/network/etc.)
        var msg;
        if (responseCode == 403) {
            msg = "Bad code (403)";
        } else if (responseCode == 429) {
            msg = "Too many tries (429)";
        } else if (responseCode == 400) {
            msg = "Format error (400)";
        } else if (responseCode == 401) {
            msg = "Auth blocked (401)";
        } else if (responseCode >= 500 && responseCode < 600) {
            msg = "Server " + responseCode;
        } else if (responseCode < 0) {
            msg = "No net " + responseCode;   // BLE / connectivity
        } else {
            msg = "Fail " + responseCode;
        }
        if (callback != null) { callback.invoke(false, msg); }
    }
}
