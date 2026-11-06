import L from "leaflet";

// A plain string, not a {key} template option: Leaflet throws on a missing template value,
// and a build without the key should show CARTO's warning tile rather than crash the screen.
const TILE_URL = `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTO_KEY ?? ""}`;
// CARTO's terms require this on every map. Plain text, because a link would leave the app's web view.
const ATTRIBUTION = "© OpenStreetMap contributors, © CARTO";

export function addBaseMap(map: L.Map) {
  L.control.attribution({ prefix: false }).addTo(map);
  // CARTO refuses tiles above zoom 18, so a short route zoomed further stretches zoom 18 instead of going blank.
  return L.tileLayer(TILE_URL, { maxZoom: 19, maxNativeZoom: 18, attribution: ATTRIBUTION }).addTo(map);
}
