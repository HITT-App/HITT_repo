# HITT — Backlog

Open tasks not yet scoped into their own `docs/scope-*.md`. Numbering continues the
`#107–#110` series from `scope-android-launch-followups.md`. Move an item into its own
scope doc once it's big enough to need one; strike it here and link the doc.

**Added 2026-07-29** (owner request): #111–#115. #116–#118 added the same day.

## Status at 2026-07-30 — v1.0.6 / Build 332 submitted for App Store review

Everything below is committed, pushed, and shipped in **Build 332** unless stated otherwise.
Database migrations are applied to production and the edge functions are deployed.

| Task | State | What's left |
|---|---|---|
| **#111** external share → feed | Shipped (332) | Device check; only the `CompletionSummary` share path is wired |
| **#112** like notifications | **Likely a non-bug** | Only 1 like has ever occurred app-wide; Casey's pushes work |
| **#113** keyboard covers composer | Shipped (332) | Device check on iOS **and** Android |
| **#114** Health Connect | **Decided, not built** | ~80% already exists; workout ingest is the gap |
| **#115** recipe nutrition | Shipped (332) + data live | — |
| **#116** Capacitor splash | Shipped (332) | Device check |
| **#117** workout duration | Shipped (332) | Device check — time a 15/30/60 min plan |
| **#118** progress photos | Shipped (332) | Device check; privacy declarations |

**The three things that genuinely need someone's attention:**

1. **#112 diagnosed (2026-07-30).** A second QA account now exists so the smoke test runs —
   Tier 1 passes 8/8, so the in-app half is fine. The test account had **`push_enabled = false`**,
   which `notify-user:278` treats as a hard skip. Two caveats: only **2 of 61 users have a
   preferences row at all** (the other 38 token-holders fall through to *allowed*), and
   `notify-user` returns **200 whether it sends or skips**, so the pg_net log can't tell them
   apart. Confirm on TestFlight with two real devices.
2. **Privacy declarations for #118.** Build 332 is the first that can store body photos. The
   App Privacy questionnaire and the published privacy policy both need to say so. See
   `OWNER_DECISIONS.md`.
3. **Nothing below has been verified on a physical device.** Every "shipped" item was checked
   by build, typecheck, unit tests and reasoning only. Build 332 on TestFlight is the first
   real test — particularly #117 (needs a stopwatch), #113 and #118 (need a real keyboard and
   camera), and #111's cold path (needs iOS to actually reclaim the WebView).

---

## #111 — External share should also post to the in-app feed

**Type:** Feature · **Status: implemented 2026-07-29, untested on device**

**What shipped:**
- `src/lib/pending-share.ts` — the pending-share record. Metadata in `localStorage`,
  share-card PNG in IndexedDB (a Blob store, so no ~5MB string budget). 10-minute TTL.
- `src/components/share/ShareToFeedPrompt.tsx` — mounted globally in `App.tsx` inside the
  router. Checks on boot (cold path) and on `appStateChange → isActive` (warm path);
  restores `returnRoute` then offers the feed post. Uploads the card via `useImageUpload`
  and posts through `createPost`; falls back to a text-only post if the upload fails.
