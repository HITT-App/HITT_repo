# HITT App — Owner Handoff Checklist

This document tracks everything that needs to be transferred or set up by the owner before Vanessa hands over the project. Update as items are completed.

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
| `VITE_SENTRY_DSN` | Vanessa's Sentry | Replace after Sentry account transfer above |
| `VITE_POSTHOG_KEY` | Vanessa's PostHog | Replace after PostHog account transfer above |

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
4. Owner creates Google Cloud project + Gemini key (Vanessa updates Supabase secret)
5. GitHub repo transferred to owner's account
6. Owner confirms they have the `.env` values stored securely
7. Vanessa removes herself from Supabase team
8. Done ✅

---

*Last updated: 2026-04-29*
