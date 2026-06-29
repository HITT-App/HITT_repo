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
# 1. Boot an iPhone simulator (one-time per sim choice)
xcrun simctl list devices available | grep -i "iphone"
xcrun simctl boot "iPhone 16 Pro"       # or any other model

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

| File                          | What it asserts |
|---|---|
| `finish-activity.yaml`        | Tap a sport → tap Start → tap Finish → completion screen appears (regression guard for the Finish bug fixed on 2026-06-29) |
| `connected-devices.yaml`      | Profile → Connected Devices → Sync button works → "Synced" toast (or empty-state copy on a fresh user) |

## Notes

- The test creds (`hitt.qa.test@gmail.com` / `HITTqa2026!test`) are seeded
  in `.claude/settings.local.json` for the local environment. The flows do
  NOT log in automatically — sign in once manually before running the suite.
  This keeps the flows fast and avoids re-triggering OTP / rate limits.
- All assertions use accessible text and accessibility labels, not React
  internals — so they survive most styling refactors.
- If a flow drifts (text changes), run `maestro studio` to interactively
  re-pick selectors against the running app.
