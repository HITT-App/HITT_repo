// Sends a saved route to Garmin Connect, which then syncs it to the watch itself.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Watch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGarminConnection } from "@/hooks/useGarminConnection";
import { callGarmin } from "@/lib/garmin-api";
import { garminErrorMessage, routeSendMessage } from "@/lib/garmin-state";

export function GarminRouteButton({ routeId }: { routeId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { connection, state } = useGarminConnection();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const key = ["garmin", "course-link", routeId];
  const { data: link } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("garmin_course_links")
        .select("sent_at")
        .eq("user_id", user!.id)
        .eq("route_id", routeId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && state === "connected",
  });

  if (state !== "connected") return null;
  if (!connection?.course_import_consented_at) {
    return (
      <Button variant="outline" className="w-full rounded-2xl gap-2" onClick={() => navigate("/connected-devices")}>
        <Watch size={16} /> Turn on sending routes to Garmin
      </Button>
    );
  }

  const run = async (action: "send" | "remove") => {
    setBusy(true);
    setMessage(null);
    const { data, error } = await callGarmin("garmin-courses", { action, route_id: routeId });
    await queryClient.invalidateQueries({ queryKey: key });
    setBusy(false);
    if (error) return setMessage(garminErrorMessage(error));
    setMessage(action === "remove" ? "Removed from Garmin" : routeSendMessage(data?.status ?? ""));
  };

  const sent = !!link?.sent_at;

  return (
    <div className="space-y-1.5">
      <Button variant="outline" className="w-full rounded-2xl gap-2" disabled={busy} onClick={() => run(sent ? "remove" : "send")}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : sent ? <Check size={16} /> : <Watch size={16} />}
        {sent ? "Sent to Garmin. Tap to remove" : "Send to Garmin"}
      </Button>
      {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
    </div>
  );
}
