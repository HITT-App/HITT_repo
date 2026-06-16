import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, Bookmark, Plus, LocateFixed, ArrowLeft, Mountain, Ruler, Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoutes, Route } from "@/hooks/useRoutes";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { App as CapApp } from "@capacitor/app";
import { getCurrentPosition } from "@/lib/native-gps";

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "#22c55e",
  moderate: "#f59e0b",
  hard: "#ef4444",
};

const FILTER_CHIPS = ["All", "Official", "Easy", "Moderate", "Hard", "Short", "Long"] as const;

const RoutesExplorer = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { routes, isLoading } = useRoutes();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylinesRef = useRef<L.Polyline[]>([]);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [savedRouteIds, setSavedRouteIds] = useState<Set<string>>(new Set());

  // Load saved routes
  useEffect(() => {
    if (!user) return;
    supabase.from('saved_routes').select('route_id').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setSavedRouteIds(new Set(data.map(r => r.route_id)));
      });
  }, [user]);

  const toggleSave = useCallback(async (routeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const isSaved = savedRouteIds.has(routeId);
    if (isSaved) {
      await supabase.from('saved_routes').delete().eq('user_id', user.id).eq('route_id', routeId);
      setSavedRouteIds(prev => { const n = new Set(prev); n.delete(routeId); return n; });
    } else {
      await supabase.from('saved_routes').insert({ user_id: user.id, route_id: routeId });
      setSavedRouteIds(prev => new Set([...prev, routeId]));
    }
  }, [user, savedRouteIds]);

  // Separate official & user routes
  const officialRoutes = useMemo(() => routes.filter(r => (r as any).is_official), [routes]);
  const userRoutes = useMemo(() => routes.filter(r => !(r as any).is_official), [routes]);

  // Filter routes
  const filtered = useMemo(() => {
    let list = routes;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.name.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)));
    }
    if (activeFilter === "Easy") list = list.filter(r => r.difficulty === "easy");
    else if (activeFilter === "Moderate") list = list.filter(r => r.difficulty === "moderate");
    else if (activeFilter === "Hard") list = list.filter(r => r.difficulty === "hard");
    else if (activeFilter === "Short") list = list.filter(r => r.distance_km <= 5);
    else if (activeFilter === "Long") list = list.filter(r => r.distance_km > 10);
    else if (activeFilter === "Official") list = list.filter(r => (r as any).is_official);
    if (showSaved) list = list.filter(r => savedRouteIds.has(r.id));
    return list;
  }, [routes, search, activeFilter, showSaved, savedRouteIds]);

  // Get user location
  useEffect(() => {
    getCurrentPosition().then((pos) => {
      if (pos) {
        setUserPos([pos.lat, pos.lng]);
        setLocationDenied(false);
      } else {
        setLocationDenied(true);
      }
    });
  }, []);

  // Init map — wait for a real position before creating the map
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !userPos) return;
    const center = userPos;
    const map = L.map(containerRef.current, {
      center,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [userPos]);

  // Draw user dot
  useEffect(() => {
    if (!mapRef.current || !userPos) return;
    const pulse = L.circleMarker(userPos, {
      radius: 14, color: "hsl(210,100%,56%)", fillColor: "hsl(210,100%,56%)", fillOpacity: 0.2, weight: 0,
      className: "animate-pulse",
    }).addTo(mapRef.current);
    const dot = L.circleMarker(userPos, {
      radius: 6, color: "#fff", fillColor: "hsl(210,100%,56%)", fillOpacity: 1, weight: 2,
    }).addTo(mapRef.current);
    return () => { pulse.remove(); dot.remove(); };
  }, [userPos]);

  // Draw route polylines
  useEffect(() => {
    if (!mapRef.current) return;
    polylinesRef.current.forEach(p => p.remove());
    polylinesRef.current = [];

    filtered.forEach(route => {
      if (route.coordinates.length < 2) return;
      const latlngs = route.coordinates.map(c => [c.lat, c.lng] as [number, number]);
      const color = DIFFICULTY_COLORS[route.difficulty] || "#f59e0b";
      const isSelected = selectedRoute?.id === route.id;
      const polyline = L.polyline(latlngs, {
        color, weight: isSelected ? 5 : 3, opacity: isSelected ? 1 : 0.6,
      }).addTo(mapRef.current!);
      polyline.on("click", () => setSelectedRoute(route));
      polylinesRef.current.push(polyline);
    });
  }, [filtered, selectedRoute]);

  const recenter = () => {
    if (mapRef.current && userPos) mapRef.current.flyTo(userPos, 13);
  };

  return (
    <div className="fixed inset-0 z-40 bg-background">
      {/* Map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Top bar */}
      <div className="sticky top-0 left-0 right-0 z-[500] safe-area-top bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <Button variant="ghost" size="icon" aria-label="Go back" className="bg-background/80 backdrop-blur-md shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search routes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background/80 backdrop-blur-md border-border/40 h-10"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn("bg-background/80 backdrop-blur-md shrink-0", showSaved && "text-primary")}
            onClick={() => setShowSaved(!showSaved)}
          >
            <Bookmark size={20} />
          </Button>
        </div>

        {/* Location denied banner */}
        {locationDenied && (
          <div style={{ margin: '0 16px 8px', padding: '10px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#fca5a5', flex: 1, lineHeight: 1.4 }}>Location access off — map shows London by default.</span>
            <button
              onClick={() => CapApp.openUrl({ url: 'app-settings:' }).catch(() => {})}
              style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 8, background: '#ef4444', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
            >
              Settings
            </button>
          </div>
        )}

        {/* Filter chips */}
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto no-scrollbar">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => setActiveFilter(chip)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                activeFilter === chip
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/70 backdrop-blur-md text-foreground border border-border/40"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute right-4 bottom-56 z-[500] flex flex-col gap-2">
        <Button variant="ghost" size="icon" className="bg-background/80 backdrop-blur-md" onClick={recenter}>
          <LocateFixed size={18} />
        </Button>
      </div>

      {/* Create route FAB */}
      <Button
        className="absolute left-4 bottom-56 z-[500] shadow-elevated gap-2"
        onClick={() => navigate(ROUTES.CREATE_ROUTE)}
      >
        <Plus size={16} />
        Create
      </Button>

      {/* Bottom card */}
      <div className="absolute bottom-0 left-0 right-0 z-[500]" style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}>
        <div className="bg-background/95 backdrop-blur-md rounded-t-3xl border-t border-border/40 px-5 pt-4 pb-6">
          {selectedRoute ? (
            <button className="w-full text-left" onClick={() => navigate(ROUTES.routeDetail(selectedRoute.id))}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground">{selectedRoute.name}</h3>
                    <Badge variant="outline" className="text-[10px]" style={{ borderColor: DIFFICULTY_COLORS[selectedRoute.difficulty] }}>
                      {selectedRoute.difficulty}
                    </Badge>
                  </div>
                  {selectedRoute.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{selectedRoute.description}</p>
                  )}
                </div>
                <button
                  onClick={(e) => toggleSave(selectedRoute.id, e)}
                  className="ml-2 p-2 rounded-full active:bg-secondary/50"
                >
                  <Bookmark
                    size={18}
                    className={savedRouteIds.has(selectedRoute.id) ? "text-primary fill-primary" : "text-muted-foreground"}
                  />
                </button>
              </div>
              <div className="flex items-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Ruler size={13} />{selectedRoute.distance_km.toFixed(1)} km</span>
                <span className="flex items-center gap-1"><Mountain size={13} />{Math.round(selectedRoute.elevation_gain_m)} m</span>
                <span className="flex items-center gap-1"><Gauge size={13} />~{selectedRoute.estimated_minutes} min</span>
                <span className="ml-auto text-[10px] bg-secondary px-2 py-0.5 rounded-full">{selectedRoute.surface_type}</span>
              </div>
            </button>
          ) : (
            <div>
              <h3 className="font-bold text-foreground mb-2">
                {isLoading ? "Loading routes..." : `${filtered.length} Route${filtered.length !== 1 ? "s" : ""} nearby`}
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {filtered.slice(0, 5).map(route => (
                  <button
                    key={route.id}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                    onClick={() => {
                      setSelectedRoute(route);
                      if (route.coordinates.length > 0 && mapRef.current) {
                        mapRef.current.flyTo([route.coordinates[0].lat, route.coordinates[0].lng], 14);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: DIFFICULTY_COLORS[route.difficulty] }} />
                      <span className="text-sm font-medium text-foreground">{route.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{route.distance_km.toFixed(1)} km</span>
                  </button>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <p className="text-sm text-muted-foreground text-center py-4">No routes found. Create your first one!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoutesExplorer;
