import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Calendar,
  TrendingUp,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Mail,
  Plus,
  ListTodo,
  Check,
  X,
  Trash2,
  Bell,
  Flame,
  Target,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Immobile, Appuntamento, Matching, WhatsappConversation, Task } from "@shared/schema";

interface TrendData {
  nome: string;
  clienti: number;
  richieste: number;
  immobili: number;
  appuntamenti: number;
}

interface DashboardStats {
  clientiTotali: number;
  clientiNuovi: number;
  immobiliTotali: number;
  richiesteTotali: number;
  appuntamentiOggi: number;
}

interface TaskIlan {
  short_id: string;
  tipo: string | null;
  descrizione: string;
  nome_riferimento: string | null;
  telefono: string | null;
  scheduled_at: string | null;
  priorita: number | null;
  origine: string | null;
  stato: string;
  fatto_at: string | null;
}

interface CavourDashboard {
  kpi: {
    lead_aperti?: number;
    lead_nuovi_7gg?: number;
    outreach_inviati_7gg?: number;
    outreach_risposti_7gg?: number;
    appuntamenti_prossimi_7gg?: number;
    clienti_attivi?: number;
    bozze_pending?: number;
  };
  cards: {
    prossimi_appuntamenti: Array<{ appuntamento_id: number; cliente_id?: number; cliente_nome: string; telefono?: string; data_ora?: string; note?: string }>;
    lead_caldi: Array<{ id: string; nome?: string; cognome?: string; telefono?: string; score?: number; stato?: string; info_chiave?: string }>;
    richieste_no_casafari: Array<{ cliente_id?: number; cliente_nome: string; richiesta_id: number; creata_da_giorni?: number }>;
  };
  generato_at: string;
}

const FRASI = [
  "Una cosa alla volta. Comincia dalla più importante e il resto viene da sé.",
  "I clienti scelgono chi risponde per primo. Oggi sii tu.",
  "Ordine fuori, lucidità dentro. Spunta il primo e prendi il ritmo.",
  "Il lavoro di oggi è la provvigione di domani.",
  "Piccoli passi costanti battono i grandi slanci saltuari.",
  "Chiudi i promemoria aperti: la mente libera vende meglio.",
  "Ogni chiamata fatta è un mattone. Costruisci.",
];

