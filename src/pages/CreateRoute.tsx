import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Undo2, Save, Trash2, MapPin, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoutes, RouteCoordinate } from "@/hooks/useRoutes";
import { ROUTES } from "@/lib/routes";
import { getCurrentPosition } from "@/lib/native-gps";
import { cn } from "@/lib/utils";

const DIFFICULTIES = ["easy", "moderate", "hard"] as const;
const SURFACES = ["road", "trail", "mixed", "gravel", "sand"] as const;

const DIFFICULTY_META: Record<string, { color: string; emoji: string }> = {
  easy: { color: "#22c55e", emoji: "🟢" },
  moderate: { color: "#f59e0b", emoji: "🟡" },
  hard: { color: "#ef4444", emoji: "🔴" },
};

/** Haversine distance in km */
function haversine(a: RouteCoordinate, b: RouteCoordinate): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function totalDistance(coords: RouteCoordinate[]): number {
  let d = 0;
  for (let i = 1; i < coords.length; i++) d += haversine(coords[i - 1], coords[i]);
  return d;
}

const CreateRoute = () => {
  const navigate = useNavigate();
  const { createRoute } = useRoutes();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const polylineRef = useRef<L.Polyline | null>(null);

  const [coords, setCoords] = useState<RouteCoordinate[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "moderate" | "hard">("moderate");
  const [surface, setSurface] = useState("mixed");
  const [showForm, setShowForm] = useState(false);

  const dist = totalDistance(coords);
  const estMinutes = Math.round((dist / 5) * 60);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    getCurrentPosition().then((pos) => {
      if (pos) initMap(pos.lat, pos.lng);
    });

    function initMap(lat: number, lng: number) {
      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
      ).addTo(map);
      mapRef.current = map;

      map.on("click", (e: L.LeafletMouseEvent) => {
        const newCoord: RouteCoordinate = { lat: e.latlng.lat, lng: e.latlng.lng };
        setCoords((prev) => [...prev, newCoord]);
      });
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw markers & polyline
  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    polylineRef.current?.remove();

    coords.forEach((c, i) => {
      const isFirst = i === 0;
      const isLast = i === coords.length - 1 && coords.length > 1;
      const color = isFirst ? "#22c55e" : isLast ? "#ef4444" : "hsl(24,95%,50%)";
      const radius = isFirst || isLast ? 8 : 5;

      const marker = L.circleMarker([c.lat, c.lng], {
        radius,
        color: "#fff",
        fillColor: color,
        fillOpacity: 1,
        weight: 2,
      }).addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    if (coords.length >= 2) {
      polylineRef.current = L.polyline(
        coords.map((c) => [c.lat, c.lng] as [number, number]),
        {
          color: "hsl(24,95%,50%)",
          weight: 4,
          opacity: 0.9,
          dashArray: "10 8",
          lineCap: "round",
        }
      ).addTo(mapRef.current);
    }
  }, [coords]);

  const undo = () => setCoords((prev) => prev.slice(0, -1));
  const clearAll = () => {
    setCoords([]);
    setShowForm(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    createRoute.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        distance_km: Math.round(dist * 100) / 100,
        elevation_gain_m: 0,
        estimated_minutes: estMinutes,
        difficulty,
        surface_type: surface,
        coordinates: coords,
      },
      { onSuccess: () => navigate(ROUTES.ROUTES_EXPLORER) }
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-background">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-[500] safe-area-top">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="bg-background/80 backdrop-blur-md border border-border/30 shadow-sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </Button>

          <div className="bg-background/80 backdrop-blur-md px-4 py-2 rounded-full border border-border/30 shadow-sm flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {coords.length === 0 ? "Tap to plot" : `${coords.length} point${coords.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 backdrop-blur-md border border-border/30 shadow-sm"
              onClick={undo}
              disabled={coords.length === 0}
            >
              <Undo2 size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="bg-background/80 backdrop-blur-md border border-border/30 shadow-sm text-destructive"
              onClick={clearAll}
              disabled={coords.length === 0}
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Floating distance pill */}
      {coords.length >= 2 && (
        <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-[500]">
          <div className="bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-bold shadow-elevated flex items-center gap-2">
            <CornerDownRight size={14} />
            {dist.toFixed(2)} km
            {estMinutes > 0 && <span className="text-primary-foreground/70 font-normal">· ~{estMinutes} min</span>}
          </div>
        </div>
      )}

      {/* Bottom panel */}
      <div
        className="absolute bottom-0 left-0 right-0 z-[500]"
        style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
      >
        <div className="bg-background/95 backdrop-blur-xl rounded-t-3xl border-t border-border/40 shadow-elevated">
          {!showForm ? (
            <div className="px-5 pt-5 pb-6 space-y-4">
              {/* Mini stats */}
              {coords.length >= 2 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-sm font-bold text-foreground">{dist.toFixed(2)} km</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Points</p>
                    <p className="text-sm font-bold text-foreground">{coords.length}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Est. Time</p>
                    <p className="text-sm font-bold text-foreground">{estMinutes} min</p>
                  </div>
                </div>
              )}

              {coords.length === 0 && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">Tap on the map to start plotting your route</p>
                </div>
              )}

              <Button
                className="w-full h-12 font-bold gap-2"
                disabled={coords.length < 2}
                onClick={() => setShowForm(true)}
              >
                <Save size={16} />
                Continue to Save
              </Button>
            </div>
          ) : (
            <div className="px-5 pt-5 pb-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Name */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Route Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Morning trail run"
                  className="mt-1.5 h-11"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Description <span className="font-normal">(optional)</span>
                </Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scenic route through the park"
                  className="mt-1.5 h-11"
                />
              </div>

              {/* Difficulty */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Difficulty
                </Label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all border-2",
                        difficulty === d
                          ? "border-current bg-current/10"
                          : "bg-secondary/50 text-foreground border-transparent"
                      )}
                      style={difficulty === d ? { color: DIFFICULTY_META[d].color, borderColor: DIFFICULTY_META[d].color } : undefined}
                    >
                      {DIFFICULTY_META[d].emoji} {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Surface */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  Surface Type
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {SURFACES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSurface(s)}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-medium capitalize transition-all border",
                        surface === s
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 text-foreground border-border/40 hover:bg-secondary"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setShowForm(false)}>
                  Back
                </Button>
                <Button
                  className="flex-1 h-12 font-bold"
                  disabled={!name.trim() || createRoute.isPending}
                  onClick={handleSave}
                >
                  {createRoute.isPending ? "Saving..." : "Save Route"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateRoute;
