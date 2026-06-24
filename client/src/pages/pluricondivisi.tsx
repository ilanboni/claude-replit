import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, MessageCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
};

// Le colonne della pipeline (campo `stato`). Lo `scartato` resta fuori dal board.
const COLONNE = [
  { value: "proposto", label: "Da visurare" },
  { value: "proprietario_trovato", label: "Proprietario trovato" },
  { value: "bozza_pronta", label: "Bozza pronta" },
  { value: "contattato", label: "Contattato" },
  { value: "chiuso", label: "Chiuso" },
];

export default function Pluricondivisi() {
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery<Pluri[]>({
    queryKey: ["/api/pluricondivisi", { stato: "all" }],
    queryFn: async () => {
      const r = await fetch(`/api/pluricondivisi?stato=all`);
      if (!r.ok) throw new Error("fetch fail");
      return r.json();
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stato }: { id: number; stato: string }) => {
      await apiRequest("POST", `/api/pluricondivisi/${id}/stato-lista`, { stato });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pluricondivisi"] }),
    onError: (e: any) => toast({ title: "Errore", description: e?.message, variant: "destructive" }),
  });

  const filtered = data.filter((p) => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (
      (p.indirizzo || "").toLowerCase().includes(t) ||
      (p.zona || "").toLowerCase().includes(t) ||
      (p.short_id || "").toLowerCase().includes(t) ||
      `${p.proprietario_nome || ""} ${p.proprietario_cognome || ""}`.toLowerCase().includes(t)
    );
  });
  const byCol = (v: string) => filtered.filter((p) => (p.stato || "proposto") === v);

  return (
    <div className="space-y-3 p-3 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="page-pluricondivisi-title">🎯 Pluricondivisi</h1>
          <p className="hidden md:block text-muted-foreground text-sm">Pipeline acquisizione — porta ogni immobile avanti fino al mandato.</p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1" data-testid="count-pluricondivisi">{filtered.length}</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cerca per indirizzo, zona, ID, proprietario…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search-pluricondivisi"
        />
      </div>

      {isLoading && <div className="text-center text-sm text-muted-foreground py-8">Carico…</div>}

      {!isLoading && (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-3 px-3 md:-mx-6 md:px-6 scrollbar-none">
          {COLONNE.map((col) => {
            const items = byCol(col.value);
            return (
              <div key={col.value} className="shrink-0 w-[280px]">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-sm font-semibold">{col.label}</span>
                  <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-muted-foreground/20 rounded-lg">vuoto</div>
                  )}
                  {items.map((p) => (
                    <PluriKanbanCard key={p.id} p={p} onMove={(stato) => move.mutate({ id: p.id, stato })} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PluriKanbanCard({ p, onMove }: { p: Pluri; onMove: (stato: string) => void }) {
  const agenzie = (p.lista_agenzie || [])
    .map((a: any) => (typeof a === "string" ? a : a?.nome || "?"))
    .filter(Boolean);
  const tel = (p.proprietario_telefono || "").replace(/[^\d+]/g, "");

  return (
    <Card className={`p-2.5 border-l-2 ${p.score_priorita >= 60 ? "border-l-orange-500" : "border-l-transparent"}`} data-testid={`pluri-card-${p.short_id}`}>
      <div className="flex items-center gap-1.5 flex-wrap mb-1">
        <Badge variant="outline" className="text-[10px]">{p.num_agenzie} ag.</Badge>
        {p.score_priorita >= 60 && <span className="text-[10px] text-orange-500">🔥</span>}
        {p.giorni_sul_mercato ? <span className="text-[10px] text-muted-foreground">fermo {p.giorni_sul_mercato}gg</span> : null}
      </div>
      <Link href={`/pluricondivisi/${p.id}`} className="text-sm font-medium line-clamp-1 text-primary hover:underline block">{p.indirizzo}</Link>
      <div className="text-[11px] text-muted-foreground line-clamp-1">
        {p.zona ? `${p.zona} · ` : ""}{p.mq ? `${p.mq}mq · ` : ""}{fmtMoney(p.prezzo)}
      </div>
      {agenzie.length > 0 && <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{agenzie.slice(0, 3).join(" · ")}</div>}
      {tel && (
        <div className="flex gap-1 mt-1.5">
          <a href={`tel:${tel}`} className="inline-flex items-center gap-1 text-[11px] bg-primary/10 active:bg-primary/20 rounded px-1.5 py-0.5"><Phone className="w-3 h-3" /></a>
          <a href={`https://wa.me/${tel.replace(/^\+/, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[11px] bg-green-500/10 active:bg-green-500/20 rounded px-1.5 py-0.5"><MessageCircle className="w-3 h-3" />WA</a>
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-2">
        <Link href={`/pluricondivisi/${p.id}`} className="flex-1">
          <Button size="sm" className="w-full h-7 text-xs" data-testid={`btn-lavora-${p.short_id}`}>Lavora</Button>
        </Link>
        <select
          value={p.stato || "proposto"}
          onChange={(e) => onMove(e.target.value)}
          className="h-7 text-[11px] rounded border bg-background px-1 max-w-[96px]"
          title="Sposta nella pipeline"
          data-testid={`move-${p.short_id}`}
        >
          <option value="proposto">Da visurare</option>
          <option value="proprietario_trovato">Propr. trovato</option>
          <option value="bozza_pronta">Bozza pronta</option>
          <option value="contattato">Contattato</option>
          <option value="chiuso">Chiuso</option>
          <option value="scartato">Scarta</option>
        </select>
      </div>
    </Card>
  );
}

function fmtMoney(n?: number | null): string {
  if (!n) return "n/d";
  return `€${Math.round(n).toLocaleString("it-IT")}`;
}
