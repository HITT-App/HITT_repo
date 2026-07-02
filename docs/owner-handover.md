# Owner Handover Guide

Everything a non-technical owner needs to keep HIIT running, understand what
it depends on, manage users, and (when needed) migrate every account away
from the current developer's control into your own.

Written 2026-07-02. Cross-references: `admin-guide.md` (how to use the
in-app admin dashboard) and `architecture-plan.md` (what's built and why).

---

## 1. The 60-second summary

HIIT is a Capacitor / React iOS app with a Supabase backend, an Apple Watch
companion, and a Garmin Connect IQ companion. It relies on ~10 third-party
services. Every one of those services is a login someone has to own, and
each has an API key that goes into either the app or the Supabase Edge
Functions "Secrets" page. If the developer changes, **every one of these
logins needs its ownership migrated** and every API key needs to be
regenerated.

The section headings below tell you exactly what to do in order.

---

## 2. Accounts HIIT depends on

Every service in this table has a login somewhere. The **"Who owns it"**
column tells you whose credentials are currently on file — anything marked
_shamalama_ or _dev_ is currently controlled by the developer and needs to
be transferred to you if they hand over the project.

| Service | Purpose | Who owns it | Cost tier | Where the key lives |
|---|---|---|---|---|
| **Supabase** (project `pbrqdlkjoxvglcdlixbi`) | Database, auth, file storage, edge functions | shamalama | Free tier for now; will grow with users | Login-only; keys are auto-generated per project |
| **Apple Developer** (App Store Connect, TestFlight) | Publishing to iPhone | shamalama | $99/year | Sign in with Apple ID; API key for automation lives in Xcode/Keychain |
| **Garmin Connect IQ Developer** | Publishing the HITT watch app | shamalama | Free | Login-only |
| **ElevenLabs** | AI voice for the Jarvis coach | shamalama | Paid tier (usage-based) | Supabase → Edge Functions → Secrets → `ELEVENLABS_API_KEY` |
| **AI provider** (OpenRouter / Anthropic / Gemini) | The brain behind Jarvis and workout plans | shamalama | Usage-based | Supabase → Secrets → `AI_API_KEY` and `AI_GATEWAY_URL` |
| **Sentry** | Crash and error monitoring | shamalama | Free tier | `.env` → `VITE_SENTRY_DSN`; login at sentry.io |
| **PostHog** | Analytics (funnel, retention, feature usage) | shamalama | Free tier | `.env` → `VITE_POSTHOG_KEY`; login at posthog.com |
| **Spoonacular** (currently OFF) | Fallback recipe API when owner meal library doesn't have a match | shamalama | Free tier (150/day) | Supabase → Secrets → `SPOONACULAR_API_KEY`. Currently disabled via `MEAL_SOURCE_SPOONACULAR_ENABLED` |
| **Google Cloud** (Sign In With Google) | Lets users sign in with a Google account | shamalama | Free | `.env` → `VITE_GOOGLE_WEB_CLIENT_ID`; login at console.cloud.google.com |
| **GitHub** (`HITT-App/HITT_repo`) | The source code lives here | shamalama | Free | GitHub login; deploy keys live in developer's Mac |
| **Apple Push Notifications (APNS)** | Sending push notifications to iPhones | shamalama (via Apple Developer) | Included with Apple Dev membership | Supabase → Secrets → `APNS_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` |

There's also `LOVABLE_API_KEY` in Supabase secrets left over from when
this project was scaffolded by Lovable.dev — it's not used by any active
code and can be deleted.

---

## 3. Migrating ownership away from the developer

Do these in order. Steps 1-3 are the critical path (without them, the
next dev / owner can't do anything). Steps 4-6 unlock the rest.

### Step 1 — Create the master ownership account

Pick an email address you (the business owner) will control forever.
Recommended: `owner@yourbusiness.com` or `founders@yourbusiness.com`.
**Never** a personal Gmail — you may sell the business, hand this off,
etc. This becomes the master account for every service below.

### Step 2 — Transfer Supabase

Supabase is the single most important account. If you lose access to
this, you lose the database.

1. Ask the current developer to invite `owner@yourbusiness.com` as an
   **Organisation Owner** to the Supabase org (Supabase dashboard →
   Organisation Settings → Team → Invite).
2. Sign in as owner and accept the invitation.
3. Once you have Owner-level access, remove the previous developer OR
   downgrade them to a member. Do NOT do this until you've confirmed
   your access works and you can regenerate secrets.
4. Rotate the `SUPABASE_SERVICE_ROLE_KEY` (Supabase dashboard → Project
   Settings → API → Regenerate). The developer's local machine had this
   key — regenerating locks them out of the production DB.

### Step 3 — Transfer Apple Developer

1. Sign in to appleid.apple.com and enrol as an organisation (or use
   your existing Apple ID if you're a sole trader).
2. Ask the current developer to invite `owner@yourbusiness.com` to
   App Store Connect as an **Admin**.
3. Once admin, generate a new App Store Connect API Key (Users and
   Access → Keys) and rotate the key that lives in the developer's
   `~/bin/deploy-ios.sh` on their Mac.
4. To fully take over: you'll need to move the HIIT app to a new Team
   ID (Apple Developer → Membership → Transfer App). This requires
   both parties to agree in App Store Connect and can take Apple 1-2
   weeks to process.

### Step 4 — Transfer Garmin Connect IQ

1. Sign in to apps.garmin.com/developer.
2. Under the HITT app listing, add `owner@yourbusiness.com` as an
   additional owner.
3. Verify you can log in and upload a new `.iq` build.
4. Ask developer to remove themselves.

### Step 5 — Rotate every API key on the list

For every row in the table in Section 2, log in to that service (Sentry,
PostHog, ElevenLabs, AI provider, Google Cloud, Spoonacular, GitHub) and
**generate a new API key**. Then paste each new key into either:

- **Supabase secrets** (Supabase dashboard → Edge Functions → Secrets →
  edit the existing row) for anything in the `Supabase → Secrets` column
- **`.env` on the developer's machine** for anything in the `.env` column
  — the new developer or you replaces the value locally, then rebuilds

**Why cycle the keys?** Because the developer's local machine still has
the old values in their `.env` file, and their Supabase login (until
step 2 completes) still has access to view the old secrets. Cycling
guarantees they cannot access production even if they retain a copy.

### Step 6 — Move Sentry / PostHog / ElevenLabs / GitHub logins

Each of these has a "Transfer ownership" flow in their dashboard's
Organisation Settings. Same pattern as Supabase:

1. Invite `owner@yourbusiness.com` as Owner.
2. Confirm the invite from your side.
3. Remove the previous developer.

### Step 7 — GitHub repo transfer

Currently at `github.com/HITT-App/HITT_repo`. Ask developer to transfer
ownership of the `HITT-App` GitHub organisation to your account:
GitHub → Organisation Settings → General → **Transfer Ownership**. Or
have them transfer just the repo to a new organisation you own.

**Only do this AFTER a new developer is set up.** If you transfer while
no developer has access, you'll have code but no one who can build it.

---

## 4. Managing users in Supabase

**Good news: there's a built-in admin dashboard.** See `admin-guide.md`
for the walkthrough. Short version:

- Go to `/admin/users` in the HIIT app (only visible if you have the
  `admin` role — see `admin-guide.md` for granting yourself that role).
- The Users page lets you: search users, view their activity, promote to
  admin, and delete accounts.

**For anything the dashboard doesn't do** (which is rare), go to the
Supabase dashboard directly:

1. supabase.com → your project → **Authentication → Users**
2. Search by email
3. Click a user to see their identity, sessions, and metadata
4. Delete or reset from that panel

**To reset a user's password:** Supabase → Authentication → Users → click
the user → "Send password recovery email".

**To manually verify a user's email:** Supabase → Authentication → Users
→ click user → set `email_confirmed_at` to now.

**To make someone else an admin:** either use the in-app `/admin/users`
page (recommended), or run this SQL in Supabase → SQL Editor:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ((SELECT id FROM auth.users WHERE email = 'their@email.com'), 'admin');
```

---

## 5. Common maintenance tasks

### Adding an admin
See `admin-guide.md` and the SQL snippet above.

### Refunding / deleting a user
In-app: `/admin/users` → find user → Delete button. This soft-deletes and
purges after 30 days (Apple compliance).

### Reviewing crashes
Log into Sentry (`sentry.io`) → HIIT project. Errors appear here within
minutes. Set up email alerts under Alerts → Rules if you want to be
notified.

### Reviewing analytics
Log into PostHog → HIIT project. Funnels, retention, feature usage.

### Deploying a new app version (if a developer is with you)
The developer runs `~/bin/deploy-ios.sh hitt` (or asks the Jeffrey
release agent to do it). This builds, uploads to TestFlight, and the
build appears in your Apple developer account within 10 minutes.

### Approving a new TestFlight tester
App Store Connect → TestFlight → find your build → add the tester's
email under Internal or External Testing.

### Content — adding new workouts or recipes
`/admin/workouts` and `/admin/meals` inside the HIIT app. You do NOT
need SQL or a developer for this — the admin UI handles it.

---

## 6. Costs and billing

Rough monthly costs to expect at 1,000 active users:

- **Supabase Pro**: $25/mo (Free tier covers up to ~500 active users)
- **ElevenLabs**: $22-$99/mo depending on voice usage. Currently on a
  paid tier — check the current bill in ElevenLabs dashboard.
- **AI provider** (OpenRouter or Anthropic): highly variable, ballpark
  $50-$200/mo for 1,000 users depending on how much Jarvis coaching
  they use.
- **Apple Developer**: $99/year, fixed.
- **Sentry / PostHog / Spoonacular / Google Cloud**: all free tier for
  now, will need paid plans somewhere between 5-20k users.

**Total per-month expected at 1,000 users: ~$100-$300 recurring.**

Move billing accounts to your own credit card as part of the ownership
migration (each service has a "Billing" section in dashboard).

---

## 7. Emergency contacts

Things worth knowing when something breaks:

- **Supabase support**: Dashboard → Support (paid tier gets email support
  within 24h; free tier is community forum)
- **Apple Developer**: developer.apple.com/contact — response 1-3 days
- **Garmin CIQ**: apps.garmin.com/developer/support — response 1-5 days
- **ElevenLabs**: help.elevenlabs.io — response 1-3 days

For urgent issues (app is down, users can't sign in):

1. Check Supabase status page: `status.supabase.com`
2. Check Sentry dashboard for a recent crash spike
3. Roll back to the previous deploy — Supabase has automatic rollback for
   edge functions; Apple requires re-uploading a prior build number

---

## 8. Things a non-technical owner should NEVER touch without a developer

- **Database migrations** — the SQL files in `supabase/migrations/`.
  Editing or manually running these can corrupt data.
- **Environment variables** — the `.env` file. Even one typo breaks
  every build.
- **The `main` git branch** — direct pushes to main bypass all tests.
- **Xcode project settings** — Build numbers, signing, provisioning
  profiles.

If you need any of these changed and don't have a developer available,
better to wait for one than experiment.

---

## 9. What you'll be handed on developer transition

You should insist on receiving all of the following before the current
developer stops working:

- [ ] Ownership of the Supabase organisation (Section 3, Step 2)
- [ ] Admin access on App Store Connect + membership transfer initiated
      (Step 3)
- [ ] Ownership access on Garmin Connect IQ (Step 4)
- [ ] Owner-level access on Sentry, PostHog, ElevenLabs, AI provider,
      Google Cloud, GitHub org (Step 6, 7)
- [ ] A copy of `.env` values for the new developer to install locally
      (send via password manager or 1Password — not email)
- [ ] The `~/hitt-connect-iq-developer.key` file (Garmin signing key —
      without this, no one can upload new watch app versions)
- [ ] The Apple Distribution Certificate + Provisioning Profiles (Xcode
      Preferences → Accounts → Download Manual Profiles OR fresh ones
      generated from App Store Connect)
- [ ] Access to the shared `.claude/settings.local.json` (contains
      TEST_EMAIL / TEST_PASSWORD for the QA account)

Once all of this is in a password manager under your ownership, the
transition is complete.
