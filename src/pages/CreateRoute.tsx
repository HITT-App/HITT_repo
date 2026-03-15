import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Undo2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoutes, RouteCoordinate } from "@/hooks/useRoutes";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const DIFFICULTIES = ["easy", "moderate", "hard"] as const;
const SURFACES = ["road", "trail", "mixed", "gravel", "sand"] as const;

/** Haversine distance in km */
function haversine(a: RouteCoordinate, b: RouteCoordinate): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
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

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    navigator.geolocation?.getCurrentPosition(
      (p) => initMap(p.coords.latitude, p.coords.longitude),
      () => initMap(25.2048, 55.2708)
    );

    function initMap(lat: number, lng: number) {
      const map = L.map(containerRef.current!, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      mapRef.current = map;

      map.on("click", (e: L.LeafletMouseEvent) => {
        const newCoord: RouteCoordinate = { lat: e.latlng.lat, lng: e.latlng.lng };
        setCoords(prev => [...prev, newCoord]);
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
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    polylineRef.current?.remove();

    coords.forEach((c, i) => {
      const isFirst = i === 0;
      const isLast = i === coords.length - 1 && coords.length > 1;
      const color = isFirst ? "#22c55e" : isLast ? "#ef4444" : "hsl(24,95%,50%)";
      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 6, color, fillColor: color, fillOpacity: 1, weight: 2,
      }).addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    if (coords.length >= 2) {
      polylineRef.current = L.polyline(
        coords.map(c => [c.lat, c.lng] as [number, number]),
        { color: "hsl(24,95%,50%)", weight: 3, opacity: 0.8, dashArray: "8 6" }
      ).addTo(mapRef.current);
    }
  }, [coords]);

  const undo = () => setCoords(prev => prev.slice(0, -1));
  const clearAll = () => setCoords([]);

  const dist = totalDistance(coords);

  const handleSave = () => {
    if (!name.trim()) return;
    createRoute.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        distance_km: Math.round(dist * 100) / 100,
        elevation_gain_m: 0,
        estimated_minutes: Math.round((dist / 5) * 60), // ~5km/h walking pace
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
      <div className="absolute top-0 left-0 right-0 z-[500] flex items-center justify-between px-4 pt-3 safe-area-top">
        <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-md" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <span className="text-sm font-bold text-foreground bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full">
          Tap map to add points
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-md" onClick={undo} disabled={coords.length === 0}>
            <Undo2 size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-md" onClick={clearAll} disabled={coords.length === 0}>
            <Trash2 size={18} />
          </Button>
        </div>
      </div>

      {/* Distance indicator */}
      {coords.length >= 2 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[500] bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold">
          {dist.toFixed(2)} km
        </div>
      )}

      {/* Bottom panel */}
      <div className="absolute bottom-0 left-0 right-0 z-[500]" style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}>
        <div className="bg-background/95 backdrop-blur-md rounded-t-3xl border-t border-border/40 px-5 pt-4 pb-6">
          {!showForm ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground text-center">
                {coords.length === 0
                  ? "Tap on the map to start plotting your route"
                  : `${coords.length} point${coords.length !== 1 ? "s" : ""} · ${dist.toFixed(2)} km`}
              </p>
              <Button
                className="w-full"
                disabled={coords.length < 2}
                onClick={() => setShowForm(true)}
              >
                <Save size={16} className="mr-2" />
                Continue to Save
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Route Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Morning trail run" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Scenic route through the park" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs mb-2 block">Difficulty</Label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map(d => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-medium capitalize transition-all border",
                        difficulty === d ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border/40"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs mb-2 block">Surface</Label>
                <div className="flex gap-2 flex-wrap">
                  {SURFACES.map(s => (
                    <button
                      key={s}
                      onClick={() => setSurface(s)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all border",
                        surface === s ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-foreground border-border/40"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Back</Button>
                <Button
                  className="flex-1"
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
