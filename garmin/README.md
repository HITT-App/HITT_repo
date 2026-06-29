# HITT — Garmin Connect IQ App

The Monkey C source for the HITT Garmin watch app. See `~/hitt-app/docs/specs/SPEC_garmin_connect_iq.md` for the full delivery spec.

## Status

**Pre-development scaffold.** Files in this directory are the project skeleton — manifest, build targets, theme tokens — laid down so that work can start the day the Connect IQ SDK is installed on the dev machine.

This directory does **not** yet compile. The Connect IQ SDK (https://developer.garmin.com/connect-iq/) must be installed locally and a developer account approved (see TAPI-02 in the delivery spec) before any Monkey C builds will run.

## Layout

```
garmin/
├── README.md                  This file
├── manifest.xml               App metadata + target devices (TAPI-02 inputs)
├── monkey.jungle              Build targets and resource scoping
├── source/                    Monkey C source code (.mc) — empty until CIQ-02 lands
├── resources/
│   ├── strings/strings.xml    User-facing strings (en) — empty until CIQ-04
│   ├── menus/                 Menu definitions — empty until CIQ-04
│   ├── images/                App icons (PNG, 80×80 to 36×36)
│   └── drawables/
│       └── colors.xml         HITT theme tokens
```

## Target devices (Connect IQ SDK 4.x floor)

Set in `manifest.xml`. Devices released 2022 or later — picks up ~70% of actively-worn modern Garmins with a manageable test matrix (~12 representative models).

- Forerunner 165 / 255 / 265 / 265s / 955 / 965
- Fenix 7 / 7 Pro / 8 / 8s
- Epix 2 / Epix Pro
- Venu 3 / 3s / Sq 2
- Edge 540 / 840 / 1040 / 1050
- Instinct 2 / 2s / 3

(Older devices may be added post-launch based on demand.)

## What's NOT in this scaffold yet

- Any actual Monkey C source (`.mc` files) — lands with CIQ-02 (auth) onwards
- App icon PNGs — needs design pass before final submission
- CI build step — pending Connect IQ SDK installed on a build agent

## Next stories that touch this directory

- **CIQ-02** Device-pair code login. First story to land Monkey C in `source/`.
- **CIQ-03** Persistent storage layer.
- **CIQ-04** Activity recording start/pause/lap/stop.

See `~/hitt-app/docs/specs/SPEC_garmin_connect_iq.md` for full story breakdown.
