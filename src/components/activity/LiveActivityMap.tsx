import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Circle, useMap } from "react-leaflet";
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

/** Keeps map centred on latest position */
function RecenterMap({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom(), { animate: true });
    }
  }, [position, map]);
  return null;
}

const LiveActivityMap = ({ positions, gpsStatus }: LiveActivityMapProps) => {
  const mapRef = useRef<any>(null);
  const lastPos = positions.length > 0 ? positions[positions.length - 1] : null;
  const center: [number, number] = lastPos
    ? [lastPos.lat, lastPos.lng]
    : [25.2048, 55.2708]; // Default: Dubai

  const trail: [number, number][] = positions.map((p) => [p.lat, p.lng]);

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden">
      <MapContainer
        center={center}
        zoom={16}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        dragging={false}
        doubleClickZoom={false}
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <RecenterMap position={lastPos ? [lastPos.lat, lastPos.lng] : null} />

        {/* Route trail */}
        {trail.length >= 2 && (
          <Polyline
            positions={trail}
            pathOptions={{ color: "hsl(24, 75%, 50%)", weight: 4, opacity: 0.85 }}
          />
        )}

        {/* Current position dot */}
        {lastPos && (
          <>
            <Circle
              center={[lastPos.lat, lastPos.lng]}
              radius={8}
              pathOptions={{
                color: "hsl(24, 75%, 50%)",
                fillColor: "hsl(24, 75%, 50%)",
                fillOpacity: 1,
                weight: 3,
              }}
            />
            <Circle
              center={[lastPos.lat, lastPos.lng]}
              radius={20}
              pathOptions={{
                color: "hsl(24, 75%, 50%)",
                fillColor: "hsl(24, 75%, 50%)",
                fillOpacity: 0.2,
                weight: 0,
              }}
            />
          </>
        )}
      </MapContainer>

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
