// Provider-neutral wrapper for OpenAI-compatible chat-completion APIs.
//
// Every edge function that needs an LLM calls aiChatCompletion() instead of
// hardcoding a gateway URL. Switching providers (Lovable → Anthropic, OpenAI,
// OpenRouter, …) becomes a change to two Supabase secrets, no code.
//
// Defaults preserve legacy behaviour: if AI_GATEWAY_URL is unset, Lovable's
// gateway is used; if AI_API_KEY is unset, LOVABLE_API_KEY is used. Once the
// provider swap is made, the new secrets take over and the fallbacks can be
// deleted.

export interface AIChatCompletionOptions {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  stream?: boolean;
  response_format?: unknown;
  modalities?: string[];
  temperature?: number;
  max_tokens?: number;
  [key: string]: unknown;
}

function getConfig(): { url: string; apiKey: string } {
  const url = Deno.env.get("AI_GATEWAY_URL") ?? "https://ai.gateway.lovable.dev";
  const apiKey =
    Deno.env.get("AI_API_KEY") ??
    Deno.env.get("LOVABLE_API_KEY") ??
    "";
  if (!apiKey) {
    throw new Error(
      "AI_API_KEY (or legacy LOVABLE_API_KEY) environment variable is not set"
    );
  }
  return { url: url.replace(/\/$/, ''), apiKey };
}

export async function aiChatCompletion(
  options: AIChatCompletionOptions
): Promise<Response> {
  const { url, apiKey } = getConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);
  try {
    return await fetch(`${url}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