- `CompletionSummary.tsx` — writes the record immediately **before** the share sheet opens,
  and clears it if the user cancels (so cancelling doesn't trigger a prompt on return).
- `useAuth.signOut` clears the record + blob, so a pending share can't leak between accounts
  on a shared device.

**Scope note — one live share path is wired, not all seven.** `CompletionSummary` is the
component actually rendered by `ActivityLive`, `GymTimer`, `WorkoutPlayer` and `Triathlon`,
so it covers activity sharing. Deliberately **not** wired: `JarvisMode.tsx:1236`,
`watch-event-handler.ts:114`, and the badge / weekly-stats share sheets — the last three
aren't activity shares and the backlog question about whether they should offer a feed post
is still open. `SocialShareButtons.tsx` was left alone because **it has no callers** — it's
dead code.

**Still needs a real-device test.** The cold path is the whole point of the design and it
cannot be reproduced in a browser or reliably in the simulator: you need iOS to actually
reclaim the WebView. Test by sharing to Instagram on a physical device.

---

### Original analysis

When a user shares an activity outside the app (Instagram/WhatsApp/native share sheet), the
activity should also be added to the HITT community feed — one action, both destinations.

**Where it lives:**
- `src/components/workout/SocialShareButtons.tsx` + `ShareOptionsGrid.tsx` — the external
  share surfaces.
- `src/components/workout/ShareCardCanvas.ts` — already generates the 1080×1080 / 1080×1920
  PNG being shared, so the image for the feed post is free.
- `community_posts` (user posts with optional image URLs) is the write target.

**Decided (2026-07-29):** opt-in via a prompt shown **on return to the app** — the user shares
out, comes back, and is asked "Also post this to the HITT feed?" This resolves the
privacy concern (nothing is posted without an explicit yes) and reads as a natural
continuation rather than a surprise.

### Blocker: returning to the app dumps the user on the home screen

The prompt is only worth building if the user comes back to where they were. Right now they
don't. Two distinct return paths, and they need different fixes:

**Warm return — app still resident in memory.** The WebView survives, the React tree and the
router are intact, the user lands back on the completion screen. Only work needed: listen for
`App.addListener('appStateChange', { isActive: true })` and show the prompt. Cheap.

**Cold return — iOS killed the WebView.** This is the reported symptom, and it's the likely
one: sharing a 1080×1080 PNG into Instagram is memory-heavy, so iOS reclaims HITT in the
background. On relaunch Capacitor reloads from the root URL and `BrowserRouter`
(`src/App.tsx:178`) starts at `/` — the home screen. **Nothing persists the current route**,
so there is nothing to restore from.

**Fix shape — a pending-share record, which solves both paths at once:**

1. Immediately *before* invoking `navigator.share()` / `Share.share()`, write a
   `hitt:pending_share` record to `localStorage`: `{ activityId, imageUrl, returnRoute,
   createdAt }`. Do this before the call, not after — on the cold path there is no "after".
2. On app boot and on `appStateChange → isActive`, read the record. If it exists and is
   recent (suggest a 10-minute TTL — beyond that the user has moved on and a surprise prompt
   is worse than nothing), navigate to `returnRoute` and show the "Also post to the feed?"
   dialog.
3. Clear the record on answer, on dismiss, or on TTL expiry.

`localStorage` is the right store here — HITT already keeps its auth session there (see
`CLAUDE.md` → ITMS-90076 note), so it's known to survive the kill/relaunch cycle.

**Share entry points that need the record written** — there are more than one, and they
must all be covered or the prompt fires inconsistently:
- `src/components/workout/SocialShareButtons.tsx:47` — `navigator.share`
- `src/components/workout/CompletionSummary.tsx:447` — Capacitor `Share.share`
- `src/components/coach/JarvisMode.tsx:1236` — share from the coach
- `src/lib/watch-event-handler.ts:114` — Apple Watch share hand-off
- `src/components/WeeklyStatsShareSheet.tsx:125`, `gamification/NewBadgeModal.tsx:132`,
  `gamification/AchievementModal.tsx:148` — decide whether badges/weekly stats should offer
  the feed post too, or whether #111 is activity-shares only

**Note:** `handlePlatformShare` in `SocialShareButtons.tsx` uses
`window.open(url, '_blank')` for the web-intent platforms, which is a different return path
again (in-app browser, not a separate app). Worth checking whether it needs the same handling.

**Also needs:** the share-card PNG uploaded to storage (feed posts reference image URLs, not
blobs), and a decision on what caption text is pre-filled.

**Worth noting:** persisting the route is useful well beyond sharing — any backgrounding long
enough for iOS to reclaim memory currently drops the user at home. Consider whether the route
persistence part should be lifted out of #111 into its own general fix.

**Related:** `docs/specs/SCOPE_new_activity_share_prompt.md` covers the sister problem —
prompting users to share activities that sync in from Garmin/Fitbit/Whoop/Oura. That scope
is written but not started; #111 and it should probably ship together since both end at the
same "create a feed post" path.

---

## #112 — Notification when someone likes a post

**Type:** Bug · **Status: code fix written 2026-07-29 — BUT still needs a Vault change to actually work**

**What shipped:** `supabase/migrations/20260729120000_fix_push_config_placeholder.sql`
1. Deletes the `'__set_via_supabase_studio__'` placeholder rows, so the existing `IS NULL`
   guards start behaving as written in **all three** affected functions — the community
   fan-out plus `fire_workout_reminder_morning` / `fire_workout_reminder_evening` — without
   having to redefine the two reminder functions.
2. Adds `public.check_push_config()` (service-role only) reporting MISSING / PLACEHOLDER /
   INVALID / ok per secret.
3. Redefines `fanout_community_notification()` to `RAISE WARNING` when unconfigured instead
   of returning silently, and to reject the placeholder and non-https values explicitly.
   Body is otherwise byte-identical to `20260703180000_fix_community_deep_links.sql` —
   deep-link routes preserved.

### ⚠ Correction after applying (2026-07-29): the placeholder was NOT the cause here

Migration applied to production, then `check_push_config()` run against it:

```
notify_endpoint_url  → ok
notify_service_key   → ok
```

**Both secrets already held real values.** The placeholder trap is real in the code — it
would silently disable every push on a fresh project or after a DB reset, and it's worth
having fixed — but it is **not** why likes aren't notifying on this project. My earlier
"this is the whole bug" call was wrong.

### Likely resolved 2026-07-30 — there was almost nothing to notify about

Checked Casey's account after he reported *workout* notifications arriving normally.

**Casey's setup is correct and working.** `caseysonnekus1@gmail.com` — 1 iOS device token,
**no `notification_preferences` row** (so push is allowed by the `if (prefs && ...)` guard),
and **3 `follow` notifications** received. Follows and workout reminders both reach him, which
proves the whole chain — trigger → fan-out → pg_net → `notify-user` → APNs — works for a real
user on a real device.

**He has 1 post with 0 likes.** There has never been a like notification to send him.

**Across the entire production history there has been exactly ONE post like:**

| Type | Count | First | Latest |
|---|---|---|---|
| follow | 26 | 2026-07-02 | 2026-07-27 |
| friend_request | 3 | 2026-07-27 | 2026-07-27 |
| comment | 2 | 2026-06-18 | 2026-07-03 |
| **like** | **1** | **2026-07-26** | **2026-07-26** |
| message | 1 | 2026-07-03 | 2026-07-03 |
| friend_accept | 1 | 2026-07-27 | 2026-07-27 |

7 posts, 1 like, in two months. That single like **did** correctly produce a notification —
for `jon.latchem@me.com`, who has a device token and no preferences row, so the push should
have been sent.

**Conclusion: this is most likely not a bug.** The two confirmed contributors were the QA
account's `push_enabled = false` (now fixed) and the near-total absence of like activity to
observe. The trigger, fan-out and delivery path are all demonstrably working.

**The one thing still unproven:** whether the APNs push for that single like actually landed
on Jon's device. Only he can say. If you want certainty, like a post between two TestFlight
devices — that is now easy with the second QA account.

**Worth doing regardless:** `notify-user` returns 200 whether it sends or skips, so nothing
in the logs distinguishes a delivered push from a dropped one. Fix that and the next question
like this takes minutes instead of a day.

---

### Investigation 2026-07-30 — second QA account created, chain traced end to end

A second QA account now exists (`hitt.qa.test+2@gmail.com`; credentials in the gitignored
`.claude/qa-credentials.md`), so the smoke test can finally run — the like trigger skips
self-likes, so one account could never produce a notification.

**`tests/smoke-like-notification.ts` Tier 1: 8/8 passing.** The in-app half is entirely
healthy — row created, correct type and actor, unread, `likes_count` incremented, self-like
correctly suppressed. The fault is purely in the device-push half.

**Cause found for the test account: `push_enabled = false`.** `notify-user/index.ts:278`
skips whenever `push_enabled` is false *or* the category column is false. The QA account had
2 device tokens and `community_notifications = true`, but the master toggle off — so every
push it should have received was silently dropped. Flipping it to true was verified to let
the chain proceed.

**The bigger finding — only 2 of 61 users have a `notification_preferences` row at all:**

| | |
|---|---|
| Users | 61 |
| With a device push token | 40 |
| With a `notification_preferences` row | **2** |

The two are the QA account (was `push_enabled = false`) and Vanessa's own
(`push_enabled = true`). The other **38 token-holding users have no row**, which by
`notify-user`'s logic means push is *allowed* (the guard is `if (prefs && ...)`, so a null
row falls through to sending). So most users should be receiving pushes — meaning the
original report may have come from testing on the QA account specifically.

**Real observability gap worth fixing:** `notify-user` returns **200 for both "sent" and
"skipped: user preference"**. `net._http_response` therefore shows 200 either way, so the
pg_net log cannot distinguish a delivered push from a silently-dropped one. That is why this
went unnoticed. Worth returning a distinct status or logging the outcome.

**What could not be verified from here:** whether APNs actually delivers for a user with
`push_enabled = true`. That needs the function logs (no `functions logs` on CLI v2.90.0) or
a real device. Test on the TestFlight build with a second device.

---

### Earlier analysis — remaining causes, in order of likelihood:

1. **No `device_push_tokens` row** for the recipient — push permission never granted on a
   real device. Nothing downstream can work without one, and it's invisible from the
   in-app inbox, which keeps working regardless.
2. **`notification_preferences` gate** — `notify-user` maps community/social to a column;
   false silently drops the push.
3. **`notify-user` itself failing** (APNs key, bundle mismatch after the Casey transfer).
   Worth checking the function logs and `net._http_response` for the POST's status code.

**`tests/smoke-like-notification.ts` is now the tool for this** — Tier 2 checks exactly
these three in order. It needs a second QA account, since the trigger deliberately skips
self-likes.

---

### Original analysis

**The code path already exists end to end.** Don't rebuild it — find out why it isn't firing:

1. A DB trigger inserts a `'like'` row into `community_notifications` on every
   `community_likes` insert (migration `20260122010826_*.sql`).
2. `fanout_community_notification()` in `supabase/migrations/20260703150000_community_event_push.sql`
   turns that row into a push via `notify-user` — and it has an explicit
   `WHEN 'like'` branch ("*{name}* reacted to your post").
3. `useCommunityNotifications.ts` already types `'like'` for the in-app inbox.

**Prime suspect — the vault placeholder, and the NULL guard that can't catch it:**

`fanout_community_notification()` reads `notify_endpoint_url` / `notify_service_key` from
`vault.decrypted_secrets` and bails early if either **`IS NULL`** — deliberately, so a missing
secret never blows up the parent INSERT.

But **the migrations seed both secrets with the literal string `'__set_via_supabase_studio__'`**
(`20260703150000_community_event_push.sql:158-166` and again in
`20260703160000_workout_reminder_push.sql:122-127`). They are therefore never NULL, the guard
never trips, and pg_net POSTs to a string that isn't a URL. Every community push fails
silently while the in-app inbox row still lands — which is precisely the reported symptom.

**So: check in Studio → Vault whether those two secrets are still the placeholder.** If they
are, that's the entire bug, and it also means workout reminders and every other community
push have been dead too.

Secondary suspect: the preference gate — `notify-user` maps category → a
`notification_preferences` column (likes route via `community`/`social`); false drops the push.
Third: no `device_push_tokens` row, i.e. push permission never granted on a real device.

