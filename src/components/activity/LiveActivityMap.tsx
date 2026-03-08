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
      center: [25.2048, 55.2708], // Default: Dubai
      zoom: 16,
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      doubleClickZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

    mapRef.current = map;

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

    // Update polyline
    if (trail.length >= 2) {
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(trail);
      } else {
        polylineRef.current = L.polyline(trail, {
          color: "hsl(24, 75%, 50%)",
          weight: 4,
          opacity: 0.85,
        }).addTo(map);
      }
    }

    // Update position dot
    if (lastPos) {
      const latlng: [number, number] = [lastPos.lat, lastPos.lng];
      if (dotRef.current) {
        dotRef.current.setLatLng(latlng);
      } else {
        dotRef.current = L.circleMarker(latlng, {
          radius: 8,
          color: "hsl(24, 75%, 50%)",
          fillColor: "hsl(24, 75%, 50%)",
          fillOpacity: 1,
          weight: 3,
        }).addTo(map);
      }

      if (pulseRef.current) {
        pulseRef.current.setLatLng(latlng);
      } else {
        pulseRef.current = L.circleMarker(latlng, {
          radius: 20,
          color: "hsl(24, 75%, 50%)",
          fillColor: "hsl(24, 75%, 50%)",
          fillOpacity: 0.2,
          weight: 0,
        }).addTo(map);
      }

      map.setView(latlng, map.getZoom(), { animate: true });
    }
  }, [positions]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden" style={{ minHeight: 200 }}>
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: 200 }} />

      {/* Overlay when no GPS */}
      {gpsStatus !== "active" && (
        <div className="absolute inset-0 bg-muted/60 backdrop-blur-sm flex items-center justify-center z-[1000]">
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
