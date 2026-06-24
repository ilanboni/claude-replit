import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Phone, MessageCircle, Search, Target, MapPin, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Pluri = {
  id: number;
  short_id: string;
  indirizzo: string;
  zona: string | null;
  mq: number | null;
  prezzo: number | null;
  num_agenzie: number;
  lista_agenzie: Array<{ nome?: string } | string> | null;
  score_priorita: number;
  giorni_sul_mercato: number | null;
  stato: string;
  proprietario_nome: string | null;
  proprietario_cognome: string | null;
  proprietario_telefono: string | null;
  cliente_target_id: number | null;
  cliente_nome: string | null;
};

type Vista = "priorita" | "zona";

function priorita(p: Pluri): number {
  return (p.cliente_nome ? 1000 : 0) + (p.num_agenzie || 0) * 10 + Math.min(p.giorni_sul_mercato || 0, 90) / 6;
}
function fmtMoney(n?: number | null): string {
  if (!n) return "";
  return `€${Math.round(n).toLocaleString("it-IT")}`;
}

export default function Pluricondivisi() {
  const [search, setSearch] = useState("");
  const [vista, setVista] = useState<Vista>("priorita");
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery<Pluri[]>({
    queryKey: ["/api/pluricondivisi", { stato: "aperti" }],
    queryFn: async () => {
      const r = await fetch(`/api/pluricondivisi?stato=aperti`);
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
  const onMove = (id: number, stato: string) => move.mutate({ id, stato });

  const filtered = useMemo(() => {
    const base = data.filter((p) => {
      if (!search.trim()) return true;
      const t = search.toLowerCase();
      return (
        (p.indirizzo || "").toLowerCase().includes(t) ||
        (p.zona || "").toLowerCase().includes(t) ||
        (p.cliente_nome || "").toLowerCase().includes(t) ||
        `${p.proprietario_nome || ""} ${p.proprietario_cognome || ""}`.toLowerCase().includes(t)
      );
    });
    return base.sort((a, b) => priorita(b) - priorita(a));
  }, [data, search]);

  const conCompratore = filtered.filter((p) => p.cliente_nome);
  const senzaCompratore = filtered.filter((p) => !p.cliente_nome);

  const perZona = useMemo(() => {
    const map = new Map<string, Pluri[]>();
    for (const p of filtered) {
      const z = (p.zona || "Zona n/d").trim();
      if (!map.has(z)) map.set(z, []);
      map.get(z)!.push(p);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  return (
    <div className="space-y-4 p-3 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="page-pluricondivisi-title">🎯 Multiagenzia</h1>
          <p className="text-sm text-muted-foreground">Parti dall'alto: prima quelli dove hai già un compratore.</p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1 shrink-0" data-testid="count-pluricondivisi">{filtered.length}</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cerca indirizzo, zona, cliente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search-pluricondivisi"
        />
      </div>

      {/* Segmented: Priorità / Per zona */}
      <div className="inline-flex rounded-lg border p-0.5 bg-muted/40">
        {([["priorita", "Priorità"], ["zona", "Per zona"]] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`text-sm px-3 py-1.5 rounded-md transition ${vista === v ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            data-testid={`vista-${v}`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && <div className="text-center text-sm text-muted-foreground py-10">Carico…</div>}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nessun multiagenzia da lavorare.</Card>
      )}

      {!isLoading && filtered.length > 0 && vista === "priorita" && (
        <div className="space-y-5">
          {conCompratore.length > 0 && (
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <Target className="w-4 h-4" /> Hai già chi lo comprerebbe
                <span className="text-muted-foreground font-normal">· {conCompratore.length}</span>
              </div>
              {conCompratore.map((p) => <PluriCard key={p.id} p={p} onMove={onMove} />)}
            </section>
          )}
          {senzaCompratore.length > 0 && (
            <section className="space-y-2">
              {conCompratore.length > 0 && (
                <div className="text-sm font-semibold text-muted-foreground">Altri da lavorare · {senzaCompratore.length}</div>
              )}
              {senzaCompratore.map((p) => <PluriCard key={p.id} p={p} onMove={onMove} />)}
            </section>
          )}
        </div>
      )}

      {!isLoading && filtered.length > 0 && vista === "zona" && (
        <div className="space-y-5">
          {perZona.map(([zona, items]) => (
            <section key={zona} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="w-4 h-4 text-orange-400" /> {zona}
                <span className="text-muted-foreground font-normal">· {items.length}</span>
              </div>
              {items.map((p) => <PluriCard key={p.id} p={p} onMove={onMove} />)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function PluriCard({ p, onMove }: { p: Pluri; onMove: (id: number, stato: string) => void }) {
  const agenzie = (p.lista_agenzie || [])
    .map((a: any) => (typeof a === "string" ? a : a?.nome || "?"))
    .filter(Boolean);
  const tel = (p.proprietario_telefono || "").replace(/[^\d+]/g, "");
  const hasBuyer = !!p.cliente_nome;
  const accent = hasBuyer ? "border-l-emerald-500" : p.num_agenzie >= 3 ? "border-l-orange-400" : "border-l-muted-foreground/20";

  return (
    <Card className={`p-3 border-l-4 ${accent}`} data-testid={`pluri-card-${p.short_id}`}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/pluricondivisi/${p.id}`} className="font-medium text-primary hover:underline line-clamp-1 min-w-0">
          {p.indirizzo}
        </Link>
        <span className="text-[11px] text-muted-foreground font-mono shrink-0">{p.short_id}</span>
      </div>

      {/* chip riga: segnali */}
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        <Badge variant="outline" className="text-[10px]">{p.num_agenzie} agenzie</Badge>
        {p.prezzo ? <span className="text-[11px] text-muted-foreground">{fmtMoney(p.prezzo)}</span> : null}
        {p.mq ? <span className="text-[11px] text-muted-foreground">· {p.mq}mq</span> : null}
        {p.zona ? <span className="text-[11px] text-muted-foreground">· {p.zona}</span> : null}
        {p.giorni_sul_mercato && p.giorni_sul_mercato > 0 ? (
          <span className="text-[11px] text-muted-foreground">· fermo {p.giorni_sul_mercato}gg</span>
        ) : null}
      </div>

      {hasBuyer && (
        <div className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-emerald-600 font-medium">
          <Target className="w-3.5 h-3.5" /> {p.cliente_nome}
        </div>
      )}

      {/* proprietario */}
      <div className="mt-2">
        {tel ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{[p.proprietario_nome, p.proprietario_cognome].filter(Boolean).join(" ") || "Proprietario"}:</span>
            <a href={`tel:${tel}`} className="inline-flex items-center gap-1 text-[11px] bg-primary/10 active:bg-primary/20 rounded px-1.5 py-0.5"><Phone className="w-3 h-3" />{tel}</a>
            <a href={`https://wa.me/${tel.replace(/^\+/, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-[11px] bg-green-500/10 active:bg-green-500/20 rounded px-1.5 py-0.5"><MessageCircle className="w-3 h-3" />WA</a>
          </div>
        ) : (
          <div className="text-[11px] text-amber-600/90">Proprietario da trovare — vai sul campo (citofono/portineria).</div>
        )}
      </div>

      {/* azioni */}
      <div className="flex items-center gap-1.5 mt-2.5">
        <Link href={`/pluricondivisi/${p.id}`} className="flex-1">
          <Button size="sm" className="w-full h-8 text-xs" data-testid={`btn-lavora-${p.short_id}`}>
            Lavora <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </Link>
        <select
          value={p.stato || "proposto"}
          onChange={(e) => onMove(p.id, e.target.value)}
          className="h-8 text-[11px] rounded-md border bg-background px-1.5 max-w-[120px]"
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