function isToday(d: Date | string | null | undefined): boolean {
  if (!d) return false;
  const date = new Date(d);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function oreOra(d: Date | string): string {
  return new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
}

// ─────────────────────────────────────────────────────────────
// HERO — saluto, numeri veri, focus del giorno, slancio
// ─────────────────────────────────────────────────────────────
function MotivationHero({
  appuntamentiOggi,
  promemoriaAperti,
  leadCaldi,
  chiusiOggi,
  focus,
  loading,
}: {
  appuntamentiOggi: number;
  promemoriaAperti: number;
  leadCaldi: number;
  chiusiOggi: number;
  focus: string | null;
  loading?: boolean;
}) {
  const oggi = new Date();
  const ore = oggi.getHours();
  const saluto = ore < 13 ? "Buongiorno" : ore < 18 ? "Buon pomeriggio" : "Buonasera";
  const dataStr = oggi.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const dayIdx = Math.floor((Date.now() - new Date(oggi.getFullYear(), 0, 0).getTime()) / 86400000);
  const frase = FRASI[dayIdx % FRASI.length];
  const totaleSlancio = chiusiOggi + promemoriaAperti;
  const pct = totaleSlancio > 0 ? Math.round((chiusiOggi / totaleSlancio) * 100) : (chiusiOggi > 0 ? 100 : 0);

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">{saluto}, Ilan</h1>
            <p className="text-sm text-muted-foreground capitalize">{dataStr}</p>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{loading ? "…" : appuntamentiOggi}</p>
              <p className="text-xs text-muted-foreground">appuntamenti</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{loading ? "…" : promemoriaAperti}</p>
              <p className="text-xs text-muted-foreground">promemoria</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{loading ? "…" : leadCaldi}</p>
              <p className="text-xs text-muted-foreground">lead caldi</p>
            </div>
          </div>
        </div>

        {focus && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-background/70 p-3">
            <Target className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm"><span className="text-muted-foreground">Focus di oggi: </span>{focus}</p>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-background/70">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {chiusiOggi > 0 ? `${chiusiOggi} chiusi oggi` : "nessuno chiuso ancora"}
          </p>
        </div>
        <p className="mt-3 text-sm italic text-foreground/80">"{frase}"</p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// LA TUA GIORNATA — agenda di oggi (appuntamenti + task con scadenza oggi)
// ─────────────────────────────────────────────────────────────
function GiornataOggiCard({
  appuntamentiOggi,
  tasksOggi,
  loading,
}: {
  appuntamentiOggi: CavourDashboard["cards"]["prossimi_appuntamenti"];
  tasksOggi: Task[];
  loading?: boolean;
}) {
  const items = [
    ...appuntamentiOggi.map((a) => ({
      key: `app-${a.appuntamento_id}`,
      ora: a.data_ora ? oreOra(a.data_ora) : "--:--",
      titolo: a.cliente_nome || "Appuntamento",
      sub: a.note || "",
      tipo: "appuntamento" as const,
      clienteId: a.cliente_id,
      sortKey: a.data_ora ? new Date(a.data_ora).getTime() : 0,
    })),
    ...tasksOggi.map((t) => ({
      key: `task-${t.id}`,
      ora: t.scadenza ? oreOra(t.scadenza) : "",
      titolo: t.titolo,
      sub: "",
      tipo: "task" as const,
      clienteId: undefined as number | undefined,
      sortKey: t.scadenza ? new Date(t.scadenza).getTime() : 0,
    })),
  ].sort((a, b) => a.sortKey - b.sortKey);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          La tua giornata
        </CardTitle>
        <Link href="/appuntamenti">
          <Button variant="ghost" size="sm">Agenda</Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          [1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Niente in agenda oggi</p>
            <p className="text-xs text-muted-foreground mt-1">Buon momento per ricontattare un lead caldo.</p>
          </div>
        ) : (
          items.map((it) => (
            <div key={it.key} className="flex items-center gap-3 rounded-md border p-3">
              <div className="min-w-[52px] text-center">
                <p className="text-sm font-semibold tabular-nums">{it.ora || "—"}</p>
                <p className="text-[10px] uppercase text-muted-foreground">{it.tipo === "task" ? "task" : "visita"}</p>
              </div>
              <div className="flex-1 min-w-0">
                {it.clienteId ? (
                  <Link href={`/clienti/${it.clienteId}`}>
                    <p className="text-sm font-medium truncate hover:underline cursor-pointer">{it.titolo}</p>
                  </Link>
                ) : (
                  <p className="text-sm font-medium truncate">{it.titolo}</p>
                )}
                {it.sub && <p className="text-xs text-muted-foreground truncate">{it.sub}</p>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// PROMEMORIA DI PAOLO — tasks_ilan con Fatto / Rinvia / Scarta
// ─────────────────────────────────────────────────────────────
function PromemoriaPaoloCard({ promemoria, loading }: { promemoria: TaskIlan[]; loading?: boolean }) {
  const { toast } = useToast();

  const azione = useMutation({
    mutationFn: async ({ shortId, action, rinvia_giorni }: { shortId: string; action: string; rinvia_giorni?: number }) => {
      return apiRequest("POST", `/api/decisione/task/${shortId}`, { action, rinvia_giorni });
    },
    onSuccess: (_r, vars) => {
      const msg = vars.action === "fatto" ? "Promemoria chiuso" : vars.action === "rinvia" ? "Rinviato" : "Scartato";
      toast({ title: msg });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks-ilan?stato=attivo"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks-ilan?stato=fatto"] });
    },
    onError: () => toast({ title: "Errore", description: "Riprova", variant: "destructive" }),
  });

  const scadenzaInfo = (d: string | null) => {
    if (!d) return null;
    const diff = Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
    if (diff < 0) return { text: "scaduto", cls: "text-red-600" };
    if (diff === 0) return { text: "oggi", cls: "text-amber-600" };
    if (diff === 1) return { text: "domani", cls: "text-amber-600" };
    return { text: new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short" }), cls: "text-muted-foreground" };
  };

  return (
    <Card className="border-primary/40">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Promemoria di Paolo
          {promemoria.length > 0 && (
            <Badge variant="secondary" className="ml-1">{promemoria.length} aperti</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : promemoria.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nessun promemoria aperto</p>
            <p className="text-xs text-muted-foreground mt-1">Chiedi a Paolo di ricordarti qualcosa e comparirà qui.</p>
          </div>
        ) : (
          promemoria.map((p) => {
            const sc = scadenzaInfo(p.scheduled_at);
            const busy = azione.isPending && azione.variables?.shortId === p.short_id;
            return (
              <div key={p.short_id} className="flex items-center gap-2 rounded-md border p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{p.descrizione}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {sc && <span className={`text-xs ${sc.cls}`}>{sc.text}</span>}
                    {p.nome_riferimento && <span className="text-xs text-muted-foreground truncate">· {p.nome_riferimento}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" disabled={busy} className="h-8"
                  onClick={() => azione.mutate({ shortId: p.short_id, action: "fatto" })}
                  data-testid={`button-promemoria-fatto-${p.short_id}`}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Fatto
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} className="h-8"
                  onClick={() => azione.mutate({ shortId: p.short_id, action: "rinvia", rinvia_giorni: 3 })}
                  data-testid={`button-promemoria-rinvia-${p.short_id}`}>
                  <Clock className="h-3.5 w-3.5 mr-1" /> +3g
                </Button>
                <Button size="icon" variant="ghost" disabled={busy} className="h-8 w-8 text-muted-foreground"
                  onClick={() => azione.mutate({ shortId: p.short_id, action: "scarta" })}
                  aria-label="Scarta" data-testid={`button-promemoria-scarta-${p.short_id}`}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// PRIORITÀ — lead caldi, bozze da approvare, ricerche senza Casafari
// ─────────────────────────────────────────────────────────────
function PrioritaGrid({ cavour, loading }: { cavour?: CavourDashboard; loading?: boolean }) {
  const leadCaldi = cavour?.cards?.lead_caldi ?? [];
  const bozze = cavour?.kpi?.bozze_pending ?? 0;
  const noCasafari = cavour?.cards?.richieste_no_casafari ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="h-4 w-4 text-red-500" /> Lead caldi da sentire
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : leadCaldi.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nessun lead caldo aperto.</p>
          ) : (
            <ul className="space-y-2">
              {leadCaldi.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 border-b last:border-b-0 pb-1.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-medium truncate block">{`${l.nome || ""} ${l.cognome || ""}`.trim() || l.telefono || "?"}</span>
                    {l.info_chiave && <span className="text-xs text-muted-foreground truncate block">{l.info_chiave}</span>}
                  </div>
                  {l.score !== undefined && <Badge variant="secondary">{l.score}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Bozze da approvare
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <div>
              <p className="text-3xl font-bold">{bozze}</p>
              {bozze > 0 ? (
                <Link href="/whatsapp">
                  <Button variant="ghost" size="sm" className="mt-1 px-0 text-primary">
                    Rivedi e invia <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Tutto approvato, ottimo.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" /> Ricerche senza Casafari
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : noCasafari.length === 0 ? (
            <p className="text-xs text-muted-foreground">Tutte le ricerche hanno il link ✓</p>
          ) : (
            <ul className="space-y-2">
              {noCasafari.slice(0, 5).map((c) => (
                <li key={c.richiesta_id} className="flex items-center justify-between gap-2 border-b last:border-b-0 pb-1.5 text-sm">
                  <Link href={c.cliente_id ? `/clienti/${c.cliente_id}` : "#"} className="font-medium hover:underline truncate">
                    {c.cliente_nome || "?"}
                  </Link>
                  {c.creata_da_giorni !== undefined && (
                    <span className="text-xs text-amber-600 whitespace-nowrap">{c.creata_da_giorni}gg</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// OPPORTUNITÀ — matching immobile ↔ cliente
// ─────────────────────────────────────────────────────────────
function MatchingCard({ matching, loading }: { matching: (Matching & { immobile?: Immobile })[]; loading?: boolean }) {
  const suggerimenti = matching.filter((m) => !m.proposto && (m.punteggio ?? 0) >= 60).slice(0, 5);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> Opportunità da proporre
        </CardTitle>
        <Link href="/matching">
          <Button variant="ghost" size="sm">Vedi tutto</Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)
        ) : suggerimenti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nessun match pronto</p>
          </div>
        ) : (
          suggerimenti.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${(m.punteggio ?? 0) >= 80 ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                {m.punteggio}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.immobile?.titolo || `Immobile #${m.immobileId}`}</p>
                <p className="text-xs text-muted-foreground truncate">Per richiesta #{m.richiestaId}</p>
              </div>
              <Link href={`/matching/${m.id}`}>
                <Button size="sm" variant="outline">Dettagli</Button>
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// COMUNICAZIONI — WhatsApp
// ─────────────────────────────────────────────────────────────
function ComunicazioniCard({ conversations, loading }: { conversations: WhatsappConversation[]; loading?: boolean }) {
  const totalUnread = conversations.reduce((s, c) => s + (c.nonLetti || 0), 0);
  const recenti = conversations.slice(0, 5);
  const initials = (name: string) => {
    const parts = (name || "").split(" ");
    return parts.length >= 2 ? parts[0][0] + parts[1][0] : (name || "?").substring(0, 2);
  };
  const colors = ["bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" /> Chat WhatsApp
          {totalUnread > 0 && <Badge variant="destructive" className="ml-1">{totalUnread}</Badge>}
        </CardTitle>
        <Link href="/whatsapp">
          <Button variant="ghost" size="sm">Apri</Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : recenti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nessuna conversazione</p>
          </div>
        ) : (
          recenti.map((conv) => (
            <Link key={conv.id} href="/whatsapp">
              <div className="flex items-center gap-3 rounded-md p-2 hover-elevate cursor-pointer">
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-white text-sm font-medium ${colors[conv.id % colors.length]}`}>
                  {initials(conv.nome || conv.phoneNumber)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${(conv.nonLetti ?? 0) > 0 ? "font-semibold" : "font-medium"}`}>{conv.nome || conv.phoneNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{conv.phoneNumber}</p>
                </div>
                {(conv.nonLetti ?? 0) > 0 && (
                  <Badge variant="default" className="bg-green-500 text-white min-w-[20px] h-5 flex items-center justify-center">{conv.nonLetti}</Badge>
                )}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// I MIEI TASK — task personali con aggiunta rapida
// ─────────────────────────────────────────────────────────────
function TasksCard({ tasks, loading }: { tasks: Task[]; loading?: boolean }) {
  const { toast } = useToast();
  const [showNew, setShowNew] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [scadenza, setScadenza] = useState("");

  const createTask = useMutation({
    mutationFn: async (data: { titolo: string; scadenza?: string }) => apiRequest("POST", "/api/tasks", data),
    onSuccess: () => {
      toast({ title: "Task creato" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowNew(false); setTitolo(""); setScadenza("");
    },
  });
  const completeTask = useMutation({
    mutationFn: async (id: number) => apiRequest("PATCH", `/api/tasks/${id}`, { stato: "completato" }),
    onSuccess: () => { toast({ title: "Task completato" }); queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); },
  });
  const deleteTask = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/tasks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tasks"] }); },
  });

  const daFare = tasks.filter((t) => t.stato === "da_fare").slice(0, 6);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" /> I miei task
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setShowNew(true)}><Plus className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {showNew && (
          <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30">
            <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Cosa devi fare?" autoFocus />
            <div className="flex gap-2">
              <Input type="datetime-local" value={scadenza} onChange={(e) => setScadenza(e.target.value)} className="flex-1" />
              <Button size="icon" variant="ghost" onClick={() => { setShowNew(false); setTitolo(""); setScadenza(""); }}><X className="h-4 w-4" /></Button>
              <Button size="icon" disabled={!titolo.trim() || createTask.isPending}
                onClick={() => createTask.mutate({ titolo, scadenza: scadenza ? new Date(scadenza).toISOString() : undefined })}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        {loading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : daFare.length === 0 && !showNew ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Nessun task in sospeso</p>
          </div>
        ) : (
          daFare.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-md border p-3 group">
              <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full border" onClick={() => completeTask.mutate(t.id)}>
                <Check className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              </Button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.titolo}</p>
                {t.scadenza && <p className="text-xs text-muted-foreground">{new Date(t.scadenza).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}</p>}
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteTask.mutate(t.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// NUMERI — KPI settimana + trend
// ─────────────────────────────────────────────────────────────
function NumeriCard({ cavour }: { cavour?: CavourDashboard }) {
  const { data: trends = [] } = useQuery<TrendData[]>({ queryKey: ["/api/dashboard/trends"] });
  const kpi = cavour?.kpi ?? {};
  const cells = [
    { label: "Lead aperti", value: kpi.lead_aperti },
    { label: "Nuovi 7gg", value: kpi.lead_nuovi_7gg },
    { label: "Appunt. 7gg", value: kpi.appuntamenti_prossimi_7gg },
    { label: "Outreach 7gg", value: kpi.outreach_inviati_7gg },
    { label: "Risposti 7gg", value: kpi.outreach_risposti_7gg },
    { label: "Clienti attivi", value: kpi.clienti_attivi },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" /> I numeri della settimana
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {cells.map((c) => (
            <div key={c.label} className="rounded-md bg-muted/40 p-3">
              <p className="text-2xl font-semibold tabular-nums">{c.value ?? 0}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </div>
          ))}
        </div>
        {trends.length > 0 && (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="nome" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }} />
                <Bar dataKey="clienti" name="Clienti" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="richieste" name="Richieste" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="appuntamenti" name="Appuntamenti" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isLoading: statsLoading } = useQuery<DashboardStats>({ queryKey: ["/api/dashboard/stats"] });
  const { data: appuntamenti = [] } = useQuery<Appuntamento[]>({ queryKey: ["/api/appuntamenti"] });
  const { data: matching = [], isLoading: matchingLoading } = useQuery<Matching[]>({ queryKey: ["/api/matching"] });
  const { data: whatsappConversations = [], isLoading: whatsappLoading } = useQuery<WhatsappConversation[]>({ queryKey: ["/api/whatsapp/conversations"] });
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({ queryKey: ["/api/tasks"] });

  const { data: promemoria = [], isLoading: promemoriaLoading } = useQuery<TaskIlan[]>({
    queryKey: ["/api/tasks-ilan?stato=attivo"],
    refetchInterval: 60_000,
  });
  const { data: promemoriaFatti = [] } = useQuery<TaskIlan[]>({ queryKey: ["/api/tasks-ilan?stato=fatto"] });

  const { data: cavour, isLoading: cavourLoading } = useQuery<CavourDashboard>({
    queryKey: ["/api/cavour/dashboard"],
    refetchInterval: 60_000,
  });

  const appuntamentiOggiCards = (cavour?.cards?.prossimi_appuntamenti ?? []).filter((a) => isToday(a.data_ora));
  const tasksOggi = tasks.filter((t) => t.stato === "da_fare" && isToday(t.scadenza));
  const chiusiOggi = promemoriaFatti.filter((p) => isToday(p.fatto_at)).length;

  const appuntamentiOggiCount = appuntamentiOggiCards.length || appuntamenti.filter((a) => isToday(a.dataOra) && !a.completato).length;
  const leadCaldiCount = cavour?.cards?.lead_caldi?.length ?? 0;

  // Focus del giorno: promemoria scaduto/oggi > primo appuntamento di oggi > lead caldo top
  let focus: string | null = null;
  const promScaduto = promemoria.find((p) => p.scheduled_at && new Date(p.scheduled_at).getTime() <= Date.now());
  if (promScaduto) focus = promScaduto.descrizione;
  else if (appuntamentiOggiCards[0]) focus = `${appuntamentiOggiCards[0].cliente_nome}${appuntamentiOggiCards[0].data_ora ? ` alle ${oreOra(appuntamentiOggiCards[0].data_ora)}` : ""}`;
  else if (cavour?.cards?.lead_caldi?.[0]) {
    const l = cavour.cards.lead_caldi[0];
    focus = `ricontatta ${`${l.nome || ""} ${l.cognome || ""}`.trim() || l.telefono || "il lead più caldo"}`;
  }

  return (
    <div className="space-y-6 p-6">
      <MotivationHero
        appuntamentiOggi={appuntamentiOggiCount}
        promemoriaAperti={promemoria.length}
        leadCaldi={leadCaldiCount}
        chiusiOggi={chiusiOggi}
        focus={focus}
        loading={cavourLoading || statsLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GiornataOggiCard appuntamentiOggi={appuntamentiOggiCards} tasksOggi={tasksOggi} loading={cavourLoading} />
        <PromemoriaPaoloCard promemoria={promemoria} loading={promemoriaLoading} />
      </div>

      <PrioritaGrid cavour={cavour} loading={cavourLoading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <MatchingCard matching={matching} loading={matchingLoading} />
        <ComunicazioniCard conversations={whatsappConversations} loading={whatsappLoading} />
      </div>

      <TasksCard tasks={tasks} loading={tasksLoading} />

      <NumeriCard cavour={cavour} />
    </div>
  );
}
