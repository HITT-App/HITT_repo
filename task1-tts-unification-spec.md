# Task 1 (revised): Unify TTS into a single service + fix voice bugs

**Type:** Architectural refactor + bug bundle
**Files affected:**
- `src/contexts/TTSContext.tsx` (new — the unified service)
- `src/components/JarvisMode.tsx` (consumer — drop local TTS, use service)
- `src/components/HomeHero.tsx` (consumer — drop local TTS, use service)
- `src/components/VoiceController.tsx` (drop client-side name injection)
- `src/App.tsx` or wherever providers are mounted (wrap with TTSProvider)
- `supabase/functions/ai-coach/index.ts` (strengthen server-side name directive)
**Estimated effort:** ~1 day including real-device test cycle
**Launch-critical:** Yes (voice quality is a user-visible v1.0 bar)
**Supersedes:** the previous Task 1 voice-bugs spec, which addressed only one of two TTS pipelines

---

## Why

The previous Task 1 spec patched JarvisMode but missed HomeHero's entirely separate TTS pipeline. Result: bugs persist and now overlap (two voices on Home screen). Plus, the client-side name injection turned out to actively contradict the server-side correct name in the edge function, making the name bug worse rather than better.

The right architecture is **one TTS service** that all consumers call into. One audio element, one mute state, one settings check, one cancellation point. This task builds that service and rewires HomeHero and JarvisMode to use it.

---

## Inputs from previous diagnostics

Confirmed by diagnostic on Build 100:

- **HomeHero.tsx:57–115** has its own `playVoiceGreeting()` function — completely independent TTS pipeline, fires 800ms after mount, doesn't read `hiit-ai-voice-enabled`, no cancellation on unmount
- **JarvisMode.tsx:677–736** has `speakResponse()` — the version patched in Build 100
- **VoiceController.tsx** computes `firstName` synchronously and passes it to JarvisMode (the timing race source)
- **supabase/functions/ai-coach/index.ts:431** has its own profile fetch and builds `USER PROFILE CONTEXT` with the correct name. This is the source of truth. The client-side injection contradicts it when stale.
- **Index.tsx:120 and 138** render HomeHero in two branches, which can cause it to mount twice in quick succession (the "spoken twice on Home" symptom)

---

## Architecture

### The TTSContext

Single React context + provider. Owns:

- One `HTMLAudioElement` (created once, attached to the DOM for iOS audio context compatibility)
- One `AbortController` for the in-flight fetch, replaced on each new speak
- Persistent settings state (`enabled` from localStorage `hiit-ai-voice-enabled`)
- Session mute state (in-memory only, resets each session)
- Voice ID (from localStorage `hiit-ai-voice-id`)
- The iOS audio unlock useEffect (currently in JarvisMode line 808–813 — moves to the provider)
- A `playedKeys` Set for "speak once per session" semantics

### The hook API

```ts
type TTSAPI = {
  // Trigger speech. Returns a promise that resolves when audio ends or aborts.
  speak: (text: string, options?: { once?: string }) => Promise<void>;
  
  // Stop any current speech and abort any in-flight fetch.
  cancel: () => void;

  // Whether audio is currently playing.
  isSpeaking: boolean;

  // Whether voice is enabled at the user-preference level (from settings).
  enabled: boolean;

  // In-session mute toggle (the volume icon in JarvisMode).
  sessionMuted: boolean;
  setSessionMuted: (muted: boolean) => void;

  // Effective speak status — both must be on for audio to play.
  effectivelyEnabled: boolean;  // = enabled && !sessionMuted
};

function useTTS(): TTSAPI;
```

The `once?: string` option is the key fix for the double-mount problem. When set, the service tracks that key in a Set; subsequent calls with the same key in the same session are silently dropped.

```ts
// HomeHero:
tts.speak(greetingText, { once: 'home-welcome' });  // fires once even if component remounts
```

### Internal speak flow

```
speak(text, options):
  1. If options.once is set and the key is in playedKeys, return immediately.
  2. If options.once is set, add the key to playedKeys.
  3. If !effectivelyEnabled, return immediately.
  4. Cancel any previous speak (abort fetch + pause audio).
  5. Create new AbortController.
  6. Get access token. If missing, toast warning, return.
  7. Fetch audio blob from elevenlabs-tts edge function with abort signal.
  8. If response not ok, toast error, return.
  9. Set audio src to blob URL, .load(), .play().
  10. Wait for onended or onerror. Set isSpeaking accordingly.
```