**Worth fixing regardless:** the `IS NULL` guard should also treat the placeholder value as
unconfigured, so this fails loudly next time instead of silently.

**Smoke test — written: `tests/smoke-like-notification.ts`.**

Splits the chain so the output tells you which half is broken:

```bash
TEST_EMAIL=a@x TEST_PASSWORD=p \
TEST_EMAIL_2=b@x TEST_PASSWORD_2=p \
[SUPABASE_SERVICE_ROLE_KEY=...] \
bun run tests/smoke-like-notification.ts
```

- **Tier 1** (anon key) — post created, liked by the second account, asserts the
  `community_notifications` row lands for the author with `type='like'`, correct `actor_id`,
  `is_read=false` (a true value here would itself kill the push), `likes_count` incremented,
  and that a **self-like creates no notification** (the trigger's `p.user_id != NEW.user_id`
  guard).
- **Tier 2** (service role, optional but this is where the bug is) — asserts the vault
  secrets are not the placeholder, checks the author's notification prefs and device token,
  and reads `net._http_response` for the actual POST status.

Cleans up after itself via the post-delete cascade.

**Two prerequisites before it can run:**
1. **A second QA account.** Only `hitt.qa.test@gmail.com` exists today; the self-like guard
   makes a single account structurally incapable of producing the notification.
2. The service-role key for Tier 2. Tier 1 runs without it, but Tier 1 is the half that
   probably already works — skipping Tier 2 likely means the test passes while the bug stands.

**Note on the vault check:** `vault` isn't in PostgREST's exposed schemas on a default
project, so that read may 404. The test reports that as a warning telling you to check Studio
manually — it does not report it as a pass.

---

## #113 — Community chat: keyboard covers the text box

**Type:** Bug · **Status: implemented 2026-07-29, untested on device**

**What shipped** — `useKeyboardHeight()` applied to all three affected composers, following
the `JarvisMode.tsx` pattern (`paddingBottom: keyboardHeight > 0 ? keyboardHeight + 8 :
env(safe-area-inset-bottom)`):
- `CommunityChatroom.tsx` — the reported one.
- `PostComments.tsx` — same structural shape, was never reported.
- `CommunityChat.tsx` — same, plus two extra fixes below.

**Extra fix found in `CommunityChat.tsx`:** its `scrollRef` was attached to the Radix
`<ScrollArea>` root, but Radix puts the actual scroller on an inner viewport element — so
`scrollRef.current.scrollTop = scrollHeight` (line 55) has never scrolled anything. The
scroll-to-bottom on new message was silently dead. Converted to a native scrolling `div`,
which fixes that **and** gives the flex column a bounded height. Container also moved from
`min-h-screen` to `h-[100svh] overflow-hidden` to match the chatroom.

**`capacitor.config.ts` was deliberately left alone** — see the correction below.

**Still needs a real-device test.** `useKeyboardHeight` early-returns on
`!Capacitor.isNativePlatform()`, so none of this is observable in a browser. Verify on
physical iOS **and** Android.

---

### Original analysis

Typing in the community chatroom, the iOS keyboard rises over the message input instead of
pushing it up.

**Root cause — the fix already exists in the codebase and these surfaces don't use it.**

`src/hooks/useKeyboardHeight.ts` wraps Capacitor's `keyboardWillShow`/`keyboardWillHide` and
returns the live keyboard height. Seven surfaces already pad their bottom control with it —
`JarvisMode.tsx:203`, `chat/ChatContainer.tsx:23`, `NutritionPreferencesFlow.tsx:121`,
`NutritionDashboard.tsx:125`, `ActivityDetail.tsx:139`, `LogMeal.tsx:51`, `Hydration.tsx:67`.

The community surfaces don't. They pin their container to a viewport-locked height
(`h-[100svh]`, `fixed inset-0`) — neither of which shrinks when the keyboard opens — and pad
the composer with `env(safe-area-inset-bottom)` only, which accounts for the home indicator
but not the keyboard. So the composer stays exactly where it was and the keyboard covers it.

**Correction to the first-pass diagnosis:** don't change `Keyboard: { resize: 'body' }` in
`capacitor.config.ts`. Seven surfaces are already written to compensate for current behaviour;
switching to `resize: 'native'` globally would likely double-pad all of them. Apply the
existing hook to the surfaces that lack it instead — smaller, precedented, and contained.

### Audited — every text input in the app checked against this pattern

**Affected (bottom-pinned composer + viewport-locked container + no `useKeyboardHeight`):**

| Surface | Line | Container | Status |
|---|---|---|---|
| `pages/CommunityChatroom.tsx` | 1416 | `h-[100svh]` + `overflow-hidden` | **reported** |
| `pages/PostComments.tsx` | 173 | `fixed inset-0 flex flex-col` | **not reported — same shape exactly** |
| `pages/CommunityChat.tsx` | 198 | `min-h-screen flex flex-col` | **not reported — likely affected** |

`PostComments.tsx` is the one to be sure about: `fixed inset-0 flex flex-col` with the
composer as a `shrink-0` last child is structurally identical to the chatroom. If the chatroom
is broken, commenting on a post is broken the same way — and commenting is a much more common
action than the chatroom.

`CommunityChat.tsx` additionally wraps its message list in `<ScrollArea>`, which `CLAUDE.md`
explicitly warns against for full pages ("breaks sticky positioning… native browser scroll is
better for Capacitor on iOS"). Fix that at the same time.

**Checked and NOT affected:**
- `pages/CommunityMessages.tsx` — the only input is a conversation **search** field in the
  header (line 35), not a bottom composer.
- The 7 surfaces listed above that already consume `useKeyboardHeight`.
- `LogMeal.tsx:567` additionally has its own `onFocus` → `scrollIntoView` workaround with a
  comment explaining the iOS focus/`keyboardWillShow` ordering — belt and braces, leave it.

**Fix:** apply `useKeyboardHeight()` to the three affected composers, following the
`JarvisMode.tsx:1475-1481` pattern (`paddingBottom: keyboardHeight > 0 ? keyboardHeight + 8 :
env(safe-area-inset-bottom)`).

**Verify on a real device, both platforms.** The hook early-returns on
`!Capacitor.isNativePlatform()`, so this cannot be reproduced or verified in a browser.
Re-check against the Android 15 edge-to-edge rules in `CLAUDE.md`.

---

## #118 — Body-scan progress photos: before/after comparison

**Type:** Feature · **Status: BUILT 2026-07-29 — needs a device check**

### Correction to the first investigation

The first pass said "no comparison screen exists". **That was wrong.** The Progress tab's
**"Visual progress" card already had FIRST and LATEST slots**, with dates and a
"N weeks apart" label — it rendered a placeholder person icon because there was no photo to
show. The original keyword search missed it (the card is titled "Visual progress", and the
slots are inline markup rather than anything named "compare"). The intended design was
built; only the storage half was missing.

### What shipped

- **`20260729170000_body_scan_photos.sql`** (applied) — `photo_path` on `body_scans`, plus a
  **private** `body-scan-photos` bucket with RLS scoping every object to its owner's folder.
  No admin or shared read path: nobody but the user, including staff, can read these.
- **Consent at the point of saving** — an opt-in tick above "Save Scan Results":
  *"Save this photo to track progress"*, defaulting to **off**, stating plainly that nothing
  is stored otherwise. Declining leaves body scan working exactly as before.
- **Upload on consent only** — the front pose goes to `{user_id}/{scan_id}/front.jpg`.
  Best-effort: a failed upload never loses the scan itself.
- **Progress tab renders the photos** — first vs latest, via short-lived signed URLs
  (the bucket is private). Empty states explain *why* a slot is blank, so it reads as a
  choice rather than a bug.
- **`delete-account` now clears storage.** It previously did **no storage cleanup at all** —
  deleting the `body_scans` row left any photo in the bucket. It now walks and removes the
  user's objects by prefix. Deployed.

### Still to do before this is really finished

1. **Device check** — camera capture and upload can't be verified in a browser.
2. **Individual photo deletion** — a user can currently delete a scan, but there's no
   "remove just this photo" control. The RLS delete policy is in place for it.
3. **Privacy policy + store data-safety declarations** — both need updating to say body
   photos may be stored. **Do this before the feature reaches production users.**

### What actually happens today

1. **Photos live in React state only.** `BodyScan.tsx:165` holds them as
   `capturedImages: Record<number, string>` — base64 data URLs in memory.
2. **They're sent for analysis, then discarded.** Line 394 posts them to the `analyze-body`
   edge function. When the component unmounts they're gone. There is **no upload call
   anywhere in the file**.
3. **No database column exists.** Verified against production — `body_scans` has
   `id, user_id, scanned_at, estimated_body_fat, confidence_level, analysis, created_at,
   deleted_at`. No image column. The insert at `BodyScan.tsx:455` writes only the numbers
   and the analysis JSON.
4. **No storage bucket exists** for scans. Production has `activity-images`, `app-assets`,
   `avatars`, `community-images`, `meal-images`, `workout-thumbnails`, `workout-videos`.
5. **Nothing reads scans back for display.** `body_scans` is written in exactly one place
   and otherwise only read server-side by `ai-coach`. No screen renders scan history.
   (`before_image_url` / `after_image_url` exist, but they belong to **community posts** —
   a different feature.)
6. **The code says so.** `BodyScan.tsx:923`: *"Path B (route through Jarvis with comparison
   + choice card) is still to build."*

