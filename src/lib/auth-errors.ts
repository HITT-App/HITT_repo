export type AuthFailure = Error & { status?: number; code?: string };

// Every sign-in failure used to render as "Incorrect email or password", including ones that
// had nothing to do with the credentials. On 2026-08-14 the Supabase project went over its
// storage quota and returned 402 on every endpoint; a Google Play reviewer read that as bad
// credentials and rejected the app, which cost us the listing. Never report a backend or
// network fault as a credential fault.
export const describeSignInError = (error: AuthFailure): string => {
  const status = error.status ?? 0;
  const code = error.code ?? "";
  const message = error.message?.toLowerCase() ?? "";

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return "Please confirm your email address before signing in. Check your inbox.";
  }
  if (status === 429 || code === "over_request_rate_limit" || message.includes("rate limit")) {
    return "Too many sign-in attempts. Please wait a minute and try again.";
  }
  // status 0 = the request never completed (offline, DNS, TLS). 402 = project over quota.
  if (status === 0 || status === 402 || status >= 500) {
    return `Can't reach HIIT right now, so we couldn't check your details. This isn't your password — please try again shortly. (${status || "network"})`;
  }
  if (code === "invalid_credentials" || status === 400) {
    return "Incorrect email or password.";
  }
  return `Sign-in failed: ${error.message}`;
};
