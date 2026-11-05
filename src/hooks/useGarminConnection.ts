import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { garminCardState, type GarminConnectionRow } from "@/lib/garmin-state";

const CONNECTION_COLUMNS =
  "status, permissions, disconnect_reason, disconnected_at, ai_purge_from, ai_consent_at, workout_import_consented_at, course_import_consented_at, last_activity_at, last_workout_pushed_at";

export const GARMIN_CONNECTION_KEY = ["garmin", "connection"];
export const GARMIN_FLAGS_KEY = ["garmin", "flags"];

// Both fail closed: a missing or unreadable setting means the feature stays hidden.
async function loadFlags(userId: string) {
  const [{ data: settings }, { data: tester }] = await Promise.all([
    supabase.from("app_settings").select("key, value").in("key", ["ff_garmin_cloud", "ff_garmin_ai"]),
    supabase.from("garmin_testers").select("user_id").eq("user_id", userId).maybeSingle(),
  ]);
  const value = (key: string) => settings?.find(s => s.key === key)?.value;
  return { enabled: value("ff_garmin_cloud") === "on" || !!tester, aiEnabled: value("ff_garmin_ai") === "on" };
}

export function useGarminConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const flags = useQuery({
    queryKey: [...GARMIN_FLAGS_KEY, user?.id],
    queryFn: () => loadFlags(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const enabled = flags.data?.enabled === true;

  const connection = useQuery({
    queryKey: [...GARMIN_CONNECTION_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("garmin_connections")
        .select(CONNECTION_COLUMNS)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as GarminConnectionRow | null;
    },
    enabled: !!user && enabled,
    staleTime: 30 * 1000,
  });

  const state = garminCardState(connection.data);

  return {
    enabled,
    aiEnabled: flags.data?.aiEnabled === true,
    loading: flags.isLoading || (enabled && connection.isLoading),
    connection: connection.data ?? null,
    state,
    connected: enabled && (state === "connected" || state === "permission_off" || state === "needs_reconnect"),
    refresh: () => queryClient.invalidateQueries({ queryKey: GARMIN_CONNECTION_KEY }),
  };
}
