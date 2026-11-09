import { supabase } from "@/integrations/supabase/client";

// Raise this when the policy changes materially: every user is asked to agree once more.
export const PRIVACY_POLICY_VERSION = "2026-11-06";

const CHECK_TIMEOUT_MS = 3000;

const acceptances = () => supabase.from("privacy_policy_acceptances");

export async function recordPolicyAcceptance(userId: string, platform: string) {
  const { error } = await acceptances().upsert(
    { user_id: userId, policy_version: PRIVACY_POLICY_VERSION, platform },
    { onConflict: "user_id,policy_version", ignoreDuplicates: true },
  );
  if (error) throw error;
}

// False when the user may carry on. A failed or slow check lets them through and they're asked
// next time, so a poor connection never locks anyone out of the app, least of all mid-workout.
export async function needsPolicyAgreement(userId: string): Promise<boolean> {
  const check = acceptances()
    .select("policy_version")
    .eq("user_id", userId)
    .eq("policy_version", PRIVACY_POLICY_VERSION)
    .maybeSingle()
    .then(({ data, error }) => !error && !data, () => false);
  const timeout = new Promise<boolean>(resolve => setTimeout(() => resolve(false), CHECK_TIMEOUT_MS));
  return Promise.race([check, timeout]);
}
