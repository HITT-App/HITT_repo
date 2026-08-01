# Sentry handover — steps for Casey

> ✅ **COMPLETED 2026-08-01.** Kept for reference / as a template for the remaining
> Supabase and GitHub transfers. Org `hiit-fitness`, project `hitt-fitness`, EU region,
> project ID `4511303494795344` preserved so error history survived the move.

Sentry is the crash / error monitoring behind HIIT Fitness. It currently sits in Vanessa's
Sentry account and needs to move to Casey's, like the App Store, PostHog and Spoonacular
accounts already have.

**This is the last piece that needs an app rebuild**, so it has to be done *before* the next
iOS build rather than after — otherwise it waits for the build after that.

---

## Before you start — pick the EU region

**This matters and cannot be undone.** Sentry asks you to choose a data region when you
create the account. The existing HIIT project lives in the **EU** region
(`de.sentry.io`).

- Choose **Europe (EU)**.
- A project **cannot be transferred between regions.** If the new org is created in the US,
  the transfer option simply won't be available and we'd have to start a fresh project and
  lose the existing error history.

---

## Step 1 — Create the account and organisation

1. Go to **https://sentry.io/signup/**
2. Sign up with the address you want to own this long-term
   (the same `caseysonnekus1@gmail.com` used for Spoonacular and PostHog keeps things tidy)
3. When asked for a **data region**, choose **Europe (EU)** — see the warning above
4. Organisation name: **HIIT Fitness** (or **HIIT**)
5. The free Developer plan is fine — it covers the volume HIIT generates

---

## Step 2 — Choose one of two routes

### Route A — Transfer the existing project (recommended)

Keeps all the error history and grouping. Vanessa does the transfer; you just need to
confirm your organisation slug first.

1. Casey: go to **Settings → General Settings** and note the **Organization Slug**
   (the short name in the URL, e.g. `hiit-fitness`)
2. Send that slug to Vanessa
3. Vanessa: **Settings → Projects → hiit → Project Settings → General → Transfer Project**,
   entering Casey's email
4. Casey: accept the emailed transfer request

> Transfer exists because Sentry's free plan can't add members to an org — inviting Casey
> isn't an option, so the project itself has to move.

### Route B — Create a fresh project

Simpler, but **the existing error history stays behind in Vanessa's account.** Only do this
if Route A fails (usually a region mismatch).

1. **Projects → Create Project**
2. Platform: **React**
3. Alert frequency: default is fine
4. Project name: **hiit**

---

## Step 3 — Send these four things back

Whichever route was used, we need all four to complete the switch:

| # | What | Where to find it |
|---|---|---|
| 1 | **DSN** | Settings → Projects → hiit → **Client Keys (DSN)**. Starts `https://…@…ingest.de.sentry.io/…` |
| 2 | **Organization slug** | Settings → General Settings → Organization Slug |
| 3 | **Project slug** | Usually `hiit` — shown in the project URL |
| 4 | **Auth token** | See below |

### Creating the auth token

This is what lets the daily owner email pull the top errors. It is **not** the DSN.

1. **Settings → Auth Tokens** (organisation level), or under your user settings if the org
   option isn't shown
2. **Create New Token**
3. Name it something like `hiit-analytics-digest`
4. Tick these scopes and nothing more:
   - `org:read`
   - `project:read`
   - `event:read`
5. Copy the token **immediately** — Sentry shows it once and never again

---

## Security note

The **DSN is not secret** — it ships inside the app and is safe to email.

The **auth token is a credential.** Don't put it in an email or a chat message that gets
forwarded around. Send it separately, and if it's ever exposed, revoke it in
Settings → Auth Tokens and issue a new one.

---

## What happens next (Vanessa's side — no action needed from Casey)

1. `VITE_SENTRY_DSN` swapped in `.env` — **this is the bit that needs an app rebuild**,
   because the DSN is compiled into the JavaScript bundle
2. `SENTRY_HOST`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` updated as Supabase
   edge-function secrets and the analytics digest redeployed — no rebuild for those
3. A test error fired to confirm it lands in the new project
4. Vanessa removes herself from the old project

Until step 1 ships in a build, errors from the installed app keep going to the old project —
so there's no monitoring gap, but nothing new appears in Casey's until users update.
