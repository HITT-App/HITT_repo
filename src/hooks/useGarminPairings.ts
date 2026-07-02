// Fetches the current user's active Garmin CIQ pairings (redeemed watches
// that haven't been revoked). Powers the Paired watches list in
// ConnectedDevices with per-row Unpair buttons.
//
// Revoke is a straight UPDATE via RLS — no edge function needed. The
// garmin_pairings.users_revoke_own_pairings policy scopes it to the caller.
// The watch discovers the revocation on its next push (server returns 401,
// PushClient.clearToken fires on the watch side).

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GarminPairing {
  id: string;
  device_label: string | null;
  redeemed_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface UseGarminPairingsResult {
  pairings: GarminPairing[];
  loading: boolean;
  refresh: () => Promise<void>;
  unpair: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export function useGarminPairings(): UseGarminPairingsResult {
  const { user } = useAuth();
  const [pairings, setPairings] = useState<GarminPairing[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setPairings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("garmin_pairings")
        .select("id, device_label, redeemed_at, last_seen_at, created_at")
        .eq("user_id", user.id)
        .not("redeemed_at", "is", null)
        .is("revoked_at", null)
        .order("last_seen_at", { ascending: false, nullsFirst: false });
      if (error) {
        console.warn("[useGarminPairings] fetch error:", error.message);
        setPairings([]);
      } else {
        setPairings((data ?? []) as GarminPairing[]);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const unpair = useCallback(async (id: string): Promise<{ ok: boolean; error?: string }> => {
    if (!user?.id) return { ok: false, error: "Not signed in" };
    const { error } = await supabase
      .from("garmin_pairings")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { ok: false, error: error.message };
    await refresh();
    return { ok: true };
  }, [user?.id, refresh]);

  return { pairings, loading, refresh, unpair };
}
