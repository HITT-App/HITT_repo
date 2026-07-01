# HITT — Garmin Connect IQ App

The Monkey C source for the HITT Garmin watch app.

**v0.1.0 scope (uploadable MVP):** sport picker → native Garmin activity
recording → save to Garmin Connect. The recorded activity syncs from Garmin
Connect to Apple Health, which the HITT iPhone app already picks up via its
multi-wearable HealthKit aggregator. So the user round-trip works with zero
BLE / OAuth code in this version.

**Later (per `docs/specs/SPEC_garmin_connect_iq.md` §9 — Connect IQ-only
architecture):** pair-code Bluetooth login (CIQ-02), receive scheduled HITT
workouts on the watch (CIQ-03..07), HITT-branded HIIT interval engine,
triathlon multi-sport with HITT plan overlay, live in-workout data mirror
back to the HITT iPhone app.

## To ship v0.1.0

Read **`BUILD.md`** — step-by-step from "SDK not installed" to
"signed `.iq` file ready to upload." The Connect IQ Store's "Upload App"
step requires that binary.

Two things need to be done before that guide's final step (the actual
`monkeyc` build):

1. Replace the placeholder UUID in `manifest.xml` with the one Garmin
   reserved in the store dashboard.
2. Install the Connect IQ SDK Manager and generate a developer key.

## Layout

```
garmin/
├── README.md                          This file
├── BUILD.md                           Owner build guide (SDK install → .iq upload)
├── manifest.xml                       App metadata + supported devices
├── monkey.jungle                      Build config (source paths, resource scoping)
├── source/
│   ├── HittApp.mc                     AppBase entry point
│   ├── SportMenuView.mc               Sport picker (Menu2 with 6 items)
│   ├── SportMenuDelegate.mc           Menu selection → creates recording session
│   ├── RecordingView.mc               Live recording screen (elapsed timer)
│   └── RecordingDelegate.mc           START/STOP + BACK → save confirmation
├── resources/
│   ├── strings/strings.xml            User-facing strings (English)
│   ├── drawables/
│   │   ├── drawables.xml              Drawable manifest (launcher icon binding)
│   │   ├── launcher_icon.png          80×80 app icon (downscaled HITT logo)
│   │   └── colors.xml                 HITT theme tokens (for future use)
│   └── images/                        Reserved for future artwork
└── (resources-launcher/ not needed for v0.1 — using resources/drawables)
```

## Supported devices

Set in `manifest.xml`. Devices released 2022+ (Connect IQ SDK 4.x floor).
Covers ~70% of actively-worn modern Garmins with a manageable test matrix.

- **Forerunner** 165 / 255 / 265 / 265s / 955 / 965
- **Fenix** 7 / 7 Pro / 8 / 8s
- **Epix** 2 / Epix Pro
- **Venu** 3 / 3s / Sq 2
- **Edge** 540 / 840 / 1040 / 1050
- **Instinct** 2 / 2s / 3

Older devices may be added post-launch based on demand.

## The upgrade path — where the BLE-paired features live

The Connect IQ-only architecture pivot (`docs/specs/SPEC_garmin_connect_iq.md`
§9, 2026-06-30) means everything beyond v0.1.0 goes over Bluetooth LE between
the HITT iPhone app and this Connect IQ app.

- **CIQ-14** — Capacitor plugin wrapping `ConnectIQ.xcframework` on the iPhone
  side. Discovers Garmin devices, negotiates a paired session.
- **CIQ-02 (revised)** — pair-code login: user types a 6-digit code from the
  watch into the iPhone app. Handshake completes over BLE, watch stores an
  opaque HITT auth token in `Storage.setValue()`.
- **CIQ-03..07** — receive scheduled workouts, HIIT interval engine, triathlon
  multi-sport with per-leg targets, live data mirror.

None of that is in v0.1.0. Ship this first, add BLE later.
