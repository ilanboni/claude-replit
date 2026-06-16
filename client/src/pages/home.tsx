import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame, Target, Calendar, BarChart3,
  ChevronRight, Phone, MessageCircle, AlertCircle,
} from "lucide-react";

/**
 * Home "OGGI" — sostituisce la dashboard analytics come homepage.
 * Mostra cosa devi decidere/fare adesso, in sezioni rapide con bottoni di azione.
 *
 * Sezioni:
 *  🔥 DECISIONI OGGI — bozze CRM/outreach in attesa di ok
 *  🎯 OPPORTUNITÀ — pluricondivisi nuovi, match clienti, lead caldi
 *  📅 OGGI — appuntamenti del giorno
 *  📊 RECAP IERI — outreach inviati, risposte, lead nuovi
 *
 * Step 1: skeleton con sezioni e card vuote. Step 2 collega le API esistenti.
 */
export default function Home() {
  // TODO Step 2: collegare endpoint reali. Per ora mostriamo skeleton.
  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 60_000,
  });

  return (
    <div className="px-4 py-4 md:px-6 md:py-6 max-w-3xl mx-auto space-y-5">
      <Header />

      <SectionDecisioni />
      <SectionOpportunita />
      <SectionOggi />
      <SectionRecap stats={stats} />

      <p className="text-xs text-muted-foreground text-center pt-2">
        Briefing aggiornato in tempo reale. Le sezioni con conteggio 0 non vengono mostrate.
      </p>
    </div>
  );
}

function Header() {
  const oraSaluto = (() => {
    const ora = new Date().getHours();
    if (ora < 13) return "Buongiorno";
    if (ora < 20) return "Buon pomeriggio";
    return "Buonasera";
  })();
  const oggi = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="home-title">
          {oraSaluto}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{oggi}</p>
      </div>
      <Link href="/impostazioni">
        <Button size="sm" variant="outline" className="gap-1.5">
          <span className="hidden sm:inline">Pausa Paolo</span>
          <span className="sm:hidden">⏸</span>
        </Button>
      </Link>
    </div>
  );
}

/* ─────────── Sezione: Decisioni oggi ─────────── */

function SectionDecisioni() {
  // TODO Step 2: pesca bozze CRM pending + drip in attesa + outreach approval
  const items: any[] = []; // placeholder

  if (items.length === 0) {
    return (
      <SectionShell icon={Flame} title="Decisioni oggi" emptyText="Nessuna bozza in attesa." />
    );
  }
  return (
    <SectionShell icon={Flame} title="Decisioni oggi" badge={items.length}>
      {/* TODO Step 2: mappa items in card */}
    </SectionShell>
  );
}

/* ─────────── Sezione: Opportunità ─────────── */

function SectionOpportunita() {
  // TODO Step 2: pluricondivisi TOP 3 + match clienti 24h + lead caldi 24h
  return (
    <SectionShell icon={Target} title="Opportunità" emptyText="Nessuna opportunità nuova oggi." />
  );
}

/* ─────────── Sezione: Oggi (appuntamenti + follow-up) ─────────── */

function SectionOggi() {
  // TODO Step 2: appuntamenti del giorno dal DB
  return (
    <SectionShell icon={Calendar} title="Oggi" emptyText="Nessun appuntamento in agenda." />
  );
}

/* ─────────── Sezione: Recap ieri ─────────── */

function SectionRecap({ stats }: { stats: any }) {
  return (
    <SectionShell icon={BarChart3} title="Recap ieri">
      <div className="grid grid-cols-3 gap-2">
        <RecapTile label="Outreach inviati" value={stats?.outreach_ieri ?? "—"} />
        <RecapTile label="Risposte" value={stats?.risposte_ieri ?? "—"} />
        <RecapTile label="Lead nuovi" value={stats?.lead_ieri ?? "—"} />
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
