import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Check, X, CalendarPlus,
} from "lucide-react";

/**
 * Home "OGGI" — sostituisce la dashboard analytics come homepage.
 * Mostra cosa devi decidere/fare adesso, in sezioni rapide con bottoni di azione.
 *
 * Dati: GET /api/home/oggi (endpoint unico, query parallele backend).
 */
type HomeOggi = {
  ora: string;
  pausa_until: string | null;
  decisioni: {
    bozze_crm: Array<{ id: string; nome: string; telefono: string; body_in: string; bozza: string }>;
    drip: Array<{ id: string; nome_lead: string; messaggio: string; origine: string }>;
    outreach_approval: Array<{ id: string; destinatario_nome: string; destinatario_telefono: string; tipo: string; motivo_approvazione: string; testo_proposto?: string; indirizzo?: string; zona?: string; listing_url?: string; immobile_esterno_id?: number | null; target_immobile_id?: string | null }>;
    tasks_ilan: Array<{ short_id: string; descrizione: string; nome_riferimento: string; telefono: string; priorita: number; cliente_id?: number | null; lead_id?: number | null; immobile_id?: number | null; immobile_esterno_id?: number | null; pluricondiviso_id?: number | null }>;
  };
  opportunita: {
    pluricondivisi: Array<{ short_id: string; indirizzo: string; zona: string; mq: number; prezzo: number; num_agenzie: number; giorni_sul_mercato: number; lista_agenzie: Array<{ nome: string }> }>;
    match_clienti: Array<{ cliente_id: number; indirizzo: string; prezzo: number; mq: number; advertiser: string; telefono: string; zona: string; listing_url: string }>;
    lead_caldi: Array<{ id: number; nome: string; cognome: string; telefono: string; score: number; info_chiave: string }>;
  };
  oggi: {
    appuntamenti: Array<{ id: number; data_ora: string; luogo: string; tipo: string; note: string; cliente_id: number | null; completato: boolean }>;
  };
  recap: { outreach_ieri: number; risposte_ieri: number; risposte_positive_ieri: number; lead_ieri: number };
};

/** Scheda di destinazione per una card task, in base agli id disponibili. */
function taskHref(t: { cliente_id?: number | null; immobile_esterno_id?: number | null; pluricondiviso_id?: number | null; immobile_id?: number | null }): string | null {
  if (t.cliente_id) return `/clienti/${t.cliente_id}`;
  if (t.immobile_esterno_id) return `/acquisizione/${t.immobile_esterno_id}`;
  if (t.pluricondiviso_id) return `/pluricondivisi/${t.pluricondiviso_id}`;
  if (t.immobile_id) return `/immobili/${t.immobile_id}`;
  return null;
}

