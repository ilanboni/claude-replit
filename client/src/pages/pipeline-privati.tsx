import { useQuery, useMutation } from "@tanstack/react-query";
import { Phone, MessageCircle, ExternalLink, MoreHorizontal, MapPin, Euro, Clock, TrendingUp, Inbox, Loader2, Home, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// ============================ TYPES =====================================

type Stallo = "verde" | "giallo" | "rosso";

interface PipelineCard {
  id: string;
  indirizzo: string | null;
  civico: string | null;
  zona: string | null;
  mq: number | null;
  locali: number | null;
  prezzo: number | null;
  scenario: number | null;
  url_casafari: string | null;
  mandato_status: string | null;
  destinatario_nome: string | null;
  destinatario_telefono: string | null;
  destinatario_email: string | null;
  outreach_id: string | null;
  outreach_stato: string | null;
  outreach_testo: string | null;
  outreach_inviato_at: string | null;
  outreach_risposto_at: string | null;
  risposta_testo: string | null;
  gg_in_colonna: number;
  stallo: Stallo;
}

interface PipelineData {
  colonne: Record<string, PipelineCard[]>;
  metrics: {
    mandati_mese: number;
    in_negoziazione: number;
    appuntamenti_aperti: number;
    risposte_da_gestire: number;
  };
}

// ============================ CONFIG ====================================

const COLONNE: Array<{ key: string; label: string; emoji: string; sottotitolo: string; spostabili: string[] }> = [
  { key: "target",       label: "Target",        emoji: "🎯", sottotitolo: "Da contattare",      spostabili: ["perso"] },
  { key: "bozza",        label: "Bozza pronta",  emoji: "📝", sottotitolo: "Da approvare",       spostabili: ["perso"] },
  { key: "inviato",      label: "Inviato",       emoji: "📤", sottotitolo: "In attesa",          spostabili: ["perso"] },
  { key: "risposto",     label: "Ha risposto",   emoji: "💬", sottotitolo: "Rispondi entro 20'", spostabili: ["appuntamento","negoziazione","perso"] },
  { key: "appuntamento", label: "Appuntamento",  emoji: "🏠", sottotitolo: "Visita programmata", spostabili: ["negoziazione","mandato","perso"] },
  { key: "negoziazione", label: "Negoziazione",  emoji: "🤝", sottotitolo: "Sta firmando",       spostabili: ["mandato","perso"] },
  { key: "mandato",      label: "Mandato",       emoji: "✅", sottotitolo: "Firmato!",            spostabili: [] },
];

// ============================ HELPERS ===================================

function fmtPrezzo(n: number | null) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("it-IT").format(n) + "€";
}

function fmtIndirizzo(c: PipelineCard) {
  const parts = [c.indirizzo, c.civico].filter(Boolean);
  return parts.join(" ") || "(indirizzo n/d)";
}

function ggLabel(gg: number) {
  if (gg === 0) return "oggi";
  if (gg === 1) return "1 giorno";
  return `${gg} giorni`;
}

function stalloColors(s: Stallo) {
  if (s === "rosso") return "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20";
  if (s === "giallo") return "border-l-4 border-l-amber-400 bg-amber-50 dark:bg-amber-950/20";
  return "border-l-4 border-l-green-500/40";
}

function normalizzaTel(t: string | null): string | null {
  if (!t) return null;
  const cleaned = t.replace(/\D/g, "");
  return cleaned.startsWith("39") ? cleaned : `39${cleaned}`;
}

// ============================ COMPONENTI ================================

function MetricCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: string }) {
  return (
    <Card className="flex-1 min-w-[180px]">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${accent || ""}`}>{value}</p>
        </div>
        <Icon className="w-8 h-8 text-muted-foreground/30" />
      </CardContent>
    </Card>
  );
}

function KanbanCard({ card, colonna, onMove, onMarcaPerso, onApprovaBozza, onScartaBozza }: {
  card: PipelineCard;
  colonna: typeof COLONNE[number];
  onMove: (id: string, nuova: string) => void;
  onMarcaPerso: (id: string) => void;
  onApprovaBozza: (outreachId: string) => void;
  onScartaBozza: (outreachId: string) => void;
}) {
  const tel = normalizzaTel(card.destinatario_telefono);
  const nome = card.destinatario_nome || "(nome n/d)";
  const indir = fmtIndirizzo(card);

  return (
    <Card className={`mb-2 hover-elevate transition-shadow ${stalloColors(card.stallo)}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate" title={nome}>{nome}</p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1" title={indir}>
              <MapPin className="w-3 h-3 shrink-0" /> {indir}
              {card.zona && <span className="text-muted-foreground/60">· {card.zona}</span>}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {colonna.spostabili.length > 0 && (
                <>
                  <DropdownMenuLabel>Sposta a</DropdownMenuLabel>
                  {colonna.spostabili.map((dest) => {
                    const target = COLONNE.find((c) => c.key === dest);
                    if (!target) return null;
                    return (
                      <DropdownMenuItem
                        key={dest}
                        onClick={() => dest === "perso" ? onMarcaPerso(card.id) : onMove(card.id, dest)}
                      >
                        <span className="mr-2">{target.emoji}</span> {target.label}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => onMove(card.id, "target")}>
                ↩ Riapri (Target)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-wrap gap-1 text-xs">
          {card.mq && <Badge variant="secondary" className="text-xs">{card.mq}mq</Badge>}
          {card.locali && <Badge variant="secondary" className="text-xs">{card.locali} loc</Badge>}
          {card.prezzo && (
            <Badge variant="secondary" className="text-xs flex items-center gap-0.5">
              <Euro className="w-2.5 h-2.5" /> {fmtPrezzo(card.prezzo).replace("€", "")}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-1">
          <Badge
            variant="outline"
            className={`text-xs flex items-center gap-1 ${
              card.stallo === "rosso" ? "text-red-700 border-red-300" :
              card.stallo === "giallo" ? "text-amber-700 border-amber-300" :
              "text-muted-foreground"
            }`}
          >
            <Clock className="w-3 h-3" /> {ggLabel(card.gg_in_colonna)}
          </Badge>
          <div className="flex gap-1">
            {colonna.key === "bozza" && card.outreach_id && (
              <>
                <Button
                  variant="default"
                  size="icon"
                  className="h-7 w-7 bg-green-600 hover:bg-green-700"
                  title="Approva e manda"
                  onClick={() => onApprovaBozza(card.outreach_id!)}
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  title="Scarta bozza"
                  onClick={() => onScartaBozza(card.outreach_id!)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {tel && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Chiama">
                <a href={`tel:+${tel}`}><Phone className="w-3.5 h-3.5" /></a>
              </Button>
            )}
            {tel && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="WhatsApp">
                <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer"><MessageCircle className="w-3.5 h-3.5" /></a>
              </Button>
            )}
            {card.url_casafari && (
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Apri su Casafari">
                <a href={card.url_casafari} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
              </Button>
            )}
          </div>
        </div>

        {card.risposta_testo && colonna.key === "risposto" && (
          <p className="text-xs italic text-muted-foreground border-t pt-2 line-clamp-2" title={card.risposta_testo}>
            "{card.risposta_testo}"
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ colonna, cards, onMove, onMarcaPerso, onApprovaBozza, onScartaBozza }: {
  colonna: typeof COLONNE[number];
  cards: PipelineCard[];
  onMove: (id: string, nuova: string) => void;
  onMarcaPerso: (id: string) => void;
  onApprovaBozza: (outreachId: string) => void;
  onScartaBozza: (outreachId: string) => void;
}) {
  const count = cards.length;
  return (
    <div className="flex flex-col w-72 shrink-0 bg-muted/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <span>{colonna.emoji}</span>
          <span>{colonna.label}</span>
          <Badge variant="secondary" className="ml-1">{count}</Badge>
        </h3>
      </div>
      <p className="text-xs text-muted-foreground px-1 mb-3">{colonna.sottotitolo}</p>
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-240px)] pr-1">
        {count === 0 ? (
          <p className="text-xs text-muted-foreground/60 text-center py-6">Vuota</p>
        ) : (
          cards.map((c) => (
            <KanbanCard key={c.id} card={c} colonna={colonna} onMove={onMove} onMarcaPerso={onMarcaPerso} onApprovaBozza={onApprovaBozza} onScartaBozza={onScartaBozza} />
          ))
        )}
      </div>
    </div>
  );
}

// ============================ PAGE ======================================

export default function PipelinePrivatiPage() {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<PipelineData>({
    queryKey: ["/api/pipeline/casafari-privati"],
    refetchInterval: 60000, // refetch ogni minuto
  });

  const spostaMutation = useMutation({
    mutationFn: async ({ id, nuova_colonna }: { id: string; nuova_colonna: string }) => {
      return apiRequest("PATCH", `/api/pipeline/casafari-privati/${id}/sposta`, { nuova_colonna });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/casafari-privati"] });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message || "Impossibile spostare", variant: "destructive" });
    },
  });

  const persoMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/pipeline/casafari-privati/${id}/marca-perso`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/casafari-privati"] });
      toast({ title: "Marcato come perso" });
    },
  });

  const approvaBozzaMutation = useMutation({
    mutationFn: async (outreachId: string) => {
      return apiRequest("POST", `/api/casafari-bozze/${outreachId}/approva`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/casafari-privati"] });
      queryClient.invalidateQueries({ queryKey: ["/api/casafari-bozze"] });
      toast({ title: "Bozza approvata", description: "Verra' inviata al prossimo run del sender." });
    },
    onError: (err: any) => {
      toast({ title: "Errore approvazione", description: err?.message || "Riprova", variant: "destructive" });
    },
  });

  const scartaBozzaMutation = useMutation({
    mutationFn: async (outreachId: string) => {
      return apiRequest("POST", `/api/casafari-bozze/${outreachId}/scarta`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pipeline/casafari-privati"] });
      queryClient.invalidateQueries({ queryKey: ["/api/casafari-bozze"] });
      toast({ title: "Bozza scartata" });
    },
  });

  const onMove = (id: string, nuova_colonna: string) => spostaMutation.mutate({ id, nuova_colonna });
  const onMarcaPerso = (id: string) => persoMutation.mutate(id);
  const onApprovaBozza = (outreachId: string) => approvaBozzaMutation.mutate(outreachId);
  const onScartaBozza = (outreachId: string) => scartaBozzaMutation.mutate(outreachId);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="flex gap-3 overflow-x-auto">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-96 w-72 shrink-0" />)}
        </div>
      </div>
    );
  }
  if (error || !data) {
    return <div className="p-6 text-destructive">Errore caricamento pipeline.</div>;
  }

  return (
    <div className="flex flex-col h-screen p-4 gap-4">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Home className="w-6 h-6" /> Pipeline Privati Casafari
        </h1>
        <div className="flex gap-3 flex-wrap">
          <MetricCard label="Mandati questo mese" value={data.metrics.mandati_mese} icon={TrendingUp} accent="text-green-600 dark:text-green-400" />
          <MetricCard label="In negoziazione" value={data.metrics.in_negoziazione} icon={Inbox} />
          <MetricCard label="Appuntamenti aperti" value={data.metrics.appuntamenti_aperti} icon={Home} />
          <MetricCard
            label="Risposte da gestire"
            value={data.metrics.risposte_da_gestire}
            icon={MessageCircle}
            accent={data.metrics.risposte_da_gestire > 0 ? "text-red-600 dark:text-red-400" : ""}
          />
        </div>
      </div>

      <div className="flex-1 flex gap-3 overflow-x-auto overflow-y-hidden">
        {COLONNE.map((c) => (
          <KanbanColumn
            key={c.key}
            colonna={c}
            cards={data.colonne[c.key] || []}
            onMove={onMove}
            onMarcaPerso={onMarcaPerso}
            onApprovaBozza={onApprovaBozza}
            onScartaBozza={onScartaBozza}
          />
        )