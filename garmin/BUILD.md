# Building the HITT `.iq` for Connect IQ Store upload

Step-by-step from "SDK not installed" to "signed `.iq` file ready to upload."

The Connect IQ Store's app-upload step requires a compiled `.iq` binary. This
directory is the Monkey C source; the build produces `HITT.iq`. That's what
you attach in the store's "Upload App" step.

## Prerequisites

- macOS with Xcode installed (for the JDK).
- ~2 GB free for the SDK cache.
- A Garmin developer account (already done — that's how you got to the
  "upload app" step).

## 1. Install the Connect IQ SDK

Garmin ships an SDK Manager app that handles installing and updating SDK
versions.

1. Download the SDK Manager from https://developer.garmin.com/connect-iq/sdk/
   (Mac version).
2. Open the downloaded `.dmg` and drag "Connect IQ SDK Manager" to Applications.
3. Launch it. Sign in with the same Garmin account you use for the store.
4. In the **SDK** tab, install the latest 8.x SDK (as of writing this,
   Connect IQ SDK 8.x is current). Wait for it to finish.
5. Note the SDK path shown in the SDK Manager (usually
   `~/Library/Application Support/Garmin/ConnectIQ/Sdks/connectiq-sdk-mac-8.x.x/`).

## 2. Generate a developer key (one-time)

The Connect IQ Store signs uploads against a private key you generate locally.
Do this once; keep the key file safe — you'll need it for every future build.

Inside SDK Manager: **Key** tab → **Generate Key** → choose a save location
(e.g. `~/hitt-connect-iq-developer.key`). Set a strong password if asked;
you'll type it every build.

Do NOT check this key into git. Add it to `.gitignore` if it ends up
inside the repo path.

## 3. Set up PATH so `monkeyc` is on the shell

Add to `~/.zshrc` (adjust the version number to match what SDK Manager
installed):

```bash
export CIQ_HOME="$HOME/Library/Application Support/Garmin/ConnectIQ/Sdks/connectiq-sdk-mac-8.1.1"
export PATH="$CIQ_HOME/bin:$PATH"
```

Reload: `source ~/.zshrc`. Verify: `monkeyc --version` should print a version.

## 4. Reserve a UUID from the Connect IQ Store

Log into https://apps.garmin.com/developer/dashboard. On the app you're
about to upload, note the **UUID** (Garmin generates one for each new app).
Copy it and paste it into `manifest.xml`, replacing the placeholder
`00000000-0000-0000-0000-000000000000`.

## 5. Build the `.iq`

From this directory:

```bash
cd /Users/vanessa/hitt-garmin/garmin

monkeyc \
  -f monkey.jungle \
  -o HITT.iq \
  -y ~/hitt-connect-iq-developer.key \
  -w \
  -e
```

Flag explanations:
- `-f monkey.jungle` — build config (device list, resource scoping)
- `-o HITT.iq` — output filename
- `-y <key>` — sign with your developer key
- `-w` — treat warnings as warnings, not errors (safer for first build)
- `-e` — package for Connect IQ Store distribution (produces a signed `.iq`
  as opposed to a `.prg` for local sideloading)

You'll be prompted for the key password. On success, `HITT.iq` appears in
this directory. That's the file you upload.

## 6. Upload

Back in the Store dashboard's "Upload App" step, attach `HITT.iq`. Garmin
validates the signature and checks it against your account. Fill in:

- **Description** — draft copy in `docs/specs/garmin_developer_application_draft.md`
- **Screenshots** — need to be generated (see BUILD_TODO below)
- **Category** — "Health & Fitness"
- **Distribution region** — worldwide (excluding EEA initially — EEA has a
  separate review; add later once the app is proven stable)

Submit for review. Historical times: 3-10 business days.

## Local test before uploading

Before uploading to the store, run the `.iq` on the simulator to catch
crashes:

```bash
# Build a sideloadable .prg (unsigned, for the sim)
monkeyc -f monkey.jungle -o HITT.prg -d fr965

# Launch the simulator (opens a GUI)
open "$CIQ_HOME/bin/ConnectIQ.app"

# In the sim: File → Open → HITT.prg
# The sim boots a Forerunner 965 with the app installed. Test:
#  1. See sport picker
#  2. Tap Run → recording screen shows 0:00
#  3. START/STOP to pause → "PAUSED" appears
#  4. BACK → "Save this workout?" confirmation
#  5. Yes → app returns to picker (activity would save on real device)
```

Swap `fr965` for other device IDs to test the layout on smaller screens:
- `fenix7` — 260×260 round
- `fr255` — 260×260 round, smaller
- `venu3` — 454×454 AMOLED round
- `edge840` — 246×322 rect

## BUILD_TODO — outstanding pre-submission items

1. **Real UUID** — replace the `00000000-...` placeholder in `manifest.xml`
   with the one from the Connect IQ Store dashboard.
2. **Screenshots** — Garmin requires PNG screenshots at exact device
   resolutions. Take these in the simulator (File → Save Screenshot) for
   each supported device family. Minimum: one screenshot for one device.
3. **Icon polish** — `resources/drawables/launcher_icon.png` is currently the
   HITT iPhone app icon downscaled to 80×80. Fine for launch; a
   round-optimised version would look better on watch faces.
4. **App description + release notes** — draft in
   `docs/specs/garmin_developer_application_draft.md`.
