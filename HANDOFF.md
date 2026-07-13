# HITT App — Owner Handoff Checklist

This document tracks everything that needs to be transferred or set up by the owner before Vanessa hands over the project. Update as items are completed.

## Transfer progress (updated 2026-07-13)

The **Apple side transferred to Casey's account** (team `5933246NY5`) on 2026-07-11 — App Store app, Apple Developer, TestFlight, and the live 1.0.2 build are all his. Working through the remaining accounts one by one:

- ✅ **Apple Developer / App Store Connect** — transferred (2026-07-11).
- ✅ **APNs push key** — new key under Casey's team, secrets swapped + verified (2026-07-13). See table below.
- ✅ **ElevenLabs** — Casey's Google account, ownership transferred (2026-07-13).
- ✅ **Spoonacular** — Casey's account (`caseysonnekus1@gmail.com`), free tier; key swapped + verified (2026-07-13). Secondary meal source, likely to be retired.
- 🔄 **Google Cloud `hiit-fitness-494906`** (Gemini + Google Sign-In + Firebase/FCM) — Casey added as **Owner**; **pending his billing account** + a fresh Gemini API key (then swap `AI_API_KEY`), then Vanessa steps off. **Do not detach Vanessa's billing until Casey's is linked** or AI features go down. Recommendation: transfer this project rather than recreate it — the Google Sign-In iOS client ID is hardcoded in the app, so a new project would force an app rebuild.
- ⬜ **Supabase, GitHub, PostHog, Sentry, Gmail SMTP** — still to do.

---

## Accounts to Transfer

These are currently under Vanessa's personal accounts. The owner needs their own account for each, then the key/DSN gets swapped in the codebase.

| Service | What to do | Effort | Status |
|---|---|---|---|
| **Supabase** | Settings → Team → Invite owner as Owner role. Owner accepts, Vanessa removes herself. All data, secrets, and edge functions transfer automatically. | 5 min | ⬜ Pending |
| **Sentry** | Owner creates account at sentry.io → new React project → copies DSN → Vanessa updates `VITE_SENTRY_DSN` in `.env` and redeploys | 10 min | ⬜ Pending |
| **PostHog** | Owner creates account at posthog.com → new project → copies `phc_` key → Vanessa updates `VITE_POSTHOG_KEY` in `.env` and redeploys | 10 min | ⬜ Pending |
| **GitHub repo** | Repo is at `https://github.com/HITT-App/HITT_repo`. Owner needs to be added as org owner or repo transferred to their GitHub account | 5 min | ⬜ Pending |

---

## Secrets to Swap

These live in Supabase edge function secrets (Settings → Edge Functions → Secrets) and in `.env`. Once Supabase ownership transfers, the owner controls all secrets — but the AI key is tied to a specific Google account and needs replacing.

| Secret | Current owner | What owner needs to do |
|---|---|---|
| `AI_API_KEY` | Vanessa's Google account (Gemini API) | Create Google Cloud project → enable Gemini API → create API key → update Supabase secret |
| `AI_GATEWAY_URL` | Points to Gemini direct endpoint — no account tied, stays the same | Nothing, unless they switch AI provider |
| `ELEVENLABS_API_KEY` | ✅ **Casey's (2026-07-13)** | Account was **signed up with Casey's Google account**; workspace ownership transferred to Casey. The existing `ELEVENLABS_API_KEY` in Supabase stays valid — no swap needed unless Casey chooses to regenerate it under his own login. Used for: "Ok HIIT" wake word, AI coach voice responses, home-screen greeting. |
| `APNS_KEY` + `APNS_KEY_ID` + `APNS_TEAM_ID` | ✅ **Done (2026-07-13)** | New APNs auth key **`S2F735Z4UB`** created under **Casey's team `5933246NY5`** (Sandbox & Production, team-scoped). Supabase secrets `APNS_KEY` / `APNS_KEY_ID` / `APNS_TEAM_ID` swapped and **verified against Apple's production server**. `.p8` stored in `~/.appstoreconnect/private_keys/`. Needed after the app transfer changed the team ID (old key was team-mismatched → push was silently failing). |
| `SPOONACULAR_API_KEY` | ✅ **Casey's (2026-07-13)** | Spoonacular account signed up under **caseysonnekus1@gmail.com** (Casey's Gmail — password NOT stored here; he can reset via his own email). **Free tier, 50 calls/day.** New key swapped into the Supabase secret + verified live. **Secondary source only** — the app prefers the owner recipe DB and gates Spoonacular behind `MEAL_SOURCE_SPOONACULAR_ENABLED`; likely to be retired now the DB is primary, so the free tier is fine. |
| Google OAuth Client ID + Secret | Vanessa's Google Cloud project (`hiit-fitness-oauth`) | Owner creates their own Google Cloud project → OAuth consent screen → Web client → adds Supabase callback URL → pastes new Client ID + Secret into Supabase Auth → Providers → Google |
| `VITE_SENTRY_DSN` | Vanessa's Sentry | Replace after Sentry account transfer above |
| `VITE_POSTHOG_KEY` | Vanessa's PostHog | Replace after PostHog account transfer above |

