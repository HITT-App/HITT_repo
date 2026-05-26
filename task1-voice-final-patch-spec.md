# Task 1 (final patch): Voice fixes for Build 102

**Type:** Bug bundle — addresses four issues identified by Build 101 diagnostic
**Files affected:**
- `src/contexts/TTSContext.tsx` (iOS gesture binding, `once` key safety)
- `src/pages/Index.tsx` (name-flicker loading guard)
- `src/components/HomeHero.tsx` (defer greeting text generation until profile loads)
- `supabase/functions/ai-coach/index.ts` (move name directive after chat history)
- Plus: a one-off DB operation to clear the test user's chat history (instructions in spec)
**Estimated effort:** Half a day including real-device test cycle
**Last attempt:** If Build 102 doesn't land cleanly with the test plan in this spec, voice gets disabled by default for v1.0 launch and revisited post-launch.

---

## Why

Build 101 introduced the unified TTSContext but hit four specific issues identified by diagnostic:

1. **iOS gesture window expires during the async chain.** `audio.play()` throws `NotAllowedError` because by the time we ask iOS to play, the gesture that allowed it (app open) is over.
2. **The `once` key is consumed before playback succeeds.** When playback fails for any reason, the session permanently loses the chance to retry.
3. **Display name flickers from email to display_name** because `Index.tsx` uses `email.split('@')[0]` as a synchronous fallback while profile loads asynchronously.
4. **AI ignores the name directive when chat history is contaminated.** 40 historical messages saying "vanessajhutton" outweigh one system instruction saying "Vanessa".

This spec addresses all four. It is intentionally narrow.

---

## Reference inputs

Diagnostic from Build 101 (in your context) identifies precise line numbers and causes.

**Key context for the implementer:**

- The HomeHero TTS used to work pre-Build 101 because it bound to click/touchstart listeners. That pattern needs to come back, but in the unified service rather than per-component.
- The Jarvis greetings work *if* the fetch is fast and the gesture window is fresh. Opening Jarvis IS a tap, so we're in a gesture. But the 1-3s fetch can still exceed the window.
- The `messages` table holds chat history per user. The test user (vanessajhutton@...) has accumulated history containing wrong names.

---

# Fix 1: iOS gesture binding — prefetch and play on next interaction

## Pattern

Rather than: `await fetch → await play (which fails because gesture expired)`

We do: `prefetch immediately → cache blob → play on next user interaction`

This works because by the time the user taps something (anything — they always do within a few seconds), the blob is cached. `audio.play()` is then synchronous and the tap's gesture window is fresh.

## Implementation

### 1.1 New method on TTSContext: `prepareAndPlay`

Add a separate code path for greeting-style calls that need to defer playback until a gesture. The existing `speak()` stays for "user just tapped, play now" cases.

```ts
// New: prepareAndPlay - prefetches blob, plays on next interaction
// Returns a function to cancel the prepared playback (e.g. on unmount)
prepareAndPlay: (text: string, options?: { once?: string }) => () => void;
```

### 1.2 Implementation outline

```tsx
const prepareAndPlay = useCallback((text: string, options?: SpeakOptions) => {
  // Once-per-session check
  if (options?.once && playedKeysRef.current.has(options.once)) {
    return () => {}; // no-op cancel
  }

  // Don't prefetch if voice is disabled
  if (!effectivelyEnabled) {
    return () => {};
  }

  let cancelled = false;
  let pendingBlob: string | null = null;
  let gestureListener: (() => void) | null = null;

  const cancel = () => {
    cancelled = true;
    if (pendingBlob) URL.revokeObjectURL(pendingBlob);
    if (gestureListener) {
      document.removeEventListener('click', gestureListener);
      document.removeEventListener('touchstart', gestureListener);
    }
  };

  // Start fetching the blob immediately
  (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken || cancelled) return;

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
        }
      );

      if (cancelled || !res.ok) return;

      const blob = await res.blob();
      if (cancelled) return;

      pendingBlob = URL.createObjectURL(blob);

      // Attempt to play immediately (works if we're still in gesture window)
      const audio = audioRef.current;
      if (!audio) return;

      audio.src = pendingBlob;
      audio.load();

      try {
        await audio.play();
        // Success — mark once-key as consumed
        if (options?.once) {
          playedKeysRef.current.add(options.once);
        }
        setIsSpeaking(true);
        audio.onended = () => {
          if (pendingBlob) URL.revokeObjectURL(pendingBlob);
          pendingBlob = null;
          setIsSpeaking(false);
        };
      } catch (err) {
        // Gesture window expired — defer to next user interaction
        if ((err as Error).name !== 'NotAllowedError') {
          console.error('TTS play error:', err);
          if (pendingBlob) URL.revokeObjectURL(pendingBlob);
          return;
        }

        // Set up one-shot gesture listener
        gestureListener = () => {
          if (cancelled || !pendingBlob) return;
          audio.src = pendingBlob;
          audio.load();
          audio.play().then(() => {
            if (options?.once) {
              playedKeysRef.current.add(options.once);
            }
            setIsSpeaking(true);
            audio.onended = () => {
              if (pendingBlob) URL.revokeObjectURL(pendingBlob);
              pendingBlob = null;
              setIsSpeaking(false);
            };
          }).catch((playErr) => {
            console.error('TTS deferred play failed:', playErr);
            if (pendingBlob) URL.revokeObjectURL(pendingBlob);
          });
          document.removeEventListener('click', gestureListener!);
          document.removeEventListener('touchstart', gestureListener!);
          gestureListener = null;
        };

        document.addEventListener('click', gestureListener, { once: true });
        document.addEventListener('touchstart', gestureListener, { once: true });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('TTS prepare error:', err);
    }
  })();

  return cancel;
}, [effectivelyEnabled]);
```

