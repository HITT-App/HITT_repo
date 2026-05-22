# Task 1: Voice bugs + voice-off setting wiring

**Type:** Bug fix bundle + small feature wiring
**Files affected:**
- `src/components/JarvisMode.tsx` (primary — most fixes live here)
- `src/pages/Index.tsx` (small change — pass display_name into JarvisMode)
- Possibly `src/components/HomeHero.tsx` or wherever JarvisMode is invoked
- `src/pages/ChatSettings.tsx` (untouched — the toggle is already correct, it's just not honoured)
**Estimated effort:** Half a day including TestFlight test
**Launch-critical:** Yes

---

## Why

Four distinct voice bugs affecting Jarvis, plus a settings disconnect, all confirmed by diagnostic. Each has a clear root cause and a contained fix:

| Bug | Root cause | Fix |
|---|---|---|
| Sometimes uses email as name | Display name is never injected into the AI prompt; AI invents one from chat history | Inject first name into every prompt |
| Sometimes uses full name | Same root cause | Same fix — pass first name only |
| Sometimes says nothing | (a) Voice-enabled localStorage flag not read by JarvisMode (b) Silent failure on missing auth token | Read the flag; surface auth errors |
| Says the same thing twice (echo) | No cancellation before triggering new audio; HTTP fetches overlap | Cancel previous audio + abort in-flight fetch before each new speak |

This task fixes all four together. They share files and require coordinated changes to JarvisMode's audio handling.

---

## Reference inputs

Diagnostic from earlier in the conversation (already in your context) identifies:
- `JarvisMode.tsx:677–736` — `speakResponse` function (the speech entry point)
- `JarvisMode.tsx:808–813` — iOS audio context unlock useEffect (working correctly, do not touch)
- `JarvisMode.tsx` four `speakResponse` call sites at lines 430, 595, 650, 787
- `JarvisMode.tsx:546–616` — `triggerGreeting` function (the greeting prompt that lacks name injection)
- `Index.tsx:57–59` — where display_name is correctly resolved
- `ChatSettings.tsx:58–69` — voice-on/off toggle (writes `hiit-ai-voice-enabled` localStorage)
- `ChatSettings.tsx:59` — voice picker (writes `hiit-ai-voice-id` localStorage)
- `JarvisMode.tsx:687` — already reads `hiit-ai-voice-id` (so the pattern is established)

Read each before changing anything.

---

# Fix 1: Inject the user's first name into prompts

## Problem recap

The AI invents the user's name from chat history because no canonical name is passed into the prompts. The greeting prompt at `JarvisMode.tsx:568` doesn't include the user's name. The AI may use whatever appeared in old responses — email, full name, or something fabricated.

## Change

### 1.1 Resolve first name in Index.tsx and pass it down

In `src/pages/Index.tsx`, around lines 57–59, the current code resolves `displayName`:

```tsx
const displayName = profile?.display_name ||
                    user?.user_metadata?.display_name ||
                    user?.email?.split("@")[0] || ...
```

Add a separate `firstName` derivation. The display_name might be "Vanessa Latchem-Smith" — we want just "Vanessa".

```tsx
const firstName = (
  profile?.display_name ||
  user?.user_metadata?.display_name ||
  user?.email?.split("@")[0] ||
  "there"
).split(" ")[0];
```

The fallback `"there"` produces "Hi there, ..." which is graceful when no name is available. Don't use email-derived strings as a name — split off "@" and use only what's clearly a name token.

Pass `firstName` to wherever JarvisMode is rendered. Most likely this propagates via HomeHero or directly as a prop.

### 1.2 Accept firstName in JarvisMode

Add a new prop:

```tsx
type JarvisModeProps = {
  // ... existing props
  firstName: string;
};
```

Default to `"there"` if not provided (defensive — protects against any caller that doesn't pass it yet):

```tsx
function JarvisMode({ firstName = "there", /* ...other props */ }: JarvisModeProps) {
```

### 1.3 Inject into the greeting prompt

In `triggerGreeting` (around line 546–616), the prompt built and sent to the AI must explicitly tell it the user's name and instruct it to use only that name.

Wherever the system or user message is constructed inside `triggerGreeting`, add or modify a system instruction:

```tsx
const systemInstruction = `
You are HIIT AI Coach, the user's fitness companion. The user's name is ${firstName}.
Always address them as "${firstName}". Never use their email address, full name, or any other variation.
If you don't know what to call them, use "${firstName}".
[... rest of existing system prompt ...]
`;
```

The exact phrasing is less important than the firm "Always X, never Y" structure. AI models follow constraints best when they're clear and repeated.

### 1.4 Inject into other prompt locations too

Search JarvisMode.tsx for every place a prompt or system message is built and sent to the AI. Apply the same name injection. There are at least these:

- The greeting prompt (line ~568)
- The regular conversation prompt (the message body sent on every user message)
- The schedule-creation prompt (referenced at the call site around line 430)
- The goals-flow prompt (referenced at the call site around line 787)

Use a small helper to avoid copy-pasta:

```tsx
function buildNameInstruction(firstName: string): string {
  return `The user's name is ${firstName}. Always address them as "${firstName}". Never use their email address or any other variation.`;
}
```

Prepend the result to every system prompt or instruction string sent to the AI.

### 1.5 No history scrubbing needed

Existing messages in the `messages` table that contain wrong names stay as-is. The new prompt instructions tell the AI to override historical examples. Combined with the upcoming 24-hour history retention (Task 8), historical contamination naturally rolls off within a day.

---

# Fix 2: Wire the voice-enabled setting

## Problem recap

`ChatSettings.tsx` writes `hiit-ai-voice-enabled` to localStorage when the user toggles voice on/off. JarvisMode reads `hiit-ai-voice-id` (the voice selection) but never reads `hiit-ai-voice-enabled`. So toggling voice on/off in settings has zero effect.

## Change

### 2.1 Read the flag in JarvisMode

Add a small hook (or inline check) at the top of JarvisMode:

```tsx
function useVoiceEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('hiit-ai-voice-enabled');
    if (stored === null) return true; // default on
    return stored === 'true';
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'hiit-ai-voice-enabled') {
        setEnabled(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return enabled;
}
```

The `storage` event listener lets JarvisMode react if the user changes the setting in another tab — defensive but cheap.

### 2.2 Combine with the existing in-session mute

JarvisMode currently has an in-session `isMuted` boolean (the Volume2/VolumeX icon at line 879–881). Keep this — it's a useful "mute for this session" toggle separate from the persistent preference.

Combine them at every speak call site. Replace the existing guard:

```tsx
// Before:
if (!isMutedRef.current) await speakResponse(text);

// After:
if (voiceEnabled && !isMutedRef.current) await speakResponse(text);
```

Where `voiceEnabled` comes from `useVoiceEnabled()`.

### 2.3 Visual coherence

If `voiceEnabled` is false (user turned voice off in settings), the in-session mute toggle should be hidden or disabled — there's nothing meaningful to mute. Either hide the Volume icon or grey it out with a tooltip "Voice disabled in settings".

Pick whichever fits the existing UI conventions; hiding is simpler.

---

# Fix 3: Echo — cancel previous audio and abort in-flight fetch

## Problem recap

`speakResponse` fetches audio from ElevenLabs via an edge function. No `cancel()` on the audio element. No `AbortController` on the fetch. If two calls happen close together, both fetches run; both blobs arrive; both attempt to play. The later `.load()` resets the element, but if timing is unlucky, the first audio plays briefly before being cut off — an audible echo.

## Change

### 3.1 Add a ref to track the active AbortController

At the top of JarvisMode where other refs live:

```tsx
const ttsAbortRef = useRef<AbortController | null>(null);
```

### 3.2 At the start of speakResponse, cancel any previous speak

Inside `speakResponse`, before the new fetch:

```tsx
async function speakResponse(text: string) {
  // Cancel any previous speak still in flight or playing
  if (ttsAbortRef.current) {
    ttsAbortRef.current.abort();
  }
  const audio = audioRef.current;
  if (audio) {
    audio.pause();
    audio.src = '';
    audio.load(); // releases any blob URL
  }

  // Continue with the new speak
  const abortController = new AbortController();
  ttsAbortRef.current = abortController;

  // ... existing fetch logic, but pass the signal:
  const res = await fetch(url, {
    method: 'POST',
    headers: { /* ... */ },
    body: JSON.stringify({ /* ... */ }),
    signal: abortController.signal,
  });

  // ... rest of the function
}
```

### 3.3 Handle the abort gracefully

If the fetch is aborted mid-flight, it throws an `AbortError`. Catch it silently — aborting is intentional:

```tsx
try {
  const res = await fetch(/* ... */);
  // ... handle response
} catch (err) {
  if ((err as Error).name === 'AbortError') {
    return; // expected — a newer speak superseded this one
  }
  console.error('TTS fetch failed:', err);
  // Optionally: surface to user via toast (see Fix 4)
  return;
}
```

### 3.4 Clear the ref on natural completion

When audio finishes playing (existing `onended` handler), null out `ttsAbortRef.current` so a stale reference isn't kept:

```tsx
audio.onended = () => {
  setIsSpeaking(false);
  if (ttsAbortRef.current === abortController) {
    ttsAbortRef.current = null;
  }
};
```

This pattern (only null out if it's still ours) handles the case where a newer speak has already replaced this one — we don't want to clobber its abort controller.

---

# Fix 4: Silent failure — surface auth/network errors

## Problem recap

`speakResponse` silently bails out in two cases:
1. `!accessToken` (line 682) — no Supabase auth token. Returns early, sets `setIsSpeaking(false)`, no user feedback.
2. `!res.ok` (line 711) — ElevenLabs or edge function error. Same silent return.

The user sees Jarvis "say something" visually (text appears) but no audio plays, and has no idea why.

## Change

### 4.1 Surface auth-token errors

```tsx
if (!accessToken) {
  console.warn('TTS skipped: no auth token');
  toast.warning("Voice unavailable — please sign in again", { id: 'tts-auth' });
  setIsSpeaking(false);
  return;
}
```

The `id: 'tts-auth'` prevents toast spam if it fires repeatedly.

### 4.2 Surface fetch errors

```tsx
if (!res.ok) {
  console.error('TTS request failed:', res.status, res.statusText);
  toast.error("Voice unavailable right now", { id: 'tts-error' });
  setIsSpeaking(false);
  return;
}
```

These toasts are intentionally low-key — users don't need a modal blocking their flow, but they do need to know voice isn't working.

### 4.3 Don't toast if the user has voice disabled

The toasts above only fire when voice was attempted (i.e. `voiceEnabled && !isMutedRef.current`). The combined guard in Fix 2.2 means `speakResponse` isn't called at all when voice is off, so these errors won't fire spuriously.

---

# Out of scope (don't do, even if tempted)

- Refactoring the ElevenLabs edge function itself — server-side concern, separate work
- Adding new voice options or changing the default voice
- Caching audio responses (would help cost but is a separate task)
- Switching from ElevenLabs to another TTS provider
- Adding playback speed controls
- Adding visual waveform / animation while speaking
- Scrubbing the `messages` table of historical wrong-name responses (the 24-hour retention will handle this naturally)
- Adding a "mute this conversation" persistent state — the session mute and the settings toggle are sufficient
- Adding analytics on speak success/failure (would be useful, separate work)
- Fixing the Index.tsx fallback chain in any way beyond extracting `firstName` from it

---

# Acceptance criteria

1. **Name correctness.** Jarvis greets and addresses the user by their first name only. If display_name is "Vanessa Latchem-Smith", Jarvis says "Vanessa". If display_name is missing, Jarvis says "there".
2. **Name persistence.** Across multiple conversations, Jarvis consistently uses the first name. Old chat history with email-as-name doesn't cause regression.
3. **Voice-off setting works.** Toggling voice off in ChatSettings stops Jarvis from speaking. Toggling back on restores it.
4. **In-session mute still works.** The Volume2/VolumeX icon in JarvisMode header still toggles audio for the current session.
5. **No echo.** Rapid succession of greetings, user replies, and assistant responses don't produce double-play.
6. **Silent failures gone.** If voice is supposed to play but can't, the user sees a toast explaining why. Console warnings/errors logged appropriately.
7. **iOS audio unlock still works.** The silent WAV trick at line 808–813 remains in place. Audio plays on iOS without manual intervention beyond the initial Jarvis-open gesture.
8. **No regression elsewhere.** Schedule creation, goals flow, regular conversation, greetings — all four speakResponse call sites still work, just better.
9. **TypeScript clean.** No new errors. No console warnings introduced.
10. **Tested on real iPhone via TestFlight.**

---

# Testing checklist for TestFlight

## Name behaviour
- [ ] Open Jarvis from Home. Greeting addresses user by first name only (not email, not full name).
- [ ] Have a short conversation. Subsequent Jarvis responses still use first name correctly.
- [ ] Close Jarvis, reopen. Greeting still uses first name.
- [ ] If you can, test with a user whose display_name is null — confirm Jarvis says "there" or similar graceful fallback.

## Voice-off setting
- [ ] Open Settings → Chat Settings. Toggle Voice OFF.
- [ ] Return to Jarvis. Send a message. Jarvis text appears, no audio plays.
- [ ] Return to settings, toggle Voice ON.
- [ ] Send another message. Audio now plays.

## In-session mute
- [ ] Open Jarvis (with voice enabled in settings).
- [ ] Tap the Volume icon to mute mid-session.
- [ ] Send a message. No audio.
- [ ] Tap to unmute. Send another message. Audio plays.
- [ ] Close and reopen Jarvis. Voice is unmuted (in-session state is fresh).

## Echo
- [ ] Open Jarvis. Greeting plays.
- [ ] Before the greeting finishes, send a message. Confirm only one audio plays — no overlap.
- [ ] Send three messages in quick succession. Each response plays cleanly; previous audio cuts off, doesn't double up.

## Silent failure
- [ ] In dev, simulate an offline state or stop the edge function. Send a message in Jarvis.
- [ ] Confirm a toast appears explaining voice is unavailable.
- [ ] Text response still renders even if audio fails.

## Regression sweep
- [ ] Trigger schedule creation through Jarvis. Confirm it still works and speaks correctly.
- [ ] Trigger the goals flow. Same.
- [ ] Use Jarvis for a regular back-and-forth chat. Confirm no oddities.

---

# What to report back

When done, the response should confirm:

1. All four bugs verified fixed on real iPhone (not just simulator).
2. Did the `useVoiceEnabled` hook correctly pick up changes from ChatSettings? Test the toggle.
3. Was there any prop-drilling required to get `firstName` from Index.tsx to JarvisMode? Show the path.
4. Any of the four `speakResponse` call sites that needed updates beyond the combined-guard change?
5. Any unexpected behaviour discovered during testing — flag don't fix.
6. TestFlight build number.

---

# Rollback

Each fix is mostly contained to JarvisMode.tsx. To roll back:
1. Revert JarvisMode.tsx to pre-change version
2. Revert Index.tsx and any caller of JarvisMode to remove the firstName prop
3. No DB changes, no schema changes, no asset additions

---

# Notes for the implementer

1. **The diagnostic identified the root causes precisely.** Trust the diagnostic. Don't go fishing for other causes — these four fixes address all four observed bugs.
2. **The localStorage `hiit-ai-voice-id` is already read by JarvisMode at line 687.** That pattern is the model for `hiit-ai-voice-enabled` — follow the same approach.
3. **Don't conflate the two mutes.** Persistent (settings) and session (mute icon) are two different concerns and both should keep working.
4. **AbortController is well-supported in Capacitor's WebView.** No polyfill needed.
5. **Toasts use the existing sonner library.** No new dependencies.
6. **The system prompt name-instruction trick has a small risk:** if the model is told "always say Vanessa, never use email" and the user's name actually IS an email address (unusual but possible), the instruction is ambiguous. The fallback to "there" sidesteps this — if name resolution produced something email-shaped, it gets replaced with "there".