### What building it involves

1. **A private storage bucket** — e.g. `body-scans`, **not public**. Every other image
   bucket except `activity-images` is public; these must not be. RLS scoped so a user can
   only read their own objects, pathed `{user_id}/{scan_id}/{pose_index}.jpg`.
2. **Upload on capture**, then store the returned paths on the scan row (a `image_paths
   text[]`, or a `body_scan_photos` child table if poses need individual metadata).
3. **A comparison screen** — first scan vs latest, pose-matched, with a date and the body-fat
   delta. Needs a scan-history read, which doesn't exist yet either.
4. **Serve via signed URLs**, since the bucket is private.

### Decide before building — this is sensitive personal data

Body photos are a significantly higher bar than the meal images and workout thumbnails
already in the app:

- **Explicit opt-in.** Users currently take these expecting a body-fat estimate, not a
  stored photo library. Saving them silently would be a genuine privacy breach. Needs a
  clear "save this photo to track progress" consent, defaulting to **off**, and it should
  be possible to use body scan without ever storing an image.
- **Deletion.** `delete-account/index.ts:30` already clears the `body_scans` **table**, but
  it does **not** touch storage — no bucket cleanup exists in that function at all. A new
  bucket must be added there or deleted accounts would leave body photos behind. That is
  the kind of gap that turns into a GDPR problem.
- **Retention + individual delete** — a user should be able to remove a single progress
  photo without deleting the whole scan.
- **Privacy policy** almost certainly needs updating to cover storing body imagery.
- **App Store / Play** data-safety declarations both list what's collected and stored;
  adding stored body photos changes those answers.

**Recommendation:** worth building — it's a genuinely motivating feature for a fitness app —
but the consent and deletion design should be agreed **before** any code, not retrofitted.
The cheapest first version is: opt-in toggle, private bucket, first-vs-latest comparison
only, and wire the bucket into account deletion in the same PR.

---

## #117 — AI-generated workouts run a fraction of their stated duration

**Type:** Bug · **Status: all three defects FIXED 2026-07-29 — needs a device check**

**What shipped:**

1. **Player set handling** — `WorkoutPlayer.tsx`. The timed-exercise countdown now calls a
   shared `advanceAfterSet()` instead of `goNext()`, so timed work repeats for its `sets`
   with a rest between, exactly as reps mode did. A "3 sets × 45s" exercise now runs
   3 × 45s, not 45s. Reps mode routes through the same helper, so it also gets an
   inter-set rest it previously lacked — **a deliberate behaviour change**, and a real
   contributor to the shortfall. The rest screen distinguishes "set 2 of 3" from the
   next exercise.
2. **Prompt** — `generate-workout-plan/index.ts`. The exercise count is now derived from
   the target via `suggestedExerciseCount()` (15 min → 3–6, 60 min → 15–18) instead of a
   fixed 5–8, and the prompt spells out the cost arithmetic — rest after every set, work
   per set, sum it, land within 15% — rather than offering the duration as a hint.
3. **Server-side enforcement** — `fitSessionToTarget()` adjusts `sets` (bounded 1–5) until
   the estimate is within 15% of target, applied to every session before persisting, with
   before/after logged and a warning when a session is still >25% off. Prompting alone
   can't guarantee the contract; this makes a silently-short plan impossible.

The duration model deliberately mirrors the player's real constants (`REST_SECS = 30`,
45s fallback). An estimate that doesn't match what the player actually does is worse than
no estimate, because it produces a confident wrong number.

**Tests:** `tests/test-workout-duration.ts` — 14 cases, all passing. Includes a
regression test reproducing the reported ~7 min for a "30 minute" plan, and checks that
15/30/45/60-minute targets each land within 25%.

**Still needs a real-device check.** The fix is verified by unit tests and reasoning, not
by a stopwatch. Generate 15, 30 and 60-minute plans and time them end to end — they should
now differ substantially. Note `deno` isn't installed locally, so the edge function was
parse-checked but not fully typechecked; deploy with
`supabase functions deploy generate-workout-plan` and watch the logs for the fitting lines.

---

### Original scope

Reported: a user's **30-minute** AI-generated workout finished in about **4 minutes**.

Note v1.0.3 and v1.0.4 both shipped "accurate workout times" work — but that covered
walks, gym and triathlon. The **AI-coach generation path was not part of it**, so this is a
gap rather than a regression of that work.

### The arithmetic reproduces the report exactly

A generated session is 6 exercises. In `WorkoutPlayer.tsx` a timed exercise defaults to
`duration_seconds || 45` and `REST_SECS = 30`:

```
6 exercises × 45s  = 270s
5 rests     × 30s  = 150s
                    ─────
                     420s  = 7 minutes   (and less when reps-based ones are tapped through)
```

Against a 30-minute target. **Three compounding defects, all independently real:**

**1. The prompt asks for a fixed exercise count regardless of duration.**
`supabase/functions/generate-workout-plan/index.ts:354`:

> "For each session, create 5–8 exercises tailored to the user's goal, styles and fitness level."

A 15-minute session and a 60-minute session get the same instruction. The target only ever
appears as a soft hint — line 338, `- Target session duration: ~${input.targetDuration}
minutes` — with nothing tying it to the structure.

**2. Nothing validates the generated total against the target.** `targetDuration` is
computed (line 91), put in the prompt, and stored as `target_duration_minutes` (line 221) —
but no code sums the exercises and compares. There is no `reduce` over durations anywhere
in the function. A wildly short plan is accepted silently.

**3. The player drops `sets` for timed exercises.** `WorkoutPlayer.tsx:692` — when a timed
exercise's countdown reaches zero it calls `goNext()`, which advances to the **next
exercise**, not the next set (`goNext` resets `setNum = 0` at line 793). So an exercise
generated as "3 sets × 45s" runs **once, for 45 seconds**. Only reps-mode honours sets, via
`completeSet()` at line 799. This alone cuts timed work to a third.

### Suggested fix, in order

1. **Fix the player's set handling for timed exercises** (defect 3). Smallest change,
   biggest single multiplier, and it's a plain bug rather than a design question — timed
   exercises should repeat for `sets` with a rest between, exactly as reps-mode does.