### 1.3 HomeHero uses `prepareAndPlay`, not `speak`

In `HomeHero.tsx`:

```tsx
const tts = useTTS();
const { firstName } = useFirstName(); // see Fix 3

useEffect(() => {
  // Only call once firstName is known and not the email-fallback placeholder
  if (!firstName) return;

  const greetingText = buildGreetingText(firstName);
  const cancel = tts.prepareAndPlay(greetingText, { once: 'home-welcome' });
  return cancel;
}, [firstName]);
```

The `prepareAndPlay` returns a cancel function used in the useEffect cleanup, so unmounts before playback are clean.

### 1.4 JarvisMode keeps using `speak`

Opening Jarvis IS a tap. The gesture window should be fresh. Keep `tts.speak()` for Jarvis greetings and replies. If it occasionally fails with NotAllowedError, the toast surfaces it. We don't try to handle Jarvis-side gestures because the user is actively engaged — they'll see the toast and we can iterate post-launch.

This is a deliberate scope choice: fix the most common path (Home greeting), tolerate occasional Jarvis edge cases.

---

# Fix 2: `once` key consumed only on successful playback

This is implicit in Fix 1's implementation above — note that `playedKeysRef.current.add(options.once)` only runs *after* `audio.play()` succeeds, not before the fetch. If anything before successful playback fails, the key isn't consumed and can be retried on next mount.

For the existing `speak()` function (used by JarvisMode), apply the same change:

```tsx
// Inside speak(), after audio.play() resolves successfully:
if (options?.once) {
  playedKeysRef.current.add(options.once);
}
```

Remove the early `playedKeysRef.current.add(options.once)` at the top of the function.

---

# Fix 3: Block the name flicker

## The visible-text fix

In `Index.tsx`, change the displayName resolution:

**Before:**
```tsx
const displayName = profile?.display_name ||
                    user?.user_metadata?.display_name ||
                    user?.email?.split("@")[0] ||
                    "Athlete";
```

**After:**
```tsx
// While profile is loading, show a placeholder rather than the email-derived fallback
const displayName = profile?.display_name ||
                    user?.user_metadata?.display_name ||
                    (profileLoading ? null : user?.email?.split("@")[0]) ||
                    "Athlete";
```

Where `profileLoading` is the loading state from `useProfile`. If `useProfile` doesn't expose a loading flag, add one — it should be `true` while the initial query is in flight, `false` after.

When `displayName` is `null` during loading, render a skeleton or simply hide the name element. Don't show "Athlete" — that's misleading. Show "..." or an empty string.

## The greeting text fix

In `HomeHero.tsx`, the greeting text uses the resolved name. Block greeting generation until the name is real:

```tsx
const { profile, loading: profileLoading } = useProfile();
const { user } = useAuth();

const firstName = (
  profile?.display_name ||
  user?.user_metadata?.display_name ||
  null  // No email fallback — we'd rather skip the greeting than say the email
)?.split(' ')[0];

useEffect(() => {
  if (profileLoading) return;
  if (!firstName) {
    // Profile loaded but no name — use neutral greeting
    const greetingText = buildGreetingText('there');
    const cancel = tts.prepareAndPlay(greetingText, { once: 'home-welcome' });
    return cancel;
  }
  const greetingText = buildGreetingText(firstName);
  const cancel = tts.prepareAndPlay(greetingText, { once: 'home-welcome' });
  return cancel;
}, [profileLoading, firstName]);
```

