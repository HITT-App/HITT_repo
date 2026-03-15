import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowLeft, Share2, Bookmark, Mountain, Ruler, Gauge, MapPin, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoutes, Route } from "@/hooks/useRoutes";
import { ROUTES } from "@/lib/routes";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#22c55e",
  moderate: "#f59e0b",
  hard: "#ef4444",
};

const RouteDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { routes, isLoading } = useRoutes();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const route = routes.find(r => r.id === id) ?? null;

  // Init map
  useEffect(() => {
    if (!containerRef.current || !route || route.coordinates.length < 2) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const latlngs = route.coordinates.map(c => [c.lat, c.lng] as [number, number]);
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

    const color = DIFFICULTY_COLORS[route.difficulty] || "#f59e0b";
    L.polyline(latlngs, { color, weight: 4, opacity: 0.9 }).addTo(map);

    // Start/end markers
    L.circleMarker(latlngs[0], { radius: 7, color: "#22c55e", fillColor: "#22c55e", fillOpacity: 1, weight: 2, className: "" }).addTo(map);
    L.circleMarker(latlngs[latlngs.length - 1], { radius: 7, color: "#ef4444", fillColor: "#ef4444", fillOpacity: 1, weight: 2 }).addTo(map);

    map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, [route]);

  // Elevation profile data
  const elevationData = route?.coordinates
    .filter(c => c.alt !== undefined)
    .map((c, i) => ({ x: i, y: c.alt! })) ?? [];

  const maxElev = Math.max(...elevationData.map(d => d.y), 1);
  const minElev = Math.min(...elevationData.map(d => d.y), 0);
  const elevRange = maxElev - minElev || 1;

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen text-muted-foreground">Loading...</div>;
  }

  if (!route) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Route not found</p>
        <Button onClick={() => navigate(ROUTES.ROUTES_EXPLORER)}>Back to Routes</Button>
      </div>
    );
  }

  const handleStartRoute = () => {
    navigate(`/activity-live?sport=Run&routeId=${route.id}`);
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Map section */}
      <div className="relative h-[45vh] shrink-0">
        <div ref={containerRef} className="absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 z-[500] flex items-center justify-between px-4 pt-3 safe-area-top">
          <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-md" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-md">
              <Share2 size={18} />
            </Button>
            <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-md">
              <Bookmark size={18} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto rounded-t-3xl -mt-6 relative z-[400] bg-background">
        <div className="px-5 pt-6 pb-32">
          {/* Title */}
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-foreground">{route.name}</h1>
            <Badge variant="outline" style={{ borderColor: DIFFICULTY_COLORS[route.difficulty], color: DIFFICULTY_COLORS[route.difficulty] }}>
              {route.difficulty}
            </Badge>
          </div>
          {route.description && <p className="text-sm text-muted-foreground mb-4">{route.description}</p>}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Ruler, label: "Distance", value: `${route.distance_km.toFixed(1)} km` },
              { icon: Mountain, label: "Elevation", value: `${Math.round(route.elevation_gain_m)} m` },
              { icon: Gauge, label: "Est. Time", value: `${route.estimated_minutes} min` },
            ].map(stat => (
              <div key={stat.label} className="bg-secondary/50 rounded-2xl p-3 text-center">
                <stat.icon size={16} className="mx-auto text-muted-foreground mb-1" />
                <p className="text-base font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Surface & Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="secondary" className="gap-1"><MapPin size={12} />{route.surface_type}</Badge>
            {route.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
          </div>

          {/* Elevation profile */}
          {elevationData.length > 2 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold text-foreground mb-3">Elevation Profile</h2>
              <div className="bg-secondary/30 rounded-2xl p-4 h-28">
                <svg viewBox={`0 0 ${elevationData.length} 100`} className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="elev-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(24,95%,50%)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="hsl(24,95%,50%)" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,100 ${elevationData.map(d => `L${d.x},${100 - ((d.y - minElev) / elevRange) * 90}`).join(" ")} L${elevationData.length - 1},100 Z`}
                    fill="url(#elev-grad)"
                  />
                  <path
                    d={elevationData.map((d, i) => `${i === 0 ? "M" : "L"}${d.x},${100 - ((d.y - minElev) / elevRange) * 90}`).join(" ")}
                    fill="none"
                    stroke="hsl(24,95%,50%)"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                <span>{Math.round(minElev)}m</span>
                <span>{Math.round(maxElev)}m</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start button */}
      <div className="absolute bottom-0 left-0 right-0 z-[500] p-5 bg-gradient-to-t from-background via-background/95 to-transparent" style={{ paddingBottom: "calc(var(--safe-area-inset-bottom, 0px) + 20px)" }}>
        <Button className="w-full h-14 text-base font-bold gap-2 rounded-2xl" onClick={handleStartRoute}>
          <Play size={20} />
          Start This Route
        </Button>
      </div>
    </div>
  );
};

export default RouteDetail;
