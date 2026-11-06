// Route and heart rate from Garmin. They're read here on demand and never join the
// activity's own row, so share cards and AI paths can't pick them up.
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import L from "leaflet";
import { addBaseMap } from "@/lib/mapTiles";
import "leaflet/dist/leaflet.css";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Tokens = { card: string; line: string; dim: string; primary: string };

function RouteMap({ route }: { route: [number, number][] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current || route.length < 2) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    });
    addBaseMap(map);
    L.polyline(route, { color: "#f97316", weight: 4, opacity: 0.9 }).addTo(map);
    map.fitBounds(L.latLngBounds(route), { padding: [24, 24] });
    return () => { map.remove(); };
  }, [route]);
  return <div ref={containerRef} style={{ height: 190, borderRadius: 12, overflow: "hidden" }} aria-label="Route map" />;
}

export function GarminActivityExtras({ garminActivityId, attribution, tokens: C }: {
  garminActivityId: string;
  attribution: string;
  tokens: Tokens;
}) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["garmin", "details", garminActivityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("garmin_activity_details")
        .select("route, heart_rate")
        .eq("user_id", user!.id)
        .eq("garmin_activity_id", garminActivityId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const route = (data?.route ?? []) as [number, number][];
  const heartRate = (data?.heart_rate ?? []) as [number, number][];
  const start = heartRate[0]?.[0] ?? 0;
  const chart = heartRate.map(([t, bpm]) => ({ minutes: Math.round((t - start) / 60), bpm }));
  const card = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: "14px 16px" };
  const caption = { fontSize: 11, color: C.dim, marginBottom: 8 };

  return (
    <>
      {route.length >= 2 && (
        <div style={card}>
          <div style={caption}>Route · {attribution}</div>
          <RouteMap route={route} />
        </div>
      )}
      {chart.length >= 2 && (
        <div style={card}>
          <div style={caption}>Heart rate · {attribution}</div>
          <div style={{ height: 150 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart}>
                <XAxis dataKey="minutes" unit=" min" tick={{ fontSize: 10 }} minTickGap={40} />
                <YAxis width={30} domain={["dataMin - 5", "dataMax + 5"]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value: number) => [`${value} bpm`, "Heart rate"]} labelFormatter={(m: number) => `${m} min`} />
                <Line type="monotone" dataKey="bpm" stroke={C.primary} dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}
