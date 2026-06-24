import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "wouter";

type Point = {
  tipo: "multiagenzia" | "privato";
  id: number;
  lat: number;
  lng: number;
  indirizzo: string;
  zona?: string | null;
  prezzo?: number | null;
  num_agenzie?: number;
  agenzie?: any;
  urls?: any;
  cliente_nome?: string | null;
  url?: string | null;
  contatto_nome?: string | null;
  contatto_telefono?: string | null;
  href: string;
};

const pinIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<svg width="24" height="34" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 22 12 22s12-13.5 12-22C24 5.37 18.63 0 12 0z" fill="${color}" stroke="rgba(0,0,0,.35)" stroke-width="1"/><circle cx="12" cy="12" r="4.5" fill="#ffffffcc"/></svg>`,
    iconSize: [24, 34],
    iconAnchor: [12, 34],
    popupAnchor: [0, -30],
  });
const ICON_GIALLO = pinIcon("#f59e0b");
const ICON_VERDE = pinIcon("#10b981");

const MILANO: [number, number] = [45.4642, 9.19];

function fmtMoney(n?: number | null): string {
  if (!n) return "";
  return `€${Math.round(Number(n)).toLocaleString("it-IT")}`;
}

function agencyLinks(p: Point) {
  const ag = Array.isArray(p.agenzie) ? p.agenzie : [];
  const urls = Array.isArray(p.urls) ? p.urls : [];
  const n = Math.max(ag.length, urls.length);
  const items: any[] = [];
  for (let i = 0; i < n; i++) {
    const nome = typeof ag[i] === "string" ? ag[i] : ag[i]?.nome || `Annuncio ${i + 1}`;
    const url = urls[i];
    items.push(
      url ? (
        <a key={i} href={url} target="_blank" rel="noopener" style={{ marginRight: 8, color: "#2563eb" }}>{nome}</a>
      ) : (
        <span key={i} style={{ marginRight: 8 }}>{nome}</span>
      )
    );
  }
  return items.length ? items : <span style={{ color: "#999" }}>—</span>;
}

export default function Mappa() {
  const { data, isLoading } = useQuery<{ points: Point[] }>({ queryKey: ["/api/mappa/acquisizione"] });
  const points = data?.points || [];
  const nGiallo = points.filter((p) => p.tipo === "multiagenzia").length;
  const nVerde = points.filter((p) => p.tipo === "privato").length;

  return (
    <div className="p-3 md:p-6 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">🗺️ Mappa acquisizione</h1>
          <p className="text-sm text-muted-foreground">Dove sono le opportunità. Clicca un pin per i dettagli.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: "#f59e0b" }} /> Multiagenzia <b>{nGiallo}</b></span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full inline-block" style={{ background: "#10b981" }} /> Privato <b>{nVerde}</b></span>
        </div>
      </div>

      {isLoading && <div className="text-center text-sm text-muted-foreground py-2">Carico la mappa…</div>}

      <div className="rounded-xl overflow-hidden border" style={{ height: "72vh" }}>
        <MapContainer center={MILANO} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {points.map((p) => (
            <Marker key={`${p.tipo}-${p.id}`} position={[p.lat, p.lng]} icon={p.tipo === "multiagenzia" ? ICON_GIALLO : ICON_VERDE}>
              <Popup>
                <div style={{ minWidth: 190 }}>
                  <div style={{ fontWeight: 600 }}>{p.indirizzo}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{[p.zona, fmtMoney(p.prezzo)].filter(Boolean).join(" · ")}</div>
                  {p.tipo === "multiagenzia" ? (
                    <>
                      <div style={{ fontSize: 12, marginTop: 6 }}>{p.num_agenzie || "?"} agenzie:</div>
                      <div style={{ fontSize: 12 }}>{agencyLinks(p)}</div>
                      {p.cliente_nome && <div style={{ fontSize: 12, color: "#059669", marginTop: 4 }}>🎯 {p.cliente_nome}</div>}
                    </>
                  ) : (
                    <>
                      {p.contatto_nome && (
                        <div style={{ fontSize: 12, marginTop: 6 }}>{p.contatto_nome}{p.contatto_telefono ? ` · ${p.contatto_telefono}` : ""}</div>
                      )}
                      {p.url && (
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                          <a href={p.url} target="_blank" rel="noopener" style={{ color: "#2563eb" }}>Annuncio →</a>
                        </div>
                      )}
                    </>
                  )}
                  <div style={{ marginTop: 8 }}>
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
    </div>
  );
}
