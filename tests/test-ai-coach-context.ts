/**
 * Diagnostic: call ai-coach with a context question and print the raw response.
 * Run: TEST_EMAIL=x TEST_PASSWORD=y npx tsx tests/test-ai-coach-context.ts
 */

const SUPABASE_URL = "https://pbrqdlkjoxvglcdlixbi.supabase.co";
const SUPABASE_KEY = "sb_publishable_iS3pm69vimlp67zzAm5ORA_pTi5IfCM";

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;

if (!email || !password) {
  console.error("Set TEST_EMAIL and TEST_PASSWORD");
  process.exit(1);
}

async function signIn(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("Sign-in failed:", JSON.stringify(data));
    process.exit(1);
  }
  return data.access_token;
}

async function callAICoach(token: string, message: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Response-Format": "structured-v1",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
      customMemory: "",
      customResponseStyle: "",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return `HTTP ${res.status}: ${err}`;
  }

  // Read SSE stream
  const text = await res.text();
  let fullText = "";
  const actions: object[] = [];

  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const chunk = JSON.parse(line.slice(6));
      if (chunk.type === "text") fullText += chunk.delta;
      if (chunk.type === "action") actions.push(chunk.action);
    } catch {}
  }

  return `TEXT:\n${fullText}\n\nACTIONS: ${JSON.stringify(actions, null, 2)}`;
}

(async () => {
  console.log("Signing in as", email, "...");
  const token = await signIn();
  console.log("✓ Signed in\n");

  const questions = [
    "What activities did I do in the last 7 days?",
    "What should my daily calorie intake be?",
  ];

  for (const q of questions) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`Q: ${q}`);
    console.log("─".repeat(60));
    const answer = await callAICoach(token, q);
    console.log(answer);
  }
})();