The `cancel()` method does steps 4 only (abort, pause, clear src).

---

## Implementation steps

### Step 1: Create `src/contexts/TTSContext.tsx`

Full skeleton. Implementer fills in the ElevenLabs fetch using the pattern currently in JarvisMode.tsx:677–736.

```tsx
import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VOICE_ENABLED_KEY = 'hiit-ai-voice-enabled';
const VOICE_ID_KEY = 'hiit-ai-voice-id';
const DEFAULT_VOICE_ID = '<copy default from JarvisMode>';

type SpeakOptions = { once?: string };

type TTSContextValue = {
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  cancel: () => void;
  isSpeaking: boolean;
  enabled: boolean;
  sessionMuted: boolean;
  setSessionMuted: (muted: boolean) => void;
  effectivelyEnabled: boolean;
};

const TTSContext = createContext<TTSContextValue | null>(null);

export function TTSProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const playedKeysRef = useRef<Set<string>>(new Set());

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sessionMuted, setSessionMuted] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(VOICE_ENABLED_KEY);
    return stored === null ? true : stored === 'true';
  });

  const effectivelyEnabled = enabled && !sessionMuted;

  // Listen for setting changes from other tabs/contexts
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === VOICE_ENABLED_KEY) {
        setEnabled(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Cancel if voice gets disabled mid-speech
  useEffect(() => {
    if (!effectivelyEnabled && isSpeaking) {
      cancel();
    }
  }, [effectivelyEnabled, isSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  // iOS audio context unlock — moved from JarvisMode
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    el.play().catch(() => { /* expected on some platforms */ });
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, options?: SpeakOptions) => {
    // Once-per-session deduplication
    if (options?.once) {
      if (playedKeysRef.current.has(options.once)) return;
      playedKeysRef.current.add(options.once);
    }

    // Honour the global enable + session mute
    if (!effectivelyEnabled) return;

    // Cancel any previous speak
    cancel();

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.warning('Voice unavailable — please sign in again', { id: 'tts-auth' });
        return;
      }

      const voiceId = localStorage.getItem(VOICE_ID_KEY) || DEFAULT_VOICE_ID;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ text, voiceId }),
          signal: abortController.signal,
        }
      );

      if (!res.ok) {
        toast.error('Voice unavailable right now', { id: 'tts-error' });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = audioRef.current;
      if (!audio) return;

      audio.src = url;
      audio.load();
      setIsSpeaking(true);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (abortRef.current === abortController) {
          abortRef.current = null;
        }
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
      };

      await audio.play();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return; // expected
      console.error('TTS error:', err);
      toast.error('Voice unavailable right now', { id: 'tts-error' });
      setIsSpeaking(false);
    }
  }, [effectivelyEnabled, cancel]);

  return (
    <TTSContext.Provider value={{
      speak,
      cancel,
      isSpeaking,
      enabled,
      sessionMuted,
      setSessionMuted,
      effectivelyEnabled,
    }}>
      {children}
      {/* Single audio element for the entire app, attached to DOM for iOS */}
      <audio ref={audioRef} style={{ display: 'none' }} playsInline />
    </TTSContext.Provider>
  );
}

export function useTTS(): TTSContextValue {
  const ctx = useContext(TTSContext);
  if (!ctx) throw new Error('useTTS must be used inside TTSProvider');
  return ctx;
}
```

### Step 2: Wrap the app with `TTSProvider`

In whichever component currently holds the top-level providers (likely `App.tsx` or `AppLayout.tsx`), wrap the tree:

```tsx
<AuthProvider>
  <TTSProvider>
    <Router>
      ...
    </Router>
  </TTSProvider>
</AuthProvider>
```

Order matters — TTSProvider needs to be inside AuthProvider (it uses supabase auth) but outside Router (it serves every route).

### Step 3: Refactor `HomeHero.tsx`

Replace the entire `playVoiceGreeting` block (lines 57–115) with a call to the unified service. Keep the *content* generation (the greeting text logic, time-of-day rules); drop everything audio-related.

```tsx
import { useTTS } from '@/contexts/TTSContext';

// ...inside component:
const tts = useTTS();

useEffect(() => {
  // Build the greeting text using existing logic
  const greetingText = buildGreetingText(firstName); // same content as before
  
  // Speak once per session — survives component remounts
  tts.speak(greetingText, { once: 'home-welcome' });
}, []);
```

