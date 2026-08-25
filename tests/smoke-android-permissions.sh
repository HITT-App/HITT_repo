#!/usr/bin/env bash
# Smoke test: the Android build declares every permission its WebView features need.
#
# versionCode 12 shipped without CAMERA or RECORD_AUDIO. The body scan and barcode scanner
# call getUserMedia for video and the voice coach for audio, but because we use getUserMedia
# directly rather than @capacitor/camera, no plugin injected them.
#
# The failure is silent and easy to miss: Capacitor's BridgeWebChromeClient DOES request the
# permission at runtime, but Android auto-denies a runtime request for an undeclared
# permission. The user sees "Could not access camera. Please check permissions." and finds no
# camera permission in Settings to grant — because an undeclared permission never appears there.
#
# Checks the MERGED manifest, never the source: plugins add and remove permissions at merge
# time, so the source file is not evidence of what ships.
#
# Usage:  ./tests/smoke-android-permissions.sh          (uses the last release build)
#         ./tests/smoke-android-permissions.sh --build  (regenerates the merged manifest first)
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
MERGED="android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml"

if [ "${1:-}" = "--build" ] || [ ! -f "$MERGED" ]; then
  echo "Generating merged manifest…"
  (cd android && ./gradlew -q :app:processReleaseMainManifest) || { echo "FAIL: gradle"; exit 1; }
fi
[ -f "$MERGED" ] || { echo "FAIL: no merged manifest at $MERGED"; exit 1; }

fails=0

require() { # name, why
  if grep -q "android.permission.$1\"" "$MERGED"; then
    echo "  PASS  $1"
  else
    echo "  FAIL  $1 missing — $2"
    fails=$((fails + 1))
  fi
}

forbid() { # name, why
  if grep -q "android.permission.$1\"" "$MERGED"; then
    echo "  FAIL  $1 present — $2"
    fails=$((fails + 1))
  else
    echo "  PASS  $1 absent"
  fi
}

echo "Permissions the WebView capture surfaces need:"
require CAMERA        "body scan + barcode scanner getUserMedia({video}) will be auto-denied"
require RECORD_AUDIO  "voice coach getUserMedia({audio}) will be auto-denied"
require MODIFY_AUDIO_SETTINGS "Capacitor requests it alongside RECORD_AUDIO"
require INTERNET      "no network at all"
require POST_NOTIFICATIONS "push permission prompt never shows on Android 13+"

echo
echo "Hardware must stay optional (declaring CAMERA otherwise filters the app off Play for"
echo "devices without one):"
for f in android.hardware.camera android.hardware.microphone; do
  # The merged manifest splits uses-feature across lines, so match the name then its flag.
  if grep -A2 "name=\"$f\"" "$MERGED" | grep -q 'required="false"'; then
    echo "  PASS  $f required=false"
  else
    echo "  FAIL  $f is not marked required=false"
    fails=$((fails + 1))
  fi
done

echo
echo "Health Connect scope — must stay at exactly the 13 declared to Play:"
count=$(grep -oE 'android.permission.health.[A-Z_]+' "$MERGED" | sort -u | wc -l | tr -d ' ')
if [ "$count" = "13" ]; then
  echo "  PASS  13 health permissions"
else
  echo "  FAIL  $count health permissions, expected 13 — the Play declaration will not match"
  fails=$((fails + 1))
fi
# HRV caused a Health Connect Minimum Scope rejection. Nothing consumes it.
forbid health.READ_HEART_RATE_VARIABILITY "caused the 2026-08-01 Minimum Scope rejection"

echo
echo "Permissions we must NOT ship:"
forbid ACCESS_BACKGROUND_LOCATION "needs a separate Play declaration we have not filed"
forbid QUERY_ALL_PACKAGES "Data Safety declares installed-apps as NOT collected"
forbid READ_EXTERNAL_STORAGE "photo picker needs no storage permission"

echo
if [ "$fails" -eq 0 ]; then
  echo "All checks passed."
else
  echo "$fails check(s) failed."
fi
exit "$fails"
