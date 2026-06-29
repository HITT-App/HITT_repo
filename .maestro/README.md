# Maestro UI flows

Mobile UI tests for the HITT iOS app. Runs against the iOS Simulator with
a real build of the app installed.

## Prerequisites

Both Maestro and OpenJDK are **already installed** in this machine's
Homebrew + `~/.maestro`. New terminals need this once on PATH:

```bash
# Add to ~/.zshrc if not already there
export PATH="/opt/homebrew/opt/openjdk/bin:$HOME/.maestro/bin:$PATH"
```

For a fresh machine:

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
brew install openjdk
```

## Running the flows

```bash
# 1. Boot an iPhone simulator. List what's actually installed first —
#    Xcode ships different model names per iOS version. As of iOS 26
#    the models are iPhone 17 / 17 Pro / 17 Pro Max / 17e / Air.
xcrun simctl list devices available | grep -i "iphone"
xcrun simctl boot "iPhone 17 Pro"       # pick one from the list above

# 2. Install the HITT app on the booted simulator
cd ~/hitt-app
npx cap run ios --no-sync               # builds + installs to the booted sim

# 3. Sign in to the app ONCE manually with the test creds:
#    hitt.qa.test@gmail.com / HITTqa2026!test
#    (Maestro reuses the persisted session via clearState: false)

# 4. Run a flow
maestro test .maestro/finish-activity.yaml
maestro test .maestro/connected-devices.yaml

# OR run the whole directory
maestro test .maestro

# Iterate on selectors interactively when text drifts
maestro studio
```

If the flow fails on a `tapOn` step, Maestro saves a screenshot to
`~/.maestro/tests/<timestamp>/` showing the screen state at the failure
— useful for spotting text changes that broke a matcher.

## Flow inventory

| File                          | What it asserts | Pre-condition |
|---|---|---|
| `finish-activity.yaml`        | Tap "Ready?" → tap Finish → completion screen renders within 3s (regression guard for the Finish bug fixed on 2026-06-29) | App open on ActivityLive pre-start screen |
| `connected-devices.yaml`      | Page renders + Sync button responds | App open on Connected Devices page |

Both flows are **anchored** — they start from a known screen rather than
navigating there. Reason: the home-page navigation paths use icon-only
buttons whose accessibility labels vary by Capacitor version, so selectors
written blindly tend to drift. Use Maestro Studio (below) to extend either
flow with the navigation prefix when you want full E2E coverage.

## Extending flows interactively

```bash
# With the HITT app open in the simulator, run:
maestro studio
```

Maestro Studio opens an interactive UI: tap an element in the simulator,
the right-pane shows the selector you'd use (text, accessibility id, etc.).
Copy that into your YAML, save, and re-run with `maestro test`.

## Notes

- The test creds (`hitt.qa.test@gmail.com` / `HITTqa2026!test`) are seeded
  in `.claude/settings.local.json` for the local environment. The flows do
  NOT log in automatically — sign in once manually before running the suite.
  This keeps the flows fast and avoids re-triggering OTP / rate limits.
- All assertions use accessible text and accessibility labels, not React
  internals — so they survive most styling refactors.
- If a flow drifts (text changes), run `maestro studio` to interactively
  re-pick selectors against the running app.