export default function Home() {
  const { data, isLoading } = useQuery<HomeOggi>({
    queryKey: ["/api/home/oggi"],
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 max-w-3xl mx-auto space-y-5">
      <Header pausaUntil={data?.pausa_until} />

      {isLoading && (
        <Card className="p-4 text-sm text-muted-foreground text-center bg-muted/20">
          Carico…
        </Card>
      )}

      {!isLoading && data && (
        <>
          <SectionDecisioni data={data.decisioni} />
          <SectionOpportunita data={data.opportunita} />
          <SectionOggi data={data.oggi} />
          <SectionRecap recap={data.recap} />
        </>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Aggiornato in tempo reale ogni minuto. Le sezioni vuote non vengono mostrate.
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
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="home-title">
          {oraSaluto}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{oggi}</p>
        {pausaUntil && (
          <p className="text-xs text-amber-500 mt-1">
            ⏸ Paolo in pausa fino a {new Date(pausaUntil).toLocaleString("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      <Link href="/impostazioni">
        <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pausa Paolo</span>
        </Button>
      </Link>
    </div>
  );
}

/* ─────────── Sezione: Decisioni oggi ─────────── */

function SectionDecisioni({ data }: { data: HomeOggi["decisioni"] }) {
  const { toast } = useToast();
  const tot = data.bozze_crm.length + data.drip.length + data.outreach_approval.length + data.tasks_ilan.length;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/home/oggi"] });

  const callAction = async (url: string, body: any, okMsg: string) => {
    try {
      const r = await apiRequest("POST", url, body);
      await r.json();
      toast({ title: okMsg });
      refresh();
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message, variant: "destructive" });
    }
  };

  if (tot === 0) {
    return <SectionShell icon={Flame} title="Decisioni oggi" emptyText="Nessuna decisione in attesa." />;
  }
  return (
    <SectionShell icon={Flame} title="Decisioni oggi" badge={tot}>
      <div className="space-y-2">
        {data.tasks_ilan.map(t => (
          <Card key={t.short_id} className="p-3" data-testid={`task-${t.short_id}`}>
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">{t.priorita <= 2 ? "🔴" : "🟡"}</span>
              <div className="flex-1 min-w-0">
                {taskHref(t) ? (
                  <Link href={taskHref(t)!} className="block group">
                    <div className="text-xs font-mono text-muted-foreground">{t.short_id}</div>
                    <div className="text-sm leading-snug line-clamp-2 group-active:text-primary">
                      {t.descrizione}
                      <ChevronRight className="inline w-3.5 h-3.5 ml-0.5 align-text-bottom text-muted-foreground" />
                    </div>
                  </Link>
                ) : (
                  <>
                    <div className="text-xs font-mono text-muted-foreground">{t.short_id}</div>
                    <div className="text-sm leading-snug line-clamp-2">{t.descrizione}</div>
                  </>
                )}
                <div className="mt-2 flex gap-1.5 flex-wrap">
                  {t.telefono && (
                    <a href={`tel:${t.telefono}`} className="inline-flex items-center gap-1 text-xs bg-primary/10 active:bg-primary/20 rounded-md px-2 py-1">
                      <Phone className="w-3 h-3" />{t.telefono}
                    </a>
                  )}
                  {t.telefono && (
                    <a href={`https://wa.me/${t.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs bg-green-500/10 active:bg-green-500/20 rounded-md px-2 py-1">
                      <MessageCircle className="w-3 h-3" />WA
                    </a>
                  )}
                  <button onClick={() => callAction(`/api/decisione/task/${t.short_id}`, { action: "fatto" }, "Fatto ✓")}
                    className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 active:bg-emerald-500/25 rounded-md px-2 py-1">
                    <Check className="w-3 h-3" />Fatto
                  </button>
                  <button onClick={() => callAction(`/api/decisione/task/${t.short_id}`, { action: "rinvia", rinvia_giorni: 3 }, "Rinviato +3gg")}
                    className="inline-flex items-center gap-1 text-xs bg-amber-500/15 active:bg-amber-500/25 rounded-md px-2 py-1">
                    <CalendarPlus className="w-3 h-3" />+3gg
                  </button>
                  <button onClick={() => callAction(`/api/decisione/task/${t.short_id}`, { action: "scarta" }, "Scartato")}
                    className="inline-flex items-center gap-1 text-xs bg-red-500/15 active:bg-red-500/25 rounded-md px-2 py-1">
                    <X className="w-3 h-3" />Scarta
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {data.bozze_crm.map(b => (
          <Card key={b.id} className="p-3" data-testid={`bozza-${b.id}`}>
            <div className="text-xs font-mono text-muted-foreground">CRM {b.id} — {b.nome}</div>
            <div className="text-xs text-muted-foreground italic mt-1 line-clamp-1">"{b.body_in}"</div>
            <div className="text-sm mt-1.5 line-clamp-3">{b.bozza}</div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => callAction(`/api/decisione/bozza-crm/${b.id}`, { action: "ok" }, "Bozza approvata, in coda invio")}
                className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 active:bg-emerald-500/25 rounded-md px-3 py-1.5">
                <Check className="w-3 h-3" />Approva
              </button>
              <button onClick={() => callAction(`/api/decisione/bozza-crm/${b.id}`, { action: "scarta" }, "Bozza scartata")}
                className="inline-flex items-center gap-1 text-xs bg-red-500/15 active:bg-red-500/25 rounded-md px-3 py-1.5">
                <X className="w-3 h-3" />Scarta
              </button>
            </div>
          </Card>
        ))}
        {data.drip.map(d => (
          <Card key={d.id} className="p-3" data-testid={`drip-${d.id}`}>
            <div className="text-xs font-mono text-muted-foreground">DRIP {d.id} — {d.nome_lead} ({d.origine})</div>
            <div className="text-sm mt-1 line-clamp-3">{d.messaggio}</div>
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => callAction(`/api/decisione/drip/${d.id}`, { action: "manda" }, "Drip in coda invio")}
                className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 active:bg-emerald-500/25 rounded-md px-3 py-1.5">
                <Check className="w-3 h-3" />Manda
              </button>
              <button onClick={() => callAction(`/api/decisione/drip/${d.id}`, { action: "scarta" }, "Drip scartato")}
                className="inline-flex items-center gap-1 text-xs bg-red-500/15 active:bg-red-500/25 rounded-md px-3 py-1.5">
                <X className="w-3 h-3" />Scarta
              </button>
            </div>
          </Card>
        ))}
        {data.outreach_approval.map(o => (
          <Card key={o.id} className="p-3" data-testid={`outreach-${o.id}`}>
            <div className="text-xs font-mono text-muted-foreground">{o.tipo}</div>
            <div className="text-sm mt-0.5 font-medium">
              {o.immobile_esterno_id ? (
                <Link href={`/acquisizione/${o.immobile_esterno_id}`} className="text-primary underline inline-flex items-center gap-1">
                  {o.indirizzo || o.destinatario_nome || "Immobile"}<ChevronRight className="w-3.5 h-3.5" />
                </Link>
              ) : (o.indirizzo || o.destinatario_nome || "Immobile")}
              {o.zona ? <span className="text-muted-foreground font-normal"> · {o.zona}</span> : null}
            </div>
            {o.listing_url && (
              <a href={o.listing_url} target="_blank" rel="noopener" className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                <ExternalLink className="w-3 h-3" />Vedi annuncio
              </a>
            )}
            {o.destinatario_telefono && (
              <div className="text-xs text-muted-foreground mt-0.5">{fmtTel(o.destinatario_telefono)}</div>
            )}
            {o.testo_proposto && (
              <div className="text-sm mt-1 line-clamp-3 text-foreground/80">{o.testo_proposto}</div>
            )}
            {o.motivo_approvazione && (
              <div className="text-[11px] text-muted-foreground mt-1">Nota: {o.motivo_approvazione}</div>
            )}
            <div className="mt-2 flex gap-1.5">
              <button onClick={() => callAction(`/api/decisione/outreach/${o.id}`, { action: "approva" }, "Outreach approvato")}
                className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 active:bg-emerald-500/25 rounded-md px-3 py-1.5">
                <Check className="w-3 h-3" />Approva
              </button>
              <button onClick={() => callAction(`/api/decisione/outreach/${o.id}`, { action: "scarta" }, "Outreach scartato")}
                className="inline-flex items-center gap-1 text-xs bg-red-500/15 active:bg-red-500/25 rounded-md px-3 py-1.5">
                <X className="w-3 h-3" />Scarta
              </button>
            </div>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────── Sezione: Opportunità ─────────── */

function SectionOpportunita({ data }: { data: HomeOggi["opportunita"] }) {
  const tot = data.pluricondivisi.length + data.match_clienti.length + data.lead_caldi.length;
  if (tot === 0) {
    return <SectionShell icon={Target} title="Opportunità" emptyText="Nessuna opportunità nuova oggi." />;
  }
  return (
    <SectionShell icon={Target} title="Opportunità" badge={tot}>
      <div className="space-y-2">
        {data.pluricondivisi.map(p => (
          <Card key={p.short_id} className="p-3" data-testid={`pluri-${p.short_id}`}>
            <div className="flex items-start gap-2">
              <Building2 className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-muted-foreground">{p.short_id}</div>
                <div className="text-sm font-medium">{p.indirizzo} <span className="text-muted-foreground font-normal">({p.zona})</span></div>
                <div className="text-xs text-muted-foreground">{p.mq}mq — {fmtMoney(p.prezzo)} — <strong>{p.num_agenzie} agenzie</strong>{p.giorni_sul_mercato ? ` — fermo ${p.giorni_sul_mercato}gg` : ""}</div>
                <div className="text-[10px] mt-1 text-muted-foreground">Fai visura, poi Telegram: <code>proprietario {p.short_id} Nome Cognome +393…</code></div>
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
        {data.lead_caldi.map(l => (
          <Card key={l.id} className="p-3" data-testid={`lead-${l.id}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{l.nome} {l.cognome} <Badge variant="secondary" className="ml-1">score {l.score}</Badge></div>
                <div className="text-xs text-muted-foreground line-clamp-2">{l.info_chiave || "—"}</div>
                {l.telefono && (
                  <a href={`https://wa.me/${l.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs bg-green-500/10 rounded-md px-2 py-1 mt-1.5">
                    <MessageCircle className="w-3 h-3" />WhatsApp
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─────────── Sezione: Oggi ─────────── */

function SectionOggi({ data }: { data: HomeOggi["oggi"] }) {
  const app = data.appuntamenti;
  if (app.length === 0) {
    return <SectionShell icon={Calendar} title="Oggi" emptyText="Nessun appuntamento in agenda." />;
  }
  return (
    <SectionShell icon={Calendar} title="Oggi" badge={app.length}>
      <div className="space-y-2">
        {app.map(a => {
          const dt = new Date(a.data_ora);
          const ora = dt.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          return (
            <Card key={a.id} className={`p-3 ${a.completato ? "opacity-50" : ""}`} data-testid={`app-${a.id}`}>
              <div className="flex items-start gap-3">
                <div className="text-sm font-mono font-semibold tabular-nums shrink-0">{ora}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{a.luogo || "—"}</div>
                  {a.note && <div className="text-xs text-muted-foreground line-clamp-2">{a.note}</div>}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {a.completato ? "✓ Completato" : a.tipo}
                    {a.cliente_id && <Link href={`/clienti/${a.cliente_id}`} className="ml-2 underline">Vedi scheda</Link>}
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

/* ─────────── Sezione: Recap ieri ─────────── */

function SectionRecap({ recap }: { recap: HomeOggi["recap"] }) {
  return (
    <SectionShell icon={BarChart3} title="Recap ieri">
      <div className="grid grid-cols-3 gap-2">
        <RecapTile label="Outreach inviati" value={recap.outreach_ieri} />
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

/* ─────────── Section shell condiviso ─────────── */

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
        {badge !== undefined && badge > 0 && (
          <Badge variant="secondary" className="ml-1">{badge}</Badge>
        )}
      </header>
      {children ?? (
        <Card className="p-4 text-sm text-muted-foreground text-center bg-muted/20">
          {emptyText || "—"}
        </Card>
      )}
    </section>
  );
}

function fmtMoney(n?: number | null): string {
  if (!n) return "n/d";
  return `€${Math.round(n).toLocaleString("it-IT")}`;
}
