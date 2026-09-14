// Maps any abort-shaped error to something a user can act on.
//
// Every AI call goes through aiChatCompletion, which aborts at 55s by default
// (supabase/functions/_shared/ai-client.ts). When a long generation hits that,
// the raw DOMException reaches the UI as "AbortError: The signal has been
// aborted", which reads like a crash rather than a slow request. Anything that
// calls an AI edge function should render errors through this.
export const describeAIError = (err: unknown): string => {
  if (!(err instanceof Error)) return "Something went wrong"
  const looksAborted =
    err.name === "AbortError" || /aborted|abort|signal|timeout/i.test(err.message ?? "")
  if (looksAborted) return "This is taking longer than expected — please try again."
  return err.message || "Something went wrong"
}
