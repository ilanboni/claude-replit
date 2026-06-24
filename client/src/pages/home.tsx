import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { fmtTel } from "@/lib/format";
import {
  Flame, Target, Calendar, BarChart3,
  Phone, MessageCircle, ChevronRight, Clock,
  AlertTriangle, ExternalLink, Building2,
  Check, X, CalendarPlus, ListChecks, Mail,
} from "lucide-react";

/**
 * Home "OGGI" — schermata di lavoro del giorno, in 4 blocchi nell'ordine di priorità:
 *   1) Appuntamenti di oggi   2) Cose da fare   3) Messaggi da gestire   4) Clienti caldi & opportunità
 * Dati: GET /api/home/oggi (endpoint unico, query parallele backend).
 */
type HomeOggi = {
  ora: string;
  pausa_until: string | null;
  decisioni: {
    bozze_crm: Array<{ id: string; nome: string; telefono: string; body_in: string; bozza: string }>;
    drip: Array<{ id: string; nome_lead: string; messaggio: string; origine: string }>;
    outreach_approval: Array<{ id: string; destinatario_nome: string; destinatario_telefono: string; tipo: string; motivo_approvazione: string; testo_proposto?: string; indirizzo?: string; zona?: string; listing_url?: string; immobile_esterno_id?: number | null; target_immobile_id?: string | null }>;
    tasks_ilan: Array<{ short_id: string; tipo: string; descrizione: string; nome_riferimento: string; telefono: string; priorita: number; cliente_id?: number | null; lead_id?: number | null; immobile_id?: number | null; immobile_esterno_id?: number | null; pluricondiviso_id?: number | null }>;
  };
  opportunita: {
    pluricondivisi: Array<{ id: number; short_id: string; indirizzo: string; zona: string; mq: number; prezzo: number; num_agenzie: number; giorni_sul_mercato: number; lista_agenzie: Array<{ nome: string }> }>;
    match_clienti: Array<{ cliente_id: number; indirizzo: string; prezzo: number; mq: number; advertiser: string; telefono: string; zona: string; listing_url: string }>;
    lead_caldi: Array<{ id: number; nome: string; cognome: string; telefono: string; score: number; info_chiave: string }>;
  };
  oggi: {
    appuntamenti: Array<{ id: number; data_ora: string; luogo: string; tipo: string; note: string; cliente_id: number | null; completato: boolean }>;
  };
  recap: { outreach_ieri: number; risposte_ieri: number; risposte_positive_ieri: number; lead_ieri: number };
};

function taskHref(t: { cliente_id?: number | null; immobile_esterno_id?: number | null; pluricondiviso_id?: number | null; immobile_id?: number | null }): string | null {
  if (t.cliente_id) return `/clienti/${t.cliente_id}`;
  if (t.immobile_esterno_id) return `/acquisizione/${t.immobile_esterno_id}`;
  if (t.pluricondiviso_id) return `/pluricondivisi/${t.pluricondiviso_id}`;
  if (t.immobile_id) return `/immobili/${t.immobile_id}`;
  return null;
}

const TIPO_LABEL: Record<string, string> = {
  proponi_immobili: "Proponi immobili",
  richiama: "Richiama",
  ricerca_cliente: "Ricerca acquisizione",
  risposta_proprietario: "Rispondi al proprietario",
};
/** Titolo breve e umano per una card: per i tipi "rumorosi" usa tipo+nome, altrimenti accorcia la descrizione. */
function taskTitolo(t: { tipo?: string; nome_riferimento?: string | null; descrizione?: string }): string {
  const lab = t.tipo ? TIPO_LABEL[t.tipo] : undefined;
  const nome = (t.nome_riferimento || "").trim();
  if (lab) return nome ? `${lab} · ${nome}` : lab;
  const d = (t.descrizione || "").replace(/\s+/g, " ").trim();
  return d.length > 64 ? d.slice(0, 62).trim() + "…" : d;
}

const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/home/oggi"] });