2. **Make duration structural in the prompt** (defect 1): derive the exercise count from
   the target rather than hardcoding 5–8, and state the expected work/rest budget so the
   model has an arithmetic target instead of a hint.
3. **Validate server-side** (defect 2): sum
   `sets × (duration_seconds or estimated reps time) + rest` per session, and if it lands
   outside roughly ±20% of target, either retry the generation or pad/trim deterministically.
   Do NOT let a wildly-off plan through silently — that's what shipped this bug.

**Worth deciding:** whether reps-based exercises get an estimated per-set time (they
currently have none, so they contribute nothing predictable to a duration estimate). Without
that, any total is only as good as the guess for reps work.

**Verify with:** a 15, 30 and 60-minute generated plan, checking wall-clock time end to end
on a device. The three should differ substantially — today they largely won't.

---

## #116 — App launched on the Capacitor logo (FIXED 2026-07-29)

**Type:** Bug — branding · **Status: fixed, needs a device check**

Reported on iOS, and it affected Android too. **Two separate defects:**

1. **The splash art was the stock Capacitor logo** — a blue "X" on white — on both
   platforms. iOS: 3 files in `Splash.imageset`. Android: 11 files across
   `drawable-{port,land}-{mdpi…xxxhdpi}`. All still the framework defaults from
   `npx cap add`.
2. **`LaunchScreen.storyboard` used `systemBackgroundColor`**, declared in the file as
   `white="1"`. In a dark app that meant the very first frame was a white flash, before
   any image drew. Now a literal `#0a0a0a`, matching
   `capacitor.config.ts → SplashScreen.backgroundColor` and the app's own splash.

**Fix:** `scripts/gen-splash.py` regenerates all 14 images from the app icon — it keys the
near-black background off the icon so the orange mark composites onto `#0a0a0a` without a
visible square seam, then centres it at 34% of the shorter edge. Idempotent; re-run it
after any icon change. The storyboard's stale `<image>` dimensions (1366) were corrected
to the real 2732 at the same time.

Launch is now: dark screen with the HITT mark → the app's own dark splash. No foreign
logo, no white flash.

**Needs a real-device check** — the native splash can't be judged from a simulator boot
alone, and Android's launch theme (`AppTheme.NoActionBarLaunch`) draws `@drawable/splash`
as the window background under edge-to-edge, which is worth eyeballing on hardware.

---

## #114 — Health Connect for Android (DECIDED 2026-07-29)

**Decision: Health Connect.** No direct Whoop / Oura / Fitbit APIs for now.

### It's already ~80% built — this is a finish job, not a new integration

Found while scoping. Already in place:

- **`@capgo/capacitor-health` installed** (`package.json`) — one plugin covering HealthKit
  on iOS and Health Connect on Android.
- **All 14 Android permissions declared** in `AndroidManifest.xml` (11 reads + 3 writes),
  with the `<queries>` entry for `com.google.android.apps.healthdata`, the
  `ACTION_SHOW_PERMISSIONS_RATIONALE` intent filter, and `tools:node="remove"` stripping the
  plugin's excess permissions.
- **Play Console declaration written** — `docs/health-connect-declaration.md`, all 14
  permissions with purpose + data flow answers.
- **`useHealthSync.ts`** reads heart rate, steps, sleep, weight and body fat and writes
  `health_metrics` + `sleep_logs`.
- **`HealthSyncPrompt`** is live on the home screen (`Index.tsx:163`).

### The gap — workouts are not ingested on Android at all

`useHealthSync` deliberately stopped writing workouts (see its comment at ~line 200): they
were meant to be handled by "the newer sync-healthkit pipeline". But that pipeline is
`src/lib/healthkit-sync.ts` → `sync-healthkit`, and it's gated on
`isHealthKitReadAvailable()` — the **iOS-only** native `HealthKitReadPlugin`. So on Android
nothing ever writes to `activity_logs`.

Net: an Android user's steps, sleep and HR sync, but **not a single workout**. Which is
exactly the coverage gap that made Health Connect the right choice.

**Remaining work, in order:**
1. Add a `health_connect` entry to `SOURCE_PRIORITY` in
   `supabase/functions/_shared/activity-types.ts`. Suggested **50** — above
   `apple_health_native` (40) since it's a real vendor-mediated session, below the direct
   vendor values (60–70). Also needs `bundleIdToSourcePlatform()`-equivalent mapping so a
   Garmin-via-Health-Connect workout lands as `garmin`, not a generic value — otherwise
   Android users' dedupe and wearable detection both degrade.