Drop:
- The local `audioRef` (use the service's)
- The local `isMuted` state (use service's `sessionMuted`)
- The local volume toggle button (or rewire it to `tts.setSessionMuted`)
- The 800ms setTimeout dance (the service handles its own timing)
- The click/touchstart fallback listeners (the iOS unlock useEffect in the provider handles this)
- The local `hasPlayed` state (the `once` key in the service handles this)

If HomeHero has a UI volume control, rewire it to call `tts.setSessionMuted(!tts.sessionMuted)`.

### Step 4: Refactor `JarvisMode.tsx`

Drop the local `speakResponse` function entirely (lines 677–736). At every call site (lines 430, 595, 650, 787), replace with `tts.speak(text)`.

Drop:
- The local `audioRef`
- The local `ttsAbortRef`
- The local `isMuted` state (use `tts.sessionMuted`)
- The iOS audio unlock useEffect (lines 808–813 — moved to provider)
- The local `useVoiceEnabled` hook from Build 100 (use `tts.enabled` directly)

Keep:
- The `triggerGreeting` function and its prompt-building (logic stays, audio side moves to service)
- The volume icon in the header — wire it to `tts.setSessionMuted`
- All four call sites where speech is triggered (they just call `tts.speak` now)

### Step 5: Remove client-side name injection in VoiceController.tsx

This is the fix for the name bug from the diagnostic.

In `VoiceController.tsx`:
- Remove the resolution of `firstName` from profile
- Remove passing `firstName` as a prop to JarvisMode
- Remove the `buildNameInstruction` helper if it exists
- Remove any system-prompt injection that includes the name

In `JarvisMode.tsx`:
- Remove the `firstName` prop
- Remove any prompt construction that injects the name
- The greeting prompts and conversation prompts go to the AI **without** client-side name context

The AI still gets the correct name via the server-side `USER PROFILE CONTEXT` block built in the edge function. No client-side injection means no client/server contradiction, and the timing race goes away because there's nothing to race.

### Step 6: Strengthen server-side name directive

In `supabase/functions/ai-coach/index.ts` around line 431:

**Before:**
```ts
userContext += `Name: ${profile.display_name || 'Unknown'}\n`;
```

**After:**
```ts
const firstName = (profile.display_name || 'there').split(' ')[0];
userContext += `\nUSER NAME INSTRUCTION:\nThe user's first name is "${firstName}". ALWAYS address them as "${firstName}". NEVER use their email address, username, full name, or any other variation. If you don't know the user's name, address them as "there".\n`;
```

The change is from informational ("Name: X") to directive ("ALWAYS X, NEVER Y"). AI models follow directives much more reliably than they pick up casual context.

If `profile.display_name` is null on the server side, the directive falls back to "there" — graceful. The split on space handles "Vanessa Latchem-Smith" → "Vanessa".

---

## Out of scope

- Audio caching across sessions (would help cost; separate task)
- Multi-voice support for different message types (just a single voice)
- Captions / subtitles
- Visual waveform animations
- Background-play (audio pausing when phone locks; iOS Capacitor work)
- Switching providers from ElevenLabs
- Refactoring ChatSettings.tsx (already correct)
- Renaming the localStorage keys
- Removing the unused `hiit-ai-voice-id` voice picker UI

If the implementer spots a fixable bug outside this scope, leave a TODO comment and report it — don't fix inline.

---

## Acceptance criteria

1. **One audio element only.** Inspect the DOM — exactly one `<audio>` tag, in the TTSProvider, attached on mount.
2. **No second TTS pipeline.** HomeHero no longer has its own `new Audio()` or `playVoiceGreeting`. JarvisMode no longer has its own `speakResponse`. Both consume the service.
3. **Home welcome greeting plays once.** Even with Index.tsx's potential double-render of HomeHero, the greeting plays exactly once per session.
4. **Voice-off setting works.** Toggling voice OFF in ChatSettings silences everything — welcome greeting and Jarvis replies. Toggling ON restores.
5. **Session mute works in JarvisMode.** Tapping the volume icon mutes until end of session.
6. **Echo gone.** Rapid succession of speak calls (e.g. greeting then user reply) produces one clean audio stream — previous cuts off, no overlap.
7. **No more wrong name.** AI consistently uses first name. No "vanessjhutton", no "Vanessa Dev". Test with a user whose `display_name` is null — Jarvis should say "there" not the email username.
8. **Silent failures gone.** Auth or network errors produce a toast.
9. **iOS audio still unlocked.** The silent WAV trick still runs on first user gesture (now in the provider).
10. **No TypeScript errors.** No console warnings.
11. **Tested on real iPhone via TestFlight.**

---

## Testing checklist for TestFlight

### Name correctness
- [ ] Sign in. Open the app. The Home greeting addresses you by first name only.
- [ ] Tap to open Jarvis. Jarvis addresses you by first name only.
- [ ] Have a back-and-forth conversation. First name persists.
- [ ] Sign out. Sign back in. Same correctness.
- [ ] (If possible) Test with a user whose `display_name` is null — Jarvis should say "there", not the email or username.

### Echo / overlap
- [ ] Open the app. Home greeting plays once.
- [ ] Wait for it to finish.
- [ ] Tap HIIT button. Open Jarvis. Greeting plays once, no overlap with the previous Home greeting.
- [ ] Send three messages in quick succession. Each response plays, previous cuts off, no doubling.
- [ ] Force-quit and reopen. Home greeting plays again (session-scoped `once` resets on full reload).
- [ ] Navigate to another tab during Home greeting. Greeting stops cleanly (no orphaned audio playing in background).

### Voice off
- [ ] In ChatSettings, toggle Voice OFF.
- [ ] Force-quit and reopen the app. Home greeting does NOT play (text-only).
- [ ] Open Jarvis. No audio plays.
- [ ] Return to settings. Toggle Voice ON.
- [ ] Reopen Jarvis or trigger a speak. Audio resumes.

### Session mute (JarvisMode volume icon)
- [ ] Open Jarvis with voice enabled.
- [ ] Tap volume icon to mute.
- [ ] Send a message. No audio. Volume icon shows muted state.
- [ ] Tap volume icon to unmute. Send another message. Audio plays.
- [ ] Close and reopen Jarvis. Volume icon resets to unmuted (session-scoped).

### Error handling
- [ ] (Dev only) Simulate offline. Trigger a speak. Toast appears.
- [ ] Text response still renders even if audio fails.

### Regression sweep
- [ ] Schedule creation through Jarvis still works.
- [ ] Goals flow through Jarvis still works.
- [ ] Workout completion summary's TTS (if any) still works — flag if you find any TTS-adjacent flows we missed.

---

## Reporting back

When done, the response should confirm:

1. Each acceptance criterion verified on real iPhone.
2. Bundle size delta — should be roughly neutral (new context offset by removed code in HomeHero and JarvisMode).
3. Any TTS-adjacent code paths in the codebase that the spec didn't mention — list them, flag whether they were migrated.
4. Whether the edge function change deployed successfully (it's a separate deploy from the iOS build).
5. TestFlight build number.

---

## Rollback

If the unification destabilises voice:

1. Revert all consumer files (`HomeHero.tsx`, `JarvisMode.tsx`, `VoiceController.tsx`) to pre-change state.
2. Delete `src/contexts/TTSContext.tsx`.
3. Remove the `<TTSProvider>` wrapper from the app tree.
4. Revert the edge function deploy.

Each side rolls back independently — provider deletion doesn't affect the edge function and vice versa.

---

## Notes for the implementer

1. **The diagnostic identified the architecture problem.** This refactor exists because two independent TTS pipelines is the root cause of the bugs. Don't undo this by accidentally creating a third — every TTS call goes through `useTTS().speak()`.
2. **The `once` key is the key fix for the double-mount problem.** Don't skip it. The home-welcome key prevents the Index.tsx double-render from producing two greetings.
3. **Server-side directive uses "ALWAYS" and "NEVER" in caps.** Models obey strong directives. Don't soften this.
4. **The single `<audio>` element must be in the DOM.** Detached `new Audio()` objects don't get the iOS audio context unlock from the silent WAV. Attaching to the provider's render tree is the difference between "works" and "silent on iOS".
5. **Don't try to be clever with the auth token.** Re-fetch it on every speak. The session can refresh mid-app-use.
6. **Test on a real iPhone.** Voice + iOS + Capacitor + ElevenLabs has at least one quirk you only see on hardware.