export default function Home() {
  const { data, isLoading } = useQuery<HomeOggi>({
    queryKey: ["/api/home/oggi"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 max-w-3xl mx-auto space-y-6">
      <Header pausaUntil={data?.pausa_until} />

      {isLoading && (
        <Card className="p-4 text-sm text-muted-foreground text-center bg-muted/20">Carico…</Card>
      )}

      {!isLoading && data && (
        <>
          <SectionAppuntamenti data={data.oggi} />
          <SectionCoseDaFare tasks={data.decisioni.tasks_ilan} />
          <SectionMessaggi data={data.decisioni} />
          <SectionClientiCaldi data={data.opportunita} />
          <SectionRecap recap={data.recap} />
        </>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Aggiornato ogni minuto · le sezioni vuote restano chiuse.
      </p>
    </div>
  );
}

function Header({ pausaUntil }: { pausaUntil?: string | null }) {
  const oraSaluto = (() => {
    const ora = new Date().getHours();
    if (ora < 13) return "Buongiorno";
    if (ora < 20) return "Buon pomeriggio";
    return "Buonasera";
  })();
  const oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="home-title">{oraSaluto}</h1>
        <p className="text-sm text-muted-foreground capitalize">{oggi}</p>
        {pausaUntil && (
          <p className="text-xs text-amber-500 mt-1">
            ⏸ Paolo in pausa fino a {new Date(pausaUntil).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      <Link href="/impostazioni">
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5" /><span className="hidden sm:inline">Pausa Paolo</span>
        </Button>
      </Link>
    </div>
  );
}

async function callAction(url: string, body: any, okMsg: string, toast: any) {
  try {
    const r = await apiRequest("POST", url, body);
    await r.json();
    toast({ title: okMsg });
    refresh();
  } catch (e: any) {
    toast({ title: "Errore", description: e?.message, variant: "destructive" });
  }
}

/* ─────────── 1) Appuntamenti di oggi ─────────── */
function SectionAppuntamenti({ data }: { data: HomeOggi["oggi"] }) {
  const app = data.appuntamenti;
  if (!app.length) return <SectionShell icon={Calendar} title="Appuntamenti di oggi" emptyText="Nessun appuntamento in agenda." />;
  return (
    <SectionShell icon={Calendar} title="Appuntamenti di oggi" badge={app.length}>
      <div className="space-y-2">
        {app.map(a => {
          const ora = new Date(a.data_ora).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          return (
            <Card key={a.id} className={`p-3 ${a.completato ? "opacity-50" : ""}`} data-testid={`app-${a.id}`}>
              <div className="flex items-start gap-3">
                <div className="text-base font-mono font-semibold tabular-nums shrink-0">{ora}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{a.luogo || a.tipo || "Appuntamento"}</div>
                  {a.note && <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{a.note}</div>}
                  <div className="text-[11px] mt-1">
                    {a.completato ? <span className="text-emerald-500">✓ Completato</span> : <span className="text-muted-foreground">{a.tipo}</span>}
                    {a.cliente_id && (
                      <Link href={`/clienti/${a.cliente_id}`} className="ml-2 text-primary inline-flex items-center gap-0.5">
                        Briefing cliente <ChevronRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* ─────────── 2) Cose da fare (promemoria) ─────────── */
function SectionCoseDaFare({ tasks }: { tasks: HomeOggi["decisioni"]["tasks_ilan"] }) {
  const { toast } = useToast();
  if (!tasks.length) return <SectionShell icon={ListChecks} title="Cose da fare" emptyText="Niente da fare. 🎉" />;
  return (
    <SectionShell icon={ListChecks} title="Cose da fare" badge={tasks.length}>
      <div className="space-y-2">
        {tasks.map(t => {
          const href = taskHref(t);
          const titolo = taskTitolo(t);
          return (
            <Card key={t.short_id} className="px-4 py-3.5" data-testid={`task-${t.short_id}`}>
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${t.priorita <= 2 ? "bg-red-500" : "bg-amber-400"}`} />
                {href ? (
                  <Link href={href} className="flex-1 min-w-0 text-[15px] font-medium truncate active:text-primary">{titolo}</Link>
                ) : (
                  <span className="flex-1 min-w-0 text-[15px] font-medium truncate">{titolo}</span>
                )}
                <button onClick={() => callAction(`/api/decisione/task/${t.short_id}`, { action: "fatto" }, "Fatto ✓", toast)}
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 active:opacity-60 px-2 py-1.5">
                  <Check className="w-4 h-4" /><span className="hidden sm:inline">Fatto</span>
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* ─────────── 3) Messaggi da gestire (bozze + drip + outreach) ─────────── */
function SectionMessaggi({ data }: { data: HomeOggi["decisioni"] }) {
  const { toast } = useToast();
  const tot = data.bozze_crm.length + data.drip.length + data.outreach_approval.length;
  if (!tot) return <SectionShell icon={Mail} title="Messaggi da gestire" emptyText="Nessun messaggio in attesa di risposta." />;
  return (
    <SectionShell icon={Mail} title="Messaggi da gestire" badge={tot}>
      <div className="space-y-2">
        {data.bozze_crm.map(b => (
          <Card key={b.id} className="p-3" data-testid={`bozza-${b.id}`}>
            <div className="text-xs font-mono text-muted-foreground">{b.nome}</div>
            <div className="text-xs text-muted-foreground italic mt-1 line-clamp-1">Lui: "{b.body_in}"</div>
            <div className="text-sm mt-1.5 line-clamp-1">Bozza: {b.bozza}</div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => callAction(`/api/decisione/bozza-crm/${b.id}`, { action: "ok" }, "Approvata, in invio", toast)} className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 active:bg-emerald-500/25 rounded-md px-3 py-1.5"><Check className="w-3 h-3" />Invia</button>
              <button onClick={() => callAction(`/api/decisione/bozza-crm/${b.id}`, { action: "scarta" }, "Scartata", toast)} className="inline-flex items-center gap-1 text-xs bg-red-500/15 active:bg-red-500/25 rounded-md px-3 py-1.5"><X className="w-3 h-3" />Scarta</button>
            </div>
          </Card>
        ))}
        {data.drip.map(d => (
          <Card key={d.id} className="p-3" data-testid={`drip-${d.id}`}>
            <div className="text-xs font-mono text-muted-foreground">{d.nome_lead} ({d.origine})</div>
            <div className="text-sm mt-1 line-clamp-1">{d.messaggio}</div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => callAction(`/api/decisione/drip/${d.id}`, { action: "manda" }, "In invio", toast)} className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 active:bg-emerald-500/25 rounded-md px-3 py-1.5"><Check className="w-3 h-3" />Manda</button>
              <button onClick={() => callAction(`/api/decisione/drip/${d.id}`, { action: "scarta" }, "Scartato", toast)} className="inline-flex items-center gap-1 text-xs bg-red-500/15 active:bg-red-500/25 rounded-md px-3 py-1.5"><X className="w-3 h-3" />Scarta</button>
            </div>
          </Card>
        ))}
        {data.outreach_approval.map(o => (
          <Card key={o.id} className="p-3" data-testid={`outreach-${o.id}`}>
            <div className="text-xs font-mono text-muted-foreground">{o.tipo}</div>
            <div className="text-sm mt-0.5 font-medium">
              {o.immobile_esterno_id ? (
                <Link href={`/acquisizione/${o.immobile_esterno_id}`} className="text-primary underline inline-flex items-center gap-1">{o.indirizzo || o.destinatario_nome || "Immobile"}<ChevronRight className="w-3.5 h-3.5" /></Link>
              ) : (o.indirizzo || o.destinatario_nome || "Immobile")}
              {o.zona ? <span className="text-muted-foreground font-normal"> · {o.zona}</span> : null}
            </div>
            {o.listing_url && <a href={o.listing_url} target="_blank" rel="noopener" className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5"><ExternalLink className="w-3 h-3" />Vedi annuncio</a>}
            {o.destinatario_telefono && <div className="text-xs text-muted-foreground mt-0.5">{fmtTel(o.destinatario_telefono)}</div>}
            {o.testo_proposto && <div className="text-sm mt-1 line-clamp-1 text-foreground/80">{o.testo_proposto}</div>}
            {o.motivo_approvazione && <div className="text-[11px] text-muted-foreground mt-1">Nota: {o.motivo_approvazione}</div>}
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => callAction(`/api/decisione/outreach/${o.id}`, { action: "approva" }, "Approvato", toast)} className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 active:bg-emerald-500/25 rounded-md px-3 py-1.5"><Check className="w-3 h-3" />Approva</button>
              <button onClick={() => callAction(`/api/decisione/outreach/${o.id}`, { action: "scarta" }, "Scartato", toast)} className="inline-flex items-center gap-1 text-xs bg-red-500/15 active:bg-red-500/25 rounded-md px-3 py-1.5"><X className="w-3 h-3" />Scarta</button>
            </div>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────── 4) Clienti caldi & opportunità ─────────── */
function SectionClientiCaldi({ data }: { data: HomeOggi["opportunita"] }) {
  const tot = data.lead_caldi.length + data.match_clienti.length + data.pluricondivisi.length;
  if (!tot) return <SectionShell icon={Flame} title="Clienti caldi & opportunità" emptyText="Nessuna opportunità nuova oggi." />;
  return (
    <SectionShell icon={Flame} title="Clienti caldi & opportunità" badge={tot}>
      <div className="space-y-2">
        {data.lead_caldi.map(l => (
          <Card key={l.id} className="p-3" data-testid={`lead-${l.id}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{l.nome} {l.cognome} <Badge variant="secondary" className="ml-1">score {l.score}</Badge></div>
                <div className="text-xs text-muted-foreground line-clamp-1">{l.info_chiave || "—"}</div>
                {l.telefono && <a href={`https://wa.me/${l.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs bg-green-500/10 rounded-md px-2 py-1 mt-1.5"><MessageCircle className="w-3 h-3" />WhatsApp</a>}
              </div>
            </div>
          </Card>
        ))}
        {data.match_clienti.map((m, i) => (
          <Card key={i} className="p-3" data-testid={`match-${i}`}>
            <div className="text-sm">{m.indirizzo} <span className="text-muted-foreground">({m.zona})</span></div>
            <div className="text-xs text-muted-foreground">{m.mq}mq — {fmtMoney(m.prezzo)} — {m.advertiser}</div>
            <div className="mt-1.5 flex gap-1.5">
              {m.telefono && <a href={`tel:${m.telefono}`} className="inline-flex items-center gap-1 text-xs bg-primary/10 rounded-md px-2 py-1"><Phone className="w-3 h-3" />{m.telefono}</a>}
              {m.listing_url && <a href={m.listing_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs bg-muted rounded-md px-2 py-1"><ExternalLink className="w-3 h-3" />Annuncio</a>}
            </div>
          </Card>
        ))}
        {data.pluricondivisi.map(p => (
          <Card key={p.short_id} className="p-3" data-testid={`pluri-${p.short_id}`}>
            <Link href={`/pluricondivisi/${p.id}`} className="flex items-start gap-2 group">
              <Building2 className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium group-active:text-primary">{p.indirizzo} <span className="text-muted-foreground font-normal">({p.zona})</span></div>
                <div className="text-xs text-muted-foreground">{p.mq}mq — {fmtMoney(p.prezzo)} — <strong>{p.num_agenzie} agenzie</strong>{p.giorni_sul_mercato ? ` — fermo ${p.giorni_sul_mercato}gg` : ""}</div>
                <div className="text-[11px] mt-1 text-primary inline-flex items-center gap-0.5">Apri scheda di lavorazione <ChevronRight className="w-3 h-3" /></div>
              </div>
            </Link>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────── Recap ieri (in fondo, compatto) ─────────── */
function SectionRecap({ recap }: { recap: HomeOggi["recap"] }) {
  return (
    <SectionShell icon={BarChart3} title="Recap ieri">
      <div className="grid grid-cols-3 gap-2">
        <RecapTile label="Outreach" value={recap.outreach_ieri} />
        <RecapTile label="Risposte" value={`${recap.risposte_ieri}${recap.risposte_positive_ieri > 0 ? ` (${recap.risposte_positive_ieri}+)` : ""}`} />
        <RecapTile label="Lead nuovi" value={recap.lead_ieri} />
      </div>
    </SectionShell>
  );
}
function RecapTile({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-muted/40 rounded-lg p-3 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}

/* ─────────── Section shell ─────────── */
interface SectionShellProps {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  badge?: number;
  emptyText?: string;
  children?: React.ReactNode;
}
function SectionShell({ icon: Icon, title, badge, emptyText, children }: SectionShellProps) {
  return (
    <section className="space-y-2" data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <header className="flex items-center gap-2 px-1">
        <Icon className="w-4 h-4 text-muted-foreground" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {badge !== undefined && badge > 0 && <Badge variant="secondary" className="ml-1">{badge}</Badge>}
      </header>
      {children ?? (
        <Card className="p-4 text-sm text-muted-foreground text-center bg-muted/20">{emptyText || "—"}</Card>
      )}
    </section>
  );
}

function fmtMoney(n?: number | null): string {
  if (!n) return "n/d";
  return `€${Math.round(n).toLocaleString("it-IT")}`;
}
