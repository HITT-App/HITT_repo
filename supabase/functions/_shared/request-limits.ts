// Size limits for chat requests. Oversized input is trimmed, never rejected, because
// the legacy /ai-coach page sends the whole day's conversation and uncompressed photos.

export const CHAT_LIMITS = {
  maxMessages: 100,
  maxMessageChars: 50_000,
  maxTotalChars: 400_000,
  // A base64 data URL; about Gemini's inline image limit
  maxImageChars: 20_000_000,
  maxContextChars: 10_000,
}

export type ChatMessage = { role: "user" | "assistant"; content: string; imageData?: string }

export function cleanImageData(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  if (!value.startsWith("data:image/") || value.length > CHAT_LIMITS.maxImageChars) return undefined
  return value
}

export function cleanText(value: unknown, max = CHAT_LIMITS.maxContextChars): string {
  return typeof value === "string" ? value.slice(0, max) : ""
}

// Keeps the newest messages within the limits. Only user and assistant turns are kept,
// so a client can't add its own system instructions.
export function limitChatMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  const cleaned: ChatMessage[] = []
  for (const m of raw.slice(-CHAT_LIMITS.maxMessages)) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) continue
    const content = typeof m.content === "string" ? m.content.slice(0, CHAT_LIMITS.maxMessageChars) : ""
    const imageData = m.role === "user" ? cleanImageData(m.imageData) : undefined
    if (!content && !imageData) continue
    cleaned.push(imageData ? { role: m.role, content, imageData } : { role: m.role, content })
  }

  // Drop the oldest messages once the total is over budget; the newest always stays
  let total = 0
  let start = cleaned.length
  while (start > 0) {
    const next = total + cleaned[start - 1].content.length
    if (next > CHAT_LIMITS.maxTotalChars && start < cleaned.length) break
    total = next
    start--
  }
  return cleaned.slice(start)
}
