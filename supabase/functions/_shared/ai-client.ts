// Provider-neutral wrapper for OpenAI-compatible chat-completion APIs.
//
// Every edge function that needs an LLM calls aiChatCompletion() instead of
// hardcoding a gateway URL. Switching providers (Google Gemini, Anthropic,
// OpenAI, OpenRouter, …) is a change to two Supabase secrets, no code.
//
// Both AI_GATEWAY_URL and AI_API_KEY must be set — there is no hardcoded
// provider fallback. Current provider: Google Gemini API (gemini-2.5-flash).

export interface AIChatCompletionOptions {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  stream?: boolean;
  response_format?: unknown;
  modalities?: string[];
  temperature?: number;
  max_tokens?: number;
  timeout_ms?: number;
  [key: string]: unknown;
}

function getConfig(): { url: string; apiKey: string } {
  const url = Deno.env.get("AI_GATEWAY_URL");
  const apiKey = Deno.env.get("AI_API_KEY");
  if (!url) {
    throw new Error("AI_GATEWAY_URL environment variable is not set");
  }
  if (!apiKey) {
    throw new Error("AI_API_KEY environment variable is not set");
  }
  return { url: url.replace(/\/$/, ''), apiKey };
}

export async function aiChatCompletion(
  options: AIChatCompletionOptions
): Promise<Response> {
  const { url, apiKey } = getConfig();
  const { timeout_ms: timeoutMs, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs ?? 55000);
  try {
    return await fetch(`${url}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fetchOptions),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
