// Garmin's brand rules: its name and the device model beneath the title wherever its data
// appears, plus a note on anything worked out partly from it.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGarminConnection } from "@/hooks/useGarminConnection";
import { GARMIN_DERIVED_NOTE, garminAttribution } from "@/lib/garmin-state";

type GarminFields = { garmin_activity_id?: string | null; garmin_device_name?: string | null };

// A merged row can keep another source_platform, so the Garmin ID decides this.
export function activityAttribution(log: GarminFields): string | null {
  return log.garmin_activity_id ? garminAttribution(log.garmin_device_name) : null;
}

export function GarminAttribution({ log, className, style }: {
  log: GarminFields;
  className?: string;
  style?: React.CSSProperties;
}) {
  const label = activityAttribution(log);
  if (!label) return null;
  return <p className={className} style={style}>{label}</p>;
}

// Kept data still counts after a disconnect, and deleted data doesn't.
export function useHasGarminData(): boolean {
  const { user } = useAuth();
  const { enabled, connection } = useGarminConnection();
  const { data } = useQuery({
    queryKey: ["garmin", "has-data", user?.id],
    queryFn: async () => {
      const [activity, sleep, metrics] = await Promise.all([
        supabase.from("activity_logs").select("id").eq("user_id", user!.id).not("garmin_activity_id", "is", null).limit(1),
        supabase.from("sleep_logs").select("id").eq("user_id", user!.id).eq("source_platform", "garmin_api").limit(1),
        supabase.from("health_metrics").select("id").eq("user_id", user!.id).eq("source_platform", "garmin_api").limit(1),
      ]);
      return [activity, sleep, metrics].some(r => (r.data?.length ?? 0) > 0);
    },
    enabled: !!user && enabled && !!connection,
    staleTime: 5 * 60 * 1000,
  });
  return data === true;
}

export function GarminDerivedNote({ className = "text-[10.5px] text-muted-foreground" }: { className?: string }) {
  return useHasGarminData() ? <p className={className}>{GARMIN_DERIVED_NOTE}</p> : null;
}

// ai_purge_from stays set until the AI's output from the consent period is deleted.
export function GarminAiNote({ className = "text-[10.5px] text-muted-foreground" }: { className?: string }) {
  const { connection } = useGarminConnection();
  return connection?.ai_purge_from ? <p className={className}>{GARMIN_DERIVED_NOTE}</p> : null;
}
