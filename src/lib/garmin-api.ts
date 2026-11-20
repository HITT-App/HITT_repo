import { supabase } from "@/integrations/supabase/client";

export type GarminCall<T> = { data: T; error: null } | { data: null; error: string };

// Functions answer with { error: code } and a non-200 status, which invoke hides inside the response.
export async function callGarmin<T = { status?: string }>(name: string, body: unknown): Promise<GarminCall<T>> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (!error) return { data: data as T, error: null };
  const response = (error as { context?: Response }).context;
  const code = await response?.json?.().then((j: { error?: string }) => j.error).catch(() => null);
  return { data: null, error: code ?? "network" };
}
