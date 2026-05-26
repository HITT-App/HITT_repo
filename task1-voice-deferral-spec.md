# Task 1 (deferral): Disable voice for v1.0, hide UI surface

**Type:** Feature deferral
**Files affected:**
- `src/contexts/TTSContext.tsx` (hardcode disabled state)
- `src/components/HomeHero.tsx` (remove greeting useEffect call)
- `src/components/JarvisMode.tsx` (remove volume icon, remove speak calls)
- `src/pages/ChatSettings.tsx` (hide voice-related UI rows)
- Possibly `src/components/VoiceController.tsx` (any remaining voice config UI)
**Estimated effort:** 1–2 hours
**Why:** Three patch attempts (Builds 100, 101, 102) failed to deliver reliable voice. Voice is being deferred to v1.0.1 to unblock launch.

---

## Context

After three iterations attempting to fix voice bugs (name correctness, echo, gesture-window failures, history contamination), Build 102 still produced "Voice unavailable right now" toasts and silent greetings. The diagnostic each round identified new architectural issues that the previous fix hadn't accounted for.

The team decision: **ship v1.0 with voice deferred, restore voice in v1.0.1** after launch. Jarvis chat remains in v1.0 as a text-only experience.

This spec is small and intentional — it disables the voice surface without removing the underlying code, so v1.0.1 restoration is a simple matter of flipping the flag back.

---

## Principles for this spec

1. **No voice attempts.** Don't fetch from ElevenLabs, don't try to play audio, don't show any voice-related toasts.
2. **No voice UI surface.** Users don't see voice toggles, volume icons, or voice picker.
3. **Jarvis text experience must be flawless.** Removing voice should not regress the text chat.
4. **Code stays for v1.0.1.** The TTSContext, the edge function, the audio pipeline all stay in the codebase, just inactive.
5. **One flag to flip when restoring.** A single constant controls whether voice is enabled at the v1.0 level.

---

## Implementation

### Step 1 — Add a kill switch in TTSContext.tsx

At the top of `src/contexts/TTSContext.tsx`, immediately after imports:

```ts
// FEATURE FLAG: Voice is deferred to v1.0.1.
// To restore voice: change this to true.
// When true, the localStorage setting `hiit-ai-voice-enabled` controls per-user state.
// When false, voice is forcibly disabled regardless of any other setting.
const VOICE_FEATURE_ENABLED = false;
```

Then, in the `TTSProvider` component, force `enabled` to always be `false` when the feature is disabled:

```ts
const [enabled, setEnabled] = useState<boolean>(() => {
  if (!VOICE_FEATURE_ENABLED) return false;
  const stored = localStorage.getItem(VOICE_ENABLED_KEY);
  return stored === null ? true : stored === 'true';
});
```

And in the storage event listener, ignore changes when the feature is disabled:

```ts
useEffect(() => {
  if (!VOICE_FEATURE_ENABLED) return;
  const onStorage = (e: StorageEvent) => {
    if (e.key === VOICE_ENABLED_KEY) {
      setEnabled(e.newValue === 'true');
    }
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, []);
```

The `speak()`, `prepareAndPlay()`, and `cancel()` methods all check `effectivelyEnabled` (which becomes false because `enabled` is false). So they all short-circuit cleanly — no fetch, no play attempt, no toast. They become no-ops.

Don't remove these methods — leave them callable. Consumers (HomeHero, JarvisMode) still call them; they just become no-ops while the feature is disabled.

### Step 2 — HomeHero stops calling the greeting

In `src/components/HomeHero.tsx`, the useEffect that triggers `tts.prepareAndPlay(greetingText, ...)`:

Wrap it in the feature flag, or simply remove the call. Cleaner is to remove it for v1.0 and add it back in v1.0.1:

**Option A (simpler):** Delete the `tts.prepareAndPlay(...)` call. The text greeting on screen (if any) stays. Just no audio.

**Option B (more elegant):** Wrap the call in a check that the feature is enabled. Less code churn.

Pick A. We want clean v1.0 code. The voice greeting line returns when v1.0.1 brings voice back, but the rest of HomeHero is unchanged.

Specifically: remove the `useEffect` block that calls `tts.prepareAndPlay`. Remove the import of `useTTS` if it's no longer used in this file. Leave the text greeting (if there's a visible greeting string on screen) intact.

### Step 3 — JarvisMode stops calling speak

In `src/components/JarvisMode.tsx`:

**3.1** Remove every `await tts.speak(...)` call at the four call sites (around lines 430, 595, 650, 787 in the pre-deferral code). Just delete them — Jarvis text responses keep streaming in normally, no audio.

**3.2** Remove the volume icon in the header (lines around 879-881 in the pre-deferral code). The user no longer has a voice control because there's no voice to control.

**3.3** Remove the `useTTS()` hook call if `tts` is no longer used in the component. (It may still be used to call `setSessionMuted` from somewhere — check before removing.)

**3.4** If there are any imports related to voice that become unused (e.g. `Volume2`, `VolumeX` icons), clean them up.

### Step 4 — Hide voice UI in ChatSettings.tsx

In `src/pages/ChatSettings.tsx`:

The voice section has at least three pieces — the on/off toggle, the voice picker (preset ElevenLabs voices), and any voice preview buttons. Hide the entire voice section.

