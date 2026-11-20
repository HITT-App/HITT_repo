// How a scheduled workout stands with Garmin, with a way to fix it when it can't be sent.
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGarminConnection } from "@/hooks/useGarminConnection";
import { callGarmin } from "@/lib/garmin-api";
import { garminErrorMessage, workoutSyncLabel } from "@/lib/garmin-state";

const MAX_SWIM_METRES = 100_000;
const LINKS_KEY = ["garmin", "workout-links"];

export function useGarminWorkoutLinks() {
  const { user } = useAuth();
  const { connection } = useGarminConnection();
  const consented = !!connection?.workout_import_consented_at;
  const { data } = useQuery({
    queryKey: [...LINKS_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("garmin_workout_links")
        .select("scheduled_workout_id, sync_status")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Map(data.map(l => [l.scheduled_workout_id, l.sync_status]));
    },
    enabled: !!user && consented,
    staleTime: 30 * 1000,
  });
  return consented ? data : undefined;
}

export function GarminWorkoutStatus({ workoutId, status }: { workoutId: string; status: string | undefined }) {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [metres, setMetres] = useState("");
  const [error, setError] = useState<string | null>(null);

  const label = workoutSyncLabel(status);
  if (!label) return null;

  const act = async (body: Record<string, unknown>) => {
    setError(null);
    const { error: callError } = await callGarmin("garmin-workouts", { scheduled_workout_id: workoutId, ...body });
    if (callError) return setError(garminErrorMessage(callError));
    setAsking(false);
    await queryClient.invalidateQueries({ queryKey: LINKS_KEY });
  };

  const value = Number(metres);

  return (
    <div className="text-[11.5px] text-muted-foreground mt-0.5">
      <span>{label}</span>
      {status === "failed" && (
        <button className="ml-2 font-semibold text-primary" onClick={() => void act({ action: "retry" })}>Retry</button>
      )}
      {status === "needs_distance" && !asking && (
        <button className="ml-2 font-semibold text-primary" onClick={() => setAsking(true)}>Add</button>
      )}
      {asking && (
        <span className="flex items-center gap-2 mt-1">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Metres"
            aria-label="Swim distance in metres"
            value={metres}
            onChange={e => setMetres(e.target.value)}
            className="w-24 rounded-md border border-border bg-background px-2 py-1 text-base"
          />
          <button
            className="font-semibold text-primary disabled:opacity-50"
            disabled={!(value > 0 && value <= MAX_SWIM_METRES)}
            onClick={() => void act({ action: "set_distance", distance_m: value })}
          >
            Save
          </button>
        </span>
      )}
      {error && <span className="block mt-0.5">{error}</span>}
    </div>
  );
}