---

## Supabase Configuration to Preserve

These settings are in the Supabase dashboard and must not be accidentally removed after handoff.

| Setting | Location | Value | Why it matters |
|---|---|---|---|
| OAuth redirect URL | Authentication → URL Configuration → Redirect URLs | `hiitfitness://auth-callback` | Required for Google sign-in on iOS. Remove this and Google sign-in breaks. |
| Google OAuth provider | Authentication → Providers → Google | Client ID + Secret configured | Required for Google sign-in. |
| Edge function secrets | Edge Functions → Secrets | `AI_API_KEY`, `AI_GATEWAY_URL`, `SUPABASE_SERVICE_ROLE_KEY` etc. | Power all AI features. Transfer with Supabase ownership. |

---

## Owner Must Set Up Themselves

These cannot be set up in advance — they are intrinsically tied to the owner's Apple developer account or business.

| Item | Why owner-only | Notes |
|---|---|---|
| **RevenueCat** | Must connect directly to their App Store Connect account. IAP products (subscription tiers) must be created in App Store Connect first, then linked in RevenueCat. | ~half day task. Vanessa can guide on a call. Engineering is ready — just needs the RevenueCat public SDK key to wire up |
| **Apple Developer account** | Already owner's ✅ | Used for TestFlight, App Store submission, push notification certs |
| **App Store Connect** | Already owner's ✅ | HITT app listing already exists |

---

## Files Not in Git (Must Be Shared Securely)

The `.env` file is gitignored and never committed. The owner needs a copy of all current values.

**Send securely (not email) — use 1Password, Bitwarden, or a secure note:**

```
VITE_SENTRY_DSN=            ← replace with owner's own key at handoff
VITE_POSTHOG_KEY=           ← replace with owner's own key at handoff
VITE_POSTHOG_HOST=https://eu.i.posthog.com
VITE_SUPABASE_URL=https://pbrqdlkjoxvglcdlixbi.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM
VITE_SUPABASE_PROJECT_ID=pbrqdlkjoxvglcdlixbi
```

Note: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are safe to share — they are public-facing values. The Supabase service role key (used only in edge functions, never in the frontend) transfers automatically with Supabase ownership.

---

## Handoff Order (Recommended)

Do these in order to avoid breaking the live app mid-transfer:

1. Owner accepts Supabase team invite (data + secrets transfer in one go)
2. Owner sets up RevenueCat and provides SDK key (Vanessa wires it up)
3. Owner creates Sentry + PostHog accounts, provides keys (Vanessa swaps them, redeploys)
4. Owner creates Google Cloud project → OAuth consent screen → Web client → adds Supabase callback URL → pastes Client ID + Secret into Supabase Auth → Providers → Google (replacing Vanessa's)
5. Owner creates Gemini API key → updates Supabase secret `AI_API_KEY`
6. GitHub repo transferred to owner's account
7. Owner confirms they have the `.env` values stored securely
8. Vanessa removes herself from Supabase team
9. Done ✅

---

## Pre-Launch Tasks (before public App Store release)

These are not blocking for TestFlight/investor demo but must be done before public launch.

| Task | Why | Notes |
|---|---|---|
| **Supabase custom domain** | OAuth sign-in currently shows `pbrqdlkjoxvglcdlixbi.supabase.co` for one second during Google sign-in — looks unprofessional at launch | Requires Supabase Pro (~$25/mo). Set up a custom auth domain (e.g. `auth.hiitfitness.app`) in Supabase → Settings → Custom Domains. The `VITE_SUPABASE_URL` in `.env` will need updating too. |
| **Google OAuth under owner's account** | Currently registered under Vanessa's Google account (`Vanessa.latchem@outlook.com`) in Google Cloud project `hiit-fitness-oauth` | Owner creates their own Google Cloud project, sets up OAuth consent screen, creates Web client with the same Supabase callback URL, pastes new Client ID + Secret into Supabase → Auth → Providers → Google. Old credentials can then be deleted. |
| **RevenueCat / IAP** | No real purchases can be made without it | See open item in OWNER_DECISIONS.md |
| **Privacy policy rewrite** | Current policy is a placeholder — not valid for health data under UK GDPR | See open item in OWNER_DECISIONS.md |

---

*Last updated: 2026-04-30*
