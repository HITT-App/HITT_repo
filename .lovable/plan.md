
# Google Fit Step Sync Integration

## What was built
Google Fit integration to automatically sync step data from the user's phone into the app.

### Architecture
1. **`google_fit_connections` table** — stores OAuth tokens per user (with RLS)
2. **`google-fit-auth` edge function** — handles OAuth code exchange, token storage, connection status, and disconnect
3. **`google-fit-sync` edge function** — fetches today's steps from Google Fit REST API, refreshes tokens automatically, upserts into `health_metrics`
4. **`useGoogleFit` hook** — frontend hook managing OAuth flow, sync, and connection state
5. **Steps page** — shows Google Fit connection card with connect/sync/disconnect buttons

### Flow
1. User taps "Connect Google Fit" → redirected to Google OAuth consent
2. Google redirects back to `/steps?code=...` → edge function exchanges code for tokens
3. Tokens stored in `google_fit_connections` table
4. "Sync Now" button fetches today's steps via Google Fit REST API
5. Steps saved to `health_metrics` with `notes = "google_fit_sync"` to distinguish from manual entries
6. Token refresh handled automatically when expired

### Google Cloud Setup Required
- Enable Fitness API
- Create OAuth 2.0 Web Client credentials
- Add redirect URIs: `https://wgfxtech.lovable.app/steps` and preview URL
- Secrets stored: `GOOGLE_FIT_CLIENT_ID`, `GOOGLE_FIT_CLIENT_SECRET`
