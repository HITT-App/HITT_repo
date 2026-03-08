import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GpsPoint {
  lat: number;
  lng: number;
  ts: number;
}

interface LiveActivityMapProps {
  positions: GpsPoint[];
  gpsStatus: "searching" | "active" | "unavailable" | "denied";
}

const LiveActivityMap = ({ positions, gpsStatus }: LiveActivityMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const dotRef = useRef<L.CircleMarker | null>(null);
  const pulseRef = useRef<L.CircleMarker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [25.2048, 55.2708],
      zoom: 16,
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      doubleClickZoom: false,
    });

    // Dark sporty map style via CartoDB Dark Matter
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    mapRef.current = map;

    // Fix Leaflet sizing after mount
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update trail & position
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const trail: [number, number][] = positions.map((p) => [p.lat, p.lng]);
    const lastPos = positions.length > 0 ? positions[positions.length - 1] : null;

    // Update polyline (glowing route trail)
    if (trail.length >= 2) {
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(trail);
      } else {
        // Glow layer underneath
        L.polyline(trail, {
          color: "hsl(24, 90%, 55%)",
          weight: 10,
          opacity: 0.25,
        }).addTo(map);

        // Main trail
        polylineRef.current = L.polyline(trail, {
          color: "hsl(24, 90%, 55%)",
          weight: 4,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
      }
    }

    // Update position marker
    if (lastPos) {
      const latlng: [number, number] = [lastPos.lat, lastPos.lng];

      // Outer pulse ring
      if (pulseRef.current) {
        pulseRef.current.setLatLng(latlng);
      } else {
        pulseRef.current = L.circleMarker(latlng, {
          radius: 18,
          color: "hsl(24, 90%, 55%)",
          fillColor: "hsl(24, 90%, 55%)",
          fillOpacity: 0.15,
          weight: 1,
          opacity: 0.4,
        }).addTo(map);
      }

      // Inner dot
      if (dotRef.current) {
        dotRef.current.setLatLng(latlng);
      } else {
        dotRef.current = L.circleMarker(latlng, {
          radius: 7,
          color: "#ffffff",
          fillColor: "hsl(24, 90%, 55%)",
          fillOpacity: 1,
          weight: 3,
        }).addTo(map);
      }

      map.setView(latlng, map.getZoom(), { animate: true });
    }
  }, [positions]);

  // Resize handling
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const observer = new ResizeObserver(() => map.invalidateSize());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg">
      <div ref={containerRef} className="w-full h-full absolute inset-0" />

      {/* GPS status overlays */}
      {gpsStatus !== "active" && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-md flex flex-col items-center justify-center z-[1000] gap-3">
          {gpsStatus === "searching" && (
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
          <p className="text-muted-foreground text-sm font-medium">
            {gpsStatus === "searching"
              ? "Acquiring GPS signal…"
              : gpsStatus === "denied"
              ? "GPS permission denied"
              : "GPS unavailable"}
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveActivityMap;