Wait for profile to finish loading. Don't use email fallback. If no display name exists, use "there" as a neutral greeting.

## A small refactor

Consider extracting `firstName` resolution into a `useFirstName()` hook used by both Index.tsx and HomeHero.tsx (and anywhere else that needs it). Single source of truth for the resolution logic.

```tsx
// src/hooks/useFirstName.ts
export function useFirstName(): { firstName: string | null; loading: boolean } {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  
  if (loading) return { firstName: null, loading: true };
  
  const fullName = profile?.display_name || user?.user_metadata?.display_name || null;
  const firstName = fullName?.split(' ')[0] || null;
  
  return { firstName, loading: false };
}
```

Use everywhere a first name is needed. Email is never used as a name source.

---

# Fix 4: Defeat chat history contamination

## Two parts: server prompt restructure + one-off history reset

### 4.1 Move the name directive after the chat history

In `supabase/functions/ai-coach/index.ts`, the current order is:

1. System prompt with USER NAME INSTRUCTION
2. User context
3. Chat history (40 messages, some containing wrong names)
4. New user message

The AI weights recency. The instruction at the top is overridden by 40 contradicting examples below it.

Change the order to:

1. System prompt (general behaviour)
2. User context
3. Chat history (40 messages)
4. **A reminder system message immediately before the new user message:** "REMINDER: The user's name is Vanessa. Always address them as 'Vanessa', never anything else."
5. New user message

The reminder is in the most-recent position, where it carries the most weight. The order matters more than the wording.

If the existing code uses a structured messages array, insert a synthetic system message at position N-1 (just before the new user input). Look at how Anthropic API messages are structured in the codebase — it should be straightforward to insert.

### 4.2 One-off history reset for testing

To make testing meaningful, clear the test user's chat history. This is a manual SQL operation, not a code change. Vanessa runs this in Supabase Studio:

```sql
-- One-time clean-up of contaminated test history
-- Replace USER_ID with the actual UUID of the test account
DELETE FROM messages 
WHERE user_id = 'USER_ID_HERE'
  AND (content ILIKE '%vanessajhutton%' OR content ILIKE '%vanessa dev%');
```

Or, for a full clean slate:

```sql
-- Nuclear option — clear all chat history for the test user
DELETE FROM messages WHERE user_id = 'USER_ID_HERE';
```

Vanessa decides which. The selective delete is safer; the nuclear option guarantees a clean slate.

**This is critical for testing.** Without it, the directive change can't be properly verified — the historical examples will keep contaminating the prompt regardless of how strong the directive is.

---

# Out of scope (do not do, even if tempted)

- Caching audio blobs across sessions
- Refactoring `speak()` to also use prepareAndPlay pattern (only the Home greeting needs gesture binding)
- Adding visual indicators for the deferred-play state
- Changing the toast messages
- Switching TTS providers
- Adding playback queueing for rapid successive speaks
- Refactoring useProfile or useAuth
- Migrating localStorage keys
- Removing the voice picker UI in ChatSettings
- Touching anything in JarvisMode beyond what Fix 2 requires (the post-success `once` key change)
- Editing the prompt's system message wording (Fix 4 only adds a reminder; doesn't rewrite the base prompt)

If implementer spots other bugs in passing, leave a TODO comment and report in the response. Do not fix inline.

---

# Acceptance criteria

This spec is the last voice attempt before deferral. **All criteria must pass on Vanessa's account, on her real device, via TestFlight.** Not a fresh test account; not a simulator.