2. Read exercise sessions via `Health.queryWorkouts` (or the plugin's equivalent) on Android
   and route them through an ingest endpoint that calls `upsertActivities()`. **Must**
   normalise via `normaliseActivityType()` before the fingerprint is computed — per
   `CLAUDE.md`, skipping that makes dedupe fail silently.
3. Extend `getPrimaryWearable` so Health-Connect-sourced rows resolve to the right vendor.
4. File the Play Console declaration — **2–6 week reviewer wait**, so file it as soon as an
   AAB carrying these permissions is uploaded. This is the long pole; start it first.

**Not yet started.** Needs a physical Android device to verify — Health Connect is not
usable on an emulator without installing the Health Connect app and seeding data.

---

### Original analysis (kept for the trade-off reasoning)

**Type:** Decision — no build work until answered

**Current state: we already ingest all three, indirectly.** `sync-healthkit` reads whatever
those vendors write into Apple Health and maps bundle IDs → `source_platform`
(`whoop`, `oura`, `fitbit` all have entries in `SOURCE_PRIORITY`, ranked 60–70).
`getPrimaryWearable` already returns them, and `WearableLaunchCard` already has vendor
copy for each. So on iOS, **direct APIs are not needed for basic activity data**.

**What a direct API would actually buy us:**
- **Android.** The HealthKit path is iOS-only. Android users on Whoop/Oura/Fitbit currently
  have no ingest route at all. This is the strongest argument for direct APIs.
- **Data HealthKit doesn't carry** — Whoop strain/recovery, Oura readiness/sleep scores.
  These are the vendors' differentiated metrics and they don't cross into Apple Health.
- **Background sync.** Our HealthKit sync is foreground-only; vendor APIs support webhooks.

**Costs:** three separate OAuth integrations, three developer-program approvals (Whoop and
Oura both gate production access behind review), token refresh + revocation handling, and
three more ingest paths to keep aligned with the shared dedupe helper.

### What a direct vendor API actually involves

Per vendor, roughly in order:

1. **Developer registration + app review.** Whoop and Oura both gate production API access
   behind an application and manual approval — you describe the app, the data you want, and
   the user benefit. Fitbit (Google) requires registering an app and agreeing to their
   platform terms. Approval is calendar time, not dev time: **days to weeks**, and it is the
   critical path. Start it early or it blocks everything else.
2. **OAuth 2.0 authorisation-code flow.** Each vendor is its own flow with its own scopes:
   - Redirect/callback handling in a Capacitor WebView — HITT already does this for Google
     Sign-In via `App.addListener('appUrlOpen')` in `useAuth.tsx:134`, so there's a pattern to
     follow, but each vendor needs its own registered redirect URI.
   - A new table for per-user vendor tokens (access + refresh + expiry + scopes), RLS'd so a
     user can only see their own. Tokens are credentials — they belong in the DB with RLS,
     never in `localStorage`.
   - **Refresh-token rotation.** All three expire access tokens; Whoop rotates refresh tokens
     on use, so a dropped response can orphan a connection. Needs a refresh path plus a
     re-auth prompt when it fails.
   - Disconnect/revoke, and honouring revocation initiated on the vendor's side.
3. **Ingest.** Either polling on a cron or webhook subscriptions (all three support webhooks;
   webhooks mean a public endpoint per vendor with signature verification). Then map the
   vendor payload → our canonical shape and route through `upsertActivities()` in
   `_shared/activity-upsert.ts`. Per `CLAUDE.md`, `normaliseActivityType()` must run **before**
   the fingerprint is computed or dedupe fails silently.
4. **Dedupe against the path we already have.** This is the subtle part and the most likely
   source of bugs. An iOS user with Whoop would now be ingesting the *same workout twice* —
   once via HealthKit (`source_platform = 'whoop'`) and once direct. The three-layer dedupe
   handles this in principle, but the direct path needs its own `source_platform` value and a
   `SOURCE_PRIORITY` entry above the HealthKit-mediated one, mirroring how
   `hitt_garmin_watch` (100) outranks `garmin` (60–70).
5. **New surfaces.** Connect/disconnect UI in Settings → Connected Devices, connection-status
   and re-auth-needed states, and — if we ingest recovery/readiness — somewhere to display it
   and a decision about feeding it to the coach.
6. **Ongoing.** Three more third-party dependencies whose APIs version, deprecate, and break.

**Rough shape:** the first vendor is the expensive one (token table, refresh machinery,
settings UI, dedupe rules are all built once). Vendors two and three are meaningfully cheaper
but not free. Approval time runs in parallel with build.

### The alternative: Android Health Connect

One integration instead of three. Health Connect is Android's system-level health store —
the direct analogue of what `sync-healthkit` already does on iOS. Fitbit, Whoop, Oura and
others write to it, so a single reader covers all of them plus vendors we haven't considered.
No per-vendor OAuth, no token refresh, no per-vendor approval. It closes the actual coverage
gap (Android users have **no** wearable ingest today) and it reuses the mental model and much
of the mapping logic already built for HealthKit. Groundwork exists in
`docs/health-connect-declaration.md`.

What it does **not** get you: Whoop strain/recovery and Oura readiness — vendor-proprietary
scores that don't cross into either OS-level store. Only a direct API gets those.

**Recommendation:** Health Connect first. It's one integration instead of three, it fixes a
total gap rather than duplicating working coverage, and it has no external approval on the
critical path. Revisit direct APIs only if recovery/readiness specifically becomes a coaching
input we want — and if so, pick **one** vendor and treat it as an experiment, don't build all
three on spec.

**Action needed:** owner picks — (a) nothing for now, (b) Health Connect for Android
*(recommended)*, (c) one direct vendor API (which?), (d) all three.

---

## #115 — Meal nutrition values don't match the ingredient list

**Type:** Bug — data integrity · **Status: partially addressed 2026-07-29 — see correction below**

### ⚠️ Correction (2026-07-29) — the fix below is on a DIFFERENT dataset to the 800+ recipe list

There are **two separate meal datasets**, and the fix described below touches only one:

| Dataset | Table(s) | Surfaced by |
|---|---|---|
| The **800+ owner recipe list** | `recipes` + `ingredients` + `steps` | `BrowseMeals` (`/browse-meals`), Jarvis recipe cards |
| A separate meal set | `meals` (JSONB ingredients/instructions) | `MealsCarousel` on home → `MealDetailSheet`; `MealDetail` (`/meal/:id`) |

`MealDetail.tsx` — the page rewritten below — reads **`meals`**, not `recipes`. It never
shows the 800+ list.

**And `/meal/:id` appears to be unreachable.** Its only linker is
`components/meals/MealQuickCard.tsx`, which has **zero callers**, and `routes.mealDetail` in
`lib/routes.ts` has **zero users**. So the mock-data bugs described below were real, but on a
page users likely cannot navigate to. The fix stands; it just isn't the reported bug.

**The surface that does show the 800+ list is already clean.** `BrowseMeals`' detail sheet
renders real ingredients from the linked `ingredients` table, guards every macro with
`!= null`, and shows "Ingredients coming soon" when a recipe has none. No fabricated values.

### CONFIRMED: the mismatch was seen on Browse Meals — so it IS the `recipes` data

Owner confirmed 2026-07-29. That rules out the `MealDetail` mock-data bug entirely and puts
this squarely on the 800+ `recipes` dataset. Two audits were run against the seed migrations.

#### Finding: 60.8% of recipes have at least one ingredient with no quantity

| | |
|---|---|
| Recipes with ingredients | 957 |
| Ingredient rows | 5,754 |
| — negligible (salt, pepper, herbs…) | 1,308 |
| — "significant" (should carry an amount) | 4,446 |
| — of those, **carrying a quantity** | 3,768 (84.8%) |
| — of those, **no quantity at all** | 678 (15.2%) |
| **Recipes where every significant ingredient is quantified** | **375 of 957 (39.2%)** |
| Recipes where none are quantified | 0 |

**This is the mismatch.** The unquantified items skew heavily towards the calorie-dense
ones — `olive oil`, `sesame oil`, `sour cream`, `honey`, `parmesan`, `chimichurri sauce`.
"Olive oil" with no amount is anywhere from 40 kcal (1 tsp) to 360 kcal (3 tbsp). A user
reading that list beside a precise "412 kcal" is looking at something they cannot reconcile —
and neither can we. **There is no arithmetic error; the input data is incomplete.**

Compounding it: **`recipes` has no `servings` column** (schema:
`20260427090000_recipes_schema_and_seed.sql`), and Browse Meals shows no portion label. So
nothing states what the calorie figure is even *for*.

By seed file, worst first — `20260702000001_seed_owner_meals.sql` is the bulk of the problem
at 276/660 fully quantified:

```
 276/ 660  20260702000001_seed_owner_meals.sql
  66/ 165  20260701120000_seed_owner_keto_meals.sql
  14/  44  20260705120000_seed_owner_lean_dense_pack.sql
  11/  30  20260701130000_seed_veg_df_keto_pack.sql
   6/  28  20260705130000_seed_owner_lean_protein_plant_pack.sql
   2/  30  20260427090000_recipes_schema_and_seed.sql
```

### BUILT 2026-07-29 — quantities assigned, macros recomputed from ingredients

Owner confirmed all 957 recipes were LLM-generated and never touched since import, so the
stated macros carry no authority. Ingredients are now the source of truth and the macros
are derived from them.

**Pipeline — `scripts/recipe-nutrition/`** (reproducible; regenerate, don't hand-edit):

| File | Role |
|---|---|
| `food-table.ts` | Per-100 g kcal/P/C/F for **287 foods** — 100% of the 5,754 ingredient lines. Self-validating: refuses to run if a published kcal drifts >15% from its own Atwater sum (catches a mistyped macro that would corrupt every recipe using it). |
| `portions.ts` | Default portions for the 2,009 lines that state no amount, plus `MAX_SANE_PORTION` to catch bad source amounts. |
| `parse-seeds.ts` | Extracts recipes + ingredients from the seed SQL (handles both INSERT forms). |
| `coverage.ts` | Reports unmatched foods / missing amounts. |
| `recompute.ts` | Computes macros, emits `review.csv` and the migration. |

**Output:**
- `scripts/recipe-nutrition/review.csv` — all 957 recipes, old vs new, with status.
- `supabase/migrations/20260729140000_recompute_recipe_macros.sql` — **858 UPDATEs.**
  **NOT APPLIED.** Review the CSV first.

**Result: all 957 recipes resolved, nothing left in review.** Median calorie change +7%;
494 recipes within ±10% of the old figure. Computed meals land at 240–807 kcal (p5–p95),
median 464, median protein 35.8 g — i.e. they look like real meals.

The first pass held 99 back. Each category was then resolved on judgement rather than
left hanging:

- **83 implausible amounts → corrected at source** (`corrections.ts`). Every one was the
  same defect: bread and tortilla wraps given a 150–250 g "cooked weight" — four to six
  slices, or three to four wraps. Bread also isn't a "cooked weight"; that suffix was
  generator boilerplate. Rewritten to ordinary servings — **bread 80 g (2 slices), wrap
  60 g (1 wrap)** — as 24 `UPDATE public.ingredients` statements covering 114 lines, so
  the list the user reads and the macros shown now agree.
- **11 low-confidence → reviewed and accepted.** Variable-composition sauces (chimichurri,
  tikka, dukkah). Computed values all landed in a sane range, so they apply. They're
  still annotated in the table and listed at the foot of the migration.
- **5 duplicate names → disambiguated.** The pairs differ in their existing calorie
  value, so those rows key on `name AND calories = <old>` instead of name alone. The
  emitter now also **refuses to run** if any row's new value would collide with a
  sibling's key — that would have let the second UPDATE silently clobber the first.

**The decisive finding — grain weights are COOKED, not dry.** Seeded amounts for rice,
pasta, couscous, bulgur and soba run 40–250 g with a **median of 150–160 g**. 150 g of dry
rice is 534 kcal, impossible inside a ~400 kcal meal; 150 g cooked is ~195 kcal. Reading
them as dry inflated everything by a median of **+48%**; correcting it brought the median
to +7%. Independently confirmed afterwards — some ingredient lines say "(cooked weight)"
outright.

**Four real bugs caught by building this, all fixed:**
1. `"160g tinned tuna in olive oil"` resolved to **olive oil** (884 kcal/100 g) and priced
   that single line at 1,414 kcal — longest-key-anywhere matching ignored which noun was
   the head. Now: exact-match first, then earliest-position.
2. Silken tofu was priced as firm — 144 vs ~55 kcal/100 g.
3. A `??`-precedence bug (`n * undefined ?? fallback` → `NaN`) silently poisoned totals.
   `recompute.ts` now hard-fails on any non-finite result rather than emitting it.
4. **3 recipe names are shared by 2 genuinely different recipes.** The UPDATE keys on
   name, so applying either would have silently overwritten the other. All 5 held back.

**The 99 held for review, and why each is held:**
- **83 — implausible source amount.** Real defects in the recipe data, not our maths: the
  generator applied one 40–250 g scale to every carb component regardless of food, giving
  lines like `"250g wholewheat tortilla wrap (cooked weight)"` — about four wraps.
  Recomputing from those would launder a bad ingredient into a precise-looking number.
  **These need the ingredient fixed, then a re-run.**
- **11 — low-confidence food** (chimichurri, tikka sauce, dukkah — oil content varies too
  much to pin down).
- **5 — duplicate recipe name** (see bug 4).

**`servings` — done.** `20260729130000_recipes_add_servings.sql` adds the column
(`NOT NULL DEFAULT 1`, `CHECK (servings > 0)`) with a comment recording that the macros
are per serving. Every seeded recipe is single-serving — ingredient amounts are per
person — so the backfill is 1. Browse Meals now shows "Per serving · ingredients below
make 1 serving" under the macro chips, so nothing is left ambiguous about what the
number covers.

**Migrations to apply, in order:**
1. `20260729130000_recipes_add_servings.sql`
2. `20260729140000_recompute_recipe_macros.sql` — 24 ingredient corrections, then 957
   macro updates

### USDA FoodData Central reconciliation — DONE 2026-07-29

`scripts/recipe-nutrition/fdc-reconcile.ts` checks every entry against FDC's
**Foundation and SR Legacy** data (lab-analysed reference foods; "Branded" is
manufacturer-submitted and would make the check worse than no check). Responses cache to
`fdc-cache.json`, so re-runs are free. Full output: `fdc-comparison.csv`.

```
FDC_API_KEY=<key> npx tsx scripts/recipe-nutrition/fdc-reconcile.ts
```

**Result across 267 foods looked up:**

| | |
|---|---|
| within ±10% (agree) | **139** |
| ±10–25% (minor) | 17 |
| over ±25% unexplained | **0** |
| excluded — FDC search can't match | 74 (each checked by hand, reason recorded in `FDC_SKIP`) |

**The highest-usage foods all agreed**, most of them exactly: cumin, olive oil (884 vs
884), garlic, tahini, avocado, egg whites (52 vs 52), baby spinach, cheddar, feta, mixed
nuts, cherry tomatoes, smoked paprika, lime, chia seeds. That's the bulk of the ingredient
volume independently confirmed.

**13 entries corrected** to USDA values, and the macros regenerated from them: `kale`
49→35, `butter beans` 110→79, `wholewheat pasta` 124→159, `olives` 145→81, `turkey breast`
135→114, `haddock fillet` 90→74, `king prawns`/`shrimp` 99→85, `tuna steak` 132→109,
`cottage cheese` 98→84, `mixed peppers` 31→26, `tenderstem broccoli` 35→31, plus
`smoked haddock`. Each carries a `note` naming its USDA match.

**The 74 exclusions are the important caveat.** FDC's search is keyword-based and returns
confident nonsense for compound and UK-specific terms — `lamb leg` → *Frog legs, raw*,
`bacon` → *Abiyuch* (a fruit), `quorn pieces` → *REESE'S PIECES Candy*, `mint` →
*AFTER EIGHT Mints*, `beef mince` → **ground turkey**, `dijon mustard` → *mustard oil*.
Taking the raw deltas at face value would have corrupted the table badly. Every exclusion
names the food and the reason, so the list is auditable rather than a silent skip. Three
genuine categories: composite generator lines, UK products whose US analogue differs
(double cream is 48% fat vs USDA heavy whipping at 36%), and outright search failures.

Post-reconciliation the recompute shifts slightly: median calorie change vs the original
LLM figures is now **+4%** (was +7%), with **517** recipes inside ±10%.

**Remaining limitation:** the 74 excluded foods are still hand-authored and unverified
against any external source. They're mostly low-frequency or genuinely absent from FDC
(mycoprotein, UK retail products). Verifying them would need a UK reference —
McCance & Widdowson — which is licensed rather than open.

Two smaller assumptions baked in, both documented at their definition and both easy to
change and regenerate:
- Unquantified seasoning lines use conservative default portions (`portions.ts`) —
  ~2.1 ingredients per recipe rely on an assumed amount.
- Grain/pasta/oat weights are read as cooked (see above).

---

#### Earlier revision — the backfill is ~5 decisions, not 678

An earlier pass here called this "678 quantities of content work". That overstated it badly.
Classifying the gaps changes the job completely:

| | |
|---|---|
| Unquantified lines | 678 |
| — **pure seasoning / near-zero kcal** | **499** (105 distinct strings) |
| — **carry a calorie-bearing component** | **179** (only **30** distinct strings) |
| Top 5 distinct strings cover | **142 of 179 (79%)** |

The gaps are not 678 individual judgement calls. They're a handful of **repeated template
strings** emitted across hundreds of generated recipes:

```
  58×  "soy sauce, ginger and a splash of sesame oil"
  56×  "teriyaki glaze and toasted sesame seeds"
  13×  "tamari (gluten-free soy), ginger and a splash of sesame oil"
   9×  "fresh thyme, cracked black pepper and a splash of double cream"
   6×  "soy sauce"
```

And the 499 seasoning lines ("crushed garlic, chilli flakes and parsley" ×82, "smoky BBQ rub
and black pepper" ×79, "ras el hanout, cinnamon and cumin" ×60 …) are genuinely near-zero
calorie. They're worth amounts for cooking usability, but they are **not** a source of
calorie mismatch.

**Decide an amount for 5 strings → 79% of the calorie-relevant gaps close. Decide 30 → all
of them.** Then regenerate the seed.

**Recommended fix, in order:**
1. **Pin amounts for the top 5 template strings** (e.g. "1 tsp sesame oil", "1 tbsp teriyaki
   glaze + 1 tsp sesame seeds"). Owner or nutrition sign-off, half an hour.
2. **Add a `servings` column** and surface "per serving" in the Browse Meals sheet. Cheap,
   and removes the other whole class of doubt.
3. Work down the remaining 25 calorie-bearing strings.
4. **Only then** is an automated ingredient-vs-macro check worth building. Run against
   incomplete ingredient data it produces noise, not findings — as the attempt below shows.

#### Can the amounts be sourced from somewhere external? No — and it wouldn't help

- **These recipes exist nowhere else.** 660 were parsed from the owner's own four `.docx`
  files by `scripts/import_owner_meals.ts`; the rest are procedurally generated by
  `scripts/gen_lean_dense_pack.ts`, `gen_veg_df_keto_pack.ts` and
  `gen_lean_protein_plant_pack.ts`. Names like "Peri-peri Egg Whites with Sweet Potato &
  Mixed Peppers" are template output, not a dish with a canonical published version.
  Scraping a recipe site returns a *different* recipe's amounts, which makes the mismatch
  worse, not better — on top of the ToS/copyright problem with bulk scraping.
- **We did not lose the amounts in import.** `import_owner_meals.ts` pushes each ingredient
  line verbatim (`if (line) ingredients.push(line)`) — no quantity stripping. What's in the
  database is what the source documents say.
- **Worth one ask:** the four `.docx` files are not in the repo. If the owner has since added
  amounts to them, re-running `import_owner_meals.ts` picks them up for free. Ask Casey
  whether the source documents have been updated before doing any manual work.
- **What external sources *are* legitimately useful:** per-100g *nutrition values*, for
  verification — not quantities. **USDA FoodData Central** (public domain, free API) or
  **Open Food Facts** (ODbL, better UK coverage). Those belong in step 4 above.

#### Why the ingredient-vs-calorie estimate was inconclusive

An offline estimate (small reference table of ~90 common foods) gave a median ratio of
**1.05x** estimated-to-stated across 563 scoreable recipes — i.e. broadly right — but with a
long tail (p90 = 2.07x). That tail is **not** evidence of bad data: it's driven by the
unquantified ingredients above, where the estimator had to assume a 100g portion. 100g of dry
rolled oats is 389 kcal against a realistic 40g serving.

Two false leads found and discarded during that work, recorded so nobody re-runs them:
- An early version flagged a large "Butter Beans" cluster as wildly over-calorie. That was a
  substring-match bug — `"butter beans"` matching dairy `butter` at 717 kcal/100g vs the
  correct ~110. Not a data problem.
- An earlier parser reported 5 recipes with no ingredients. It was missing the second
  `INSERT INTO ingredients … VALUES ((SELECT id …), 'item', n)` form used by some seed files.
  The ingredients are present.

### Internal macro consistency (still valid, run 2026-07-29)

Checked the one thing verifiable without a food-composition database: does each recipe's
stated calorie figure agree with **its own** macros (`4·protein + 4·carbs + 9·fat`)?

- **957 seeded recipes**, every one with a complete kcal + P/C/F set.
- **87.0% within ±5%** — internally consistent.
- **12.5% at ±5–10%** — rounding-level, not worth chasing.
- **3 at ±10–20%**, **1 over ±20%**. That's **4 recipes** meaningfully wrong, ~0.4%:
  - `Egg White & Turkey Omelette` — 440 kcal stated vs 350 derived (−20%)
  - `Chicken Thigh & Veggie Stir-Fry` — 640 vs 547 (−15%)
  - `Zucchini Noodles & Turkey Bolognese` — 350 vs 308 (−12%)
  - `Miso Soup with Edamame & Tofu` — 160 vs 141 (−12%)

**Conclusion: the recipe data is broadly sound.** Four hand-fixes, not an agent pipeline.

**Important limit on that audit:** it only proves each recipe agrees with *itself*. It does
**not** check the macros against the ingredient list — "200g sirloin steak + 1 sweet potato"
really summing to 720 kcal needs USDA FoodData Central or equivalent. A recipe can be
internally consistent and still not match its ingredients, so the original report may still
be valid in a way this audit cannot see. That's the check the expert-agent idea would cover,
and it's still the open question.

---

### What was fixed in `MealDetail.tsx` (the `meals` table page)

`MealDetail.tsx` was an unconverted design mock. **The ingredient list was a hardcoded
`<ul>` of ribeye steak and avocado salsa, rendered identically for every single recipe.**
The calories and macros beside it were real values from the database.

So the report is exactly right, and the explanation is simpler than a data-quality problem:
the ingredients weren't the recipe's ingredients. They belonged to a different dish. The
nutrition figures may well have been correct all along.

The same page also shipped, for every meal: a hardcoded steak description, three mock
cooking instructions, five mock benefits, a mock 87.2 "nutrition score", a fake gallery of
five copies of one stock photo, hardcoded "30-45" prep minutes, fallback tags
(`Avocado, Steak, Diet, Gluten Free, Keto`), and two fake "You might also like" cards for a
"Mushroom Rice Bowl Deluxe" that doesn't exist. `meals.ingredients` and `meals.instructions`
were in the query result the whole time and simply never rendered.

**What shipped** — `MealDetail.tsx` rewritten against real data:
- Ingredients and instructions render from the `meals` JSONB columns, with honest empty
  states when a recipe has none.
- Every fabricated fallback removed. Missing values show `—`, and a meal with no macros at
  all says "Nutrition data unavailable for this recipe" rather than inventing 648 kcal.
- Mock benefits / gallery / nutrition score / related-meals sections deleted outright.
- `handleAddMeal` used to toast "Meal added to your log!" **without writing anything**. It
  now routes to `/log-meal` with the real macros prefilled, matching `MealDetailSheet`.
- Dropped the page-level `ScrollArea` per the `CLAUDE.md` rule.

**Worth checking:** whether other pages built from the same design pass have similar
unconverted mock blocks. This one was only found because a user noticed the mismatch.

### Still outstanding — the expert-agent verification

The verification pass described below is **not** built. It's still worth doing, but it is
now a smaller problem than it looked: the headline symptom was a UI bug, not bad data. Do a
data-quality audit before investing in the agent, to find out how much is actually wrong.

---

### Original analysis

**Two concrete defects originally spotted in `src/pages/MealDetail.tsx`** (both fixed above):

- **Line 181:** `{meal.calories || 648}` — when a meal has no calorie value, the UI displays
  a **hardcoded 648 kcal** as though it were real data. This alone would produce exactly the
  reported symptom: a plausible-looking number with no relationship to the ingredients.
  Fix first — it's a one-line change and it may account for most of the reports.
- **Line 103:** `const nutritionScore = 87.2; // Mock score` — a mock value rendered as a
  real "nutrition score" for every meal. Either compute it or remove the UI.

**Then the underlying problem:** meals come from two sources with different fidelity —
owner-supplied recipes in `recipes`/`meals`, and Spoonacular (secondary, free tier, likely to
be retired per `HANDOFF.md`). Nothing currently recomputes macros from the ingredient list, so
any bad or partial import surfaces unchallenged.

**On the "expert agent to verify" idea:** worth doing, but it must be an **offline batch
audit that flags discrepancies for human review** — not a live LLM call that rewrites numbers
at render time. Nutrition data is health-adjacent; an LLM confidently producing a wrong
calorie count is worse than showing none. Proposed shape:

1. Batch job walks every recipe, recomputes macros from the ingredient list against a
   food-composition database (USDA FoodData Central is free and authoritative).
2. Rows where computed vs stored differ by more than a threshold get flagged.
3. Flagged rows land in an admin review queue — a human accepts or corrects.
4. Meals with no verified macros show "nutrition data unavailable", **never a fallback number.**

**Note:** if you paginate over the recipe tables for this, the `drainTable()` 1,000-row
pagination rule in `CLAUDE.md` applies — there are ~885 owner recipes and PostgREST silently
truncates at 1,000.

**Action needed:** owner sign-off on step 4 (showing "unavailable" instead of a number) and
on whether an admin review queue is worth building vs just fixing the data once.
