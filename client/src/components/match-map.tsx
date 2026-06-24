import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "wouter";

type MP = {
  fonte: string;
  indirizzo: string;
  prezzo?: any;
  num_agenzie?: number | null;
  lat?: number | null;
  lng?: number | null;
  href: string;
};

const pin = (c: string) =>
  L.divIcon({
    className: "",
    html: `<svg width="22" height="30" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 22 12 22s12-13.5 12-22C24 5.37 18.63 0 12 0z" fill="${c}" stroke="rgba(0,0,0,.35)" stroke-width="1"/><circle cx="12" cy="12" r="4.5" fill="#ffffffcc"/></svg>`,
    iconSize: [22, 30],
    iconAnchor: [11, 30],
    popupAnchor: [0, -26],
  });
const ICON_GIALLO = pin("#f59e0b");
const ICON_VERDE = pin("#10b981");

export function MatchMap({ points }: { points: MP[] }) {
  const pts = points.filter((p) => p.lat != null && p.lng != null);
  if (pts.length === 0) return null;
  const center: [number, number] = [pts[0].lat as number, pts[0].lng as number];
  return (
    <div className="rounded-lg overflow-hidden border mb-3" style={{ height: 260 }}>
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        {pts.map((p, i) => (
          <Marker key={i} position={[p.lat as number, p.lng as number]} icon={p.fonte === "pluricondiviso" ? ICON_GIALLO : ICON_VERDE}>
            <Popup>
              <div style={{ minWidth: 150 }}>
                <div style={{ fontWeight: 600 }}>{p.indirizzo}</div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  {p.fonte === "pluricondiviso" ? `${p.num_agenzie || "?"} agenzie` : "privato"}
                  {p.prezzo ? ` · €${Math.round(Number(p.prezzo)).toLocaleString("it-IT")}` : ""}
                </div>
                <div style={{ marginTop: 6 }}>
                  <Link href={p.href}>
                    <span style={{ color: "#2563eb", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Lavora →</span>
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
