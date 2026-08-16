// Guards the sign-in error mapping. A Google Play reviewer was shown "Incorrect email or
// password" while the Supabase project was returning 402 (over storage quota), rejected the
// app on bad credentials, and the listing was suspended. A backend or network fault must
// never be reported as a credential fault.
import { describeSignInError } from "../src/lib/auth-errors";

type Case = {
  name: string;
  error: Error & { status?: number; code?: string };
  expect: (message: string) => boolean;
};

const credential = (m: string) => m === "Incorrect email or password.";
const notCredential = (m: string) => !/incorrect email or password/i.test(m);

const err = (message: string, status?: number, code?: string) =>
  Object.assign(new Error(message), { status, code });

const cases: Case[] = [
  {
    name: "402 over-quota is not reported as a credential problem",
    error: err("Payment Required", 402),
    expect: (m) => notCredential(m) && m.includes("isn't your password"),
  },
  {
    name: "network failure (status 0) is not reported as a credential problem",
    error: err("Failed to fetch", 0),
    expect: (m) => notCredential(m) && m.includes("network"),
  },
  {
    name: "500 backend fault is not reported as a credential problem",
    error: err("Internal Server Error", 500),
    expect: notCredential,
  },
  {
    name: "503 backend fault is not reported as a credential problem",
    error: err("Service Unavailable", 503),
    expect: notCredential,
  },
  {
    name: "429 rate limit asks the user to wait",
    error: err("Request rate limit reached", 429, "over_request_rate_limit"),
    expect: (m) => notCredential(m) && /wait/i.test(m),
  },
  {
    name: "unconfirmed email keeps its own message",
    error: err("Email not confirmed", 400, "email_not_confirmed"),
    expect: (m) => /confirm your email/i.test(m),
  },
  {
    name: "genuinely wrong password still says so",
    error: err("Invalid login credentials", 400, "invalid_credentials"),
    expect: credential,
  },
  {
    name: "bare 400 with no code still says so",
    error: err("Invalid login credentials", 400),
    expect: credential,
  },
];

let failed = 0;
for (const c of cases) {
  const message = describeSignInError(c.error);
  const ok = c.expect(message);
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}\n      → "${message}"`);
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
if (failed > 0) process.exit(1);