**Cleanest approach:** wrap the voice section block in `{VOICE_FEATURE_ENABLED && (...)}`. Import `VOICE_FEATURE_ENABLED` from TTSContext:

```ts
import { VOICE_FEATURE_ENABLED } from '@/contexts/TTSContext';

// ...

{VOICE_FEATURE_ENABLED && (
  <Section title="Voice">
    {/* voice toggle, picker, preview */}
  </Section>
)}
```

Export `VOICE_FEATURE_ENABLED` from TTSContext.tsx for this purpose.

If there are other settings unrelated to voice in the same page, leave them visible. Only the voice section is hidden.

### Step 5 — Check VoiceController.tsx

If `VoiceController.tsx` exists and renders any voice-related UI (the previous diagnostic mentioned it), hide its voice elements with the same flag.

If VoiceController has no voice-related UI (it only handled the firstName prop drilling), no change needed.

### Step 6 — Edge function and TTSContext stay deployed

Don't touch:
- `supabase/functions/ai-coach/index.ts` (the name directive change from Build 102 is good — keep it for v1.0.1)
- `supabase/functions/elevenlabs-tts` (still deployed, just no callers)
- The TTSProvider itself (still mounted, still owns the audio element, just inactive)

These all stay live so v1.0.1 restoration is fast.

---

## Out of scope (do not do)

- Removing TTSContext.tsx
- Removing the audio element from the DOM
- Removing the edge functions
- Migrating any localStorage keys
- Touching the voice picker UI inside ChatSettings beyond hiding it
- Removing `useFirstName.ts` (still useful for name display elsewhere)
- Changing the AI prompt format (keep the v1.0.1-ready Build 102 work in place)
- Removing the SQL clean-up of contaminated history (it's done; leave history clean)
- Adding any "voice coming soon" messaging
- Adding analytics for "user tried to find voice setting"

If any of these feel useful, leave a TODO comment and report. They're v1.0.1 concerns.

---

## What about users who already toggled voice on in localStorage?

The `VOICE_FEATURE_ENABLED = false` kill switch forces `enabled` to false regardless of localStorage. So even if a TestFlight user has `hiit-ai-voice-enabled=true` in their local state from Build 101, v1.0 ignores it. They get no voice. This is correct.

When v1.0.1 ships and flips the flag back to true, the localStorage value is read normally — users who'd previously enabled voice get it back automatically.

---

## Acceptance criteria

1. **No voice attempts.** Open the app. No fetch to ElevenLabs in the network log. No "Voice unavailable" toasts. No audio plays anywhere — Home, Jarvis, anywhere.
2. **Voice UI is gone.** ChatSettings has no voice section. JarvisMode header has no volume icon. No way for the user to discover that voice was ever a feature.
3. **Jarvis text chat works.** Open Jarvis. Send messages. Get responses in text. Conversation feels normal.
4. **Streaks, badges, schedule, goals etc.** All other features unchanged.
5. **No TypeScript errors.**
6. **No console errors / warnings related to voice.**
7. **One single line change un-defers.** Setting `VOICE_FEATURE_ENABLED = true` in TTSContext.tsx should restore voice attempts (with all current bugs — that's v1.0.1's problem).

---

## Testing checklist (real device, Vanessa's account)

- [ ] Build deploys to TestFlight
- [ ] Open the app — no audio plays
- [ ] Wait, tap around — still no audio anywhere
- [ ] Open Jarvis from FAB — no greeting audio, text greeting (if any) renders
- [ ] Send 3-5 messages to Jarvis — text responses appear normally, no audio attempted, no toasts
- [ ] Open ChatSettings — voice section is gone or absent
- [ ] Open Settings (main settings) — voice-related toggles gone if any were there
- [ ] Use other features (schedule, log activity, etc.) — all work as before
- [ ] Check the Capacitor dev console — no "Voice unavailable" toasts logged, no failed fetches to ElevenLabs

---

## Reporting back

Confirm:

1. All checklist items pass
2. The flag `VOICE_FEATURE_ENABLED` is in TTSContext.tsx and currently set to `false`
3. Switching it to `true` would re-enable voice (don't actually do this — just confirm the toggle works as designed)
4. Bundle size delta — should be slightly smaller (some imports removed, fewer call sites)
5. TestFlight build number
6. Any voice-related code paths discovered that this spec missed

---

## Rollback

If for some reason we change our minds and want voice back in v1.0:
1. Set `VOICE_FEATURE_ENABLED = true` in TTSContext.tsx
2. Restore the `tts.prepareAndPlay` call in HomeHero
3. Restore the `tts.speak` calls in JarvisMode
4. Restore the volume icon in JarvisMode header

This is the inverse of the deferral. We're not removing voice from the codebase, just disabling its surface.

---

## Notes for the implementer

1. **Be ruthless about scope.** This task is "hide voice". Nothing else. Three previous rounds tried to do more and each round introduced new bugs. This task fixes nothing — it just makes voice invisible.
2. **The kill switch is the canonical pattern.** A boolean at the top of one file. Don't scatter the disable logic across multiple files.
3. **Keep all voice infrastructure.** The TTSProvider stays. The edge functions stay. The audio element stays in the DOM (just never gets used).
4. **No "coming soon" messaging.** Don't tell the user voice is deferred. Just don't show the surface. Users who didn't see the broken voice in earlier builds won't notice anything's missing.
5. **Verify on real device.** A clean build, install, open, no audio anywhere. That's the test.