1. **No flicker.** Opening the app: no "vanessajhutton" text appears on screen at any point. If profile hasn't loaded, the name placeholder shows "..." or is hidden, never the email fallback.
2. **Home greeting plays.** Either immediately after app open (if gesture window allows) or on the first user tap thereafter. Includes the correct first name. No "Voice unavailable" toast on a clean run.
3. **Home greeting doesn't double.** Even with Index.tsx's double-render pattern, the greeting plays exactly once per app launch.
4. **Greeting retries on next launch.** Force-quit and reopen — greeting plays again (because the `once` key is session-scoped and a new session starts).
5. **Greeting retries after failure.** If for some reason the first attempt fails (e.g. network blip mid-fetch), the next launch tries again — the `once` key wasn't consumed on the failure.
6. **AI says "Vanessa" not "vanessajhutton".** After the test user's history is cleared, AI consistently addresses Vanessa by first name only. Test 5+ messages in a row.
7. **Voice-off setting works.** Toggle voice off → no Home greeting, no Jarvis audio. Toggle on → audio resumes.
8. **Session mute in JarvisMode works.** Tapping volume icon mutes until session ends.
9. **No echo.** Opening Jarvis while Home greeting is still playing cuts off the Home greeting cleanly. No overlap.
10. **No regressions.** Schedule creation, goals flow, regular conversation through Jarvis all still work.
11. **No TypeScript errors, no console warnings.**

---

# Testing checklist (real device, Vanessa's account)

Run in this exact order:

### Pre-test setup
- [ ] Run the SQL to clean test user's history (Vanessa's choice: selective or nuclear)
- [ ] Confirm Build 102 is on TestFlight and installed on iPhone

### Cold launch (1)
- [ ] Force-quit the app fully
- [ ] Open the app
- [ ] Watch the screen carefully on first render — does "vanessajhutton" appear? Should NOT.
- [ ] Listen for the Home greeting. Does it play? Does it say "Vanessa"?
- [ ] If you don't hear it within ~2s, tap the screen anywhere. Does it play now? (This is the gesture-binding fallback working.)

### Cold launch (2)
- [ ] Force-quit again
- [ ] Reopen
- [ ] Greeting plays again (because `once` is session-scoped)
- [ ] Name is correct again

### Open Jarvis
- [ ] Tap HIIT button mid-Home-greeting (interrupt it)
- [ ] Home audio cuts cleanly, no overlap
- [ ] Jarvis greeting plays, uses "Vanessa"
- [ ] Send 5 messages, listen for the name in each response
- [ ] All five say "Vanessa", none say email/username/full name

### Mute test
- [ ] Mid-Jarvis-conversation, tap volume icon
- [ ] Send a message — text appears, no audio
- [ ] Tap volume icon again to unmute
- [ ] Send another message — audio plays

### Voice-off test
- [ ] Open Chat Settings, toggle Voice OFF
- [ ] Force-quit and reopen
- [ ] No Home greeting (no toast either — voice is intentionally disabled)
- [ ] Open Jarvis, send a message — text appears, no audio, no toast
- [ ] Toggle Voice back ON
- [ ] Force-quit, reopen, hear Home greeting

### Network failure
- [ ] Enable airplane mode
- [ ] Force-quit and reopen
- [ ] Home greeting attempts but fails — toast appears
- [ ] Disable airplane mode
- [ ] Force-quit and reopen again — should now work

---

# Reporting back

Implementer's response must confirm:

1. Each acceptance criterion verified by Vanessa on her device, with her account.
2. The SQL clean-up command was run before testing.
3. Edge function deployed successfully.
4. Bundle size delta.
5. Any other voice-adjacent code paths discovered during implementation that we hadn't addressed.
6. TestFlight build number.

**If any criterion fails, do not attempt to patch further.** Report the specific failure and we make the deferral call.

---

# Rollback

Each fix is contained. If Build 102 is worse than Build 101:
1. Revert TTSContext.tsx changes (revert to Build 101 state, not pre-101)
2. Revert Index.tsx and HomeHero.tsx changes
3. Revert the edge function deploy

The SQL history deletion is the only irreversible action — but the history was contaminated anyway, so reverting wouldn't restore anything we want back.

---

# Notes for the implementer

1. **This is the last voice patch attempt.** If it doesn't land cleanly, voice is being deferred to v1.0.1. Take care.
2. **iOS gesture binding is the most important fix.** The prefetch-then-play-on-gesture pattern is what unblocks the welcome greeting. Get this right.
3. **Test on real device, not simulator.** Audio + iOS + Capacitor only behaves like production on hardware.
4. **The SQL cleanup is non-negotiable for testing.** Without it, the directive fix can't be verified. Vanessa runs the SQL, then tests.
5. **Don't refactor anything not in this spec.** Three previous rounds expanded mid-implementation. Tight scope this time.
6. **If something genuinely can't work as specified, stop and report.** A 4th-round patch is more expensive than the deferral. Better to flag the architectural limit than ship a half-fix.
