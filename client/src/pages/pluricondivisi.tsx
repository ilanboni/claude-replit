import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, Phone, MessageCircle, ExternalLink,
  Filter, ChevronRight, Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

type Pluri = {
  id: number;
  short_id: string;
  indirizzo: string;
  zona: string | null;
  mq: number | null;
  locali: number | null;
  prezzo: number | null;
  num_agenzie: number;
  lista_agenzie: Array<{ nome?: string } | string> | null;
  score_priorita: number;
  giorni_sul_mercato: number | null;
  stato: string;
  proprietario_nome: string | null;
  proprietario_cognome: string | null;
  proprietario_telefono: string | null;
  contattato_at: string | null;
  esito_finale: string | null;
  primo_visto: string;
  briefing_inviato_at: string | null;
};

const STATI = [
  { value: "aperti", label: "Aperti" },
  { value: "proposto", label: "Da visurare" },
  { value: "proprietario_trovato", label: "Proprietario trovato" },
  { value: "bozza_pronta", label: "Bozza pronta" },
  { value: "contattato", label: "Contattati" },
  { value: "chiuso", label: "Chiusi" },
  { value: "scartato", label: "Scartati" },
  { value: "all", label: "Tutti" },
];

export default function Pluricondivisi() {
  const [stato, setStato] = useState("aperti");
  const [search, setSearch] = useState("");
  const { data = [], isLoading } = useQuery<Pluri[]>({
    queryKey: ["/api/pluricondivisi", { stato }],
    queryFn: async () => {
      const r = await fetch(`/api/pluricondivisi?stato=${stato}`);
      if (!r.ok) throw new Error("fetch fail");
      return r.json();
    },
  });

  const filtered = data.filter(p => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (p.indirizzo || "").toLowerCase().includes(t)
      || (p.zona || "").toLowerCase().includes(t)
      || (p.short_id || "").toLowerCase().includes(t)
      || `${p.proprietario_nome || ""} ${p.proprietario_cognome || ""}`.toLowerCase().includes(t);
  });

  return (
    <div className="space-y-3 md:space-y-6 p-3 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="page-pluricondivisi-title">
            🎯 Pluricondivisi
          </h1>
          <p className="hidden md:block text-muted-foreground">Multi-agenzia trovati, focus per acquisizione</p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1" data-testid="count-pluricondivisi">
          {filtered.length}
        </Badge>
      </div>

      {/* Sticky filter + search */}
      <div className="sticky top-12 md:top-14 z-20 bg-background/95 backdrop-blur py-2 -mx-3 px-3 md:-mx-6 md:px-6 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per indirizzo, zona, ID, proprietario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-pluricondivisi"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
          {STATI.map(s => (
            <button
              key={s.value}
              onClick={() => setStato(s.value)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                stato === s.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-muted-foreground/30 hover:border-primary/50"
              }`}
              data-testid={`filter-${s.value}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground py-8">Carico…</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nessun pluricondiviso in questo stato.
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map(p => (
          <PluriCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

function PluriCard({ p }: { p: Pluri }) {
  const agenzie = (p.lista_agenzie || []).map((a: any) =>
    typeof a === "string" ? a : (a?.nome || "?")
  ).filter(Boolean);
  const proprietarioOk = !!p.proprietario_telefono;
  const tel = (p.proprietario_telefono || "").replace(/[^\d+]/g, "");

  return (
    <Card className="p-3" data-testid={`pluri-card-${p.short_id}`}>
      <div className="flex items-start gap-2">
        <Building2 className="w-5 h-5 mt-0.5 text-orange-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{p.short_id}</span>
            <StatoBadge stato={p.stato} />
            <Badge variant="outline" className="text-[10px]">{p.num_agenzie} agenzie</Badge>
            {p.score_priorita >= 60 && <span className="text-[10px] text-orange-500">🔥 priorità</span>}
          </div>
          <Link href={`/pluricondivisi/${p.id}`} className="text-sm font-medium mt-0.5 line-clamp-1 text-primary hover:underline block">{p.indirizzo}</Link>
          <div className="text-xs text-muted-foreground">
            {p.zona && `${p.zona} • `}
            {p.mq && `${p.mq}mq • `}
            {fmtMoney(p.prezzo)}
            {p.giorni_sul_mercato && ` • fermo ${p.giorni_sul_mercato}gg`}
          </div>
          {agenzie.length > 0 && (
            <div className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
              {agenzie.slice(0, 4).join(" · ")}
            </div>
          )}

          {proprietarioOk ? (
            <div className="mt-2 pt-2 border-t border-muted-foreground/10">
              <div className="text-xs text-foreground">
                <strong>{p.proprietario_nome} {p.proprietario_cognome}</strong>
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <a href={`tel:${tel}`} className="inline-flex items-center gap-1 text-xs bg-primary/10 active:bg-primary/20 rounded-md px-2 py-1">
                  <Phone className="w-3 h-3" />{tel}
                </a>
                <a href={`https://wa.me/${tel.replace(/^\+/, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs bg-green-500/10 active:bg-green-500/20 rounded-md px-2 py-1">
                  <MessageCircle className="w-3 h-3" />WhatsApp
                </a>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Telegram: <code>bozza {p.short_id}</code> per generare messaggio
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground mt-1.5 italic">
              Visura manca — Telegram: <code>proprietario {p.short_id} Nome Cognome +393…</code>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function StatoBadge({ stato }: { stato: string }) {
  const colors: Record<string, string> = {
    proposto: "bg-blue-500/15 text-blue-500",
    in_visura: "bg-amber-500/15 text-amber-500",
    proprietario_trovato: "bg-green-500/15 text-green-500",
    bozza_pronta: "bg-purple-500/15 text-purple-500",
    contattato: "bg-cyan-500/15 text-cyan-500",
    chiuso: "bg-muted text-muted-foreground",
    scartato: "bg-red-500/15 text-red-500",
  };
  const cls = colors[stato] || "bg-muted text-muted-foreground";
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${cls}`}>{stato}</span>;
}

function fmtMoney(n?: number | null): string {
  if (!n) return "n/d";
  return `€${Math.round(n).toLocaleString("it-IT")}`;
}
