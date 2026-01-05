import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Building2, 
  FileText, 
  Calendar,
  TrendingUp,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import type { Cliente, Immobile, Richiesta, Appuntamento, Matching } from "@shared/schema";

interface DashboardStats {
  clientiTotali: number;
  clientiNuovi: number;
  immobiliTotali: number;
  immobiliNuovi: number;
  richiesteTotali: number;
  richiesteNuove: number;
  appuntamentiOggi: number;
  matchingSuggeriti: number;
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  loading 
}: { 
  title: string; 
  value: number; 
  subtitle?: string; 
  icon: typeof Users; 
  trend?: number;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover-elevate">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-1 text-sm">
            <TrendingUp className={`h-4 w-4 ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className={trend >= 0 ? 'text-green-600' : 'text-red-600'}>
              {trend >= 0 ? '+' : ''}{trend}% questa settimana
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AICoachCard({ loading }: { loading?: boolean }) {
  if (loading) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const oggi = new Date();
  const ore = oggi.getHours();
  let saluto = "Buongiorno";
  if (ore >= 13 && ore < 18) saluto = "Buon pomeriggio";
  else if (ore >= 18) saluto = "Buonasera";

  return (
    <Card className="col-span-full lg:col-span-2 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="flex flex-row items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <CardTitle className="text-xl">AI Coach</CardTitle>
          <p className="text-sm text-muted-foreground">{saluto}! Ecco il tuo piano per oggi</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-md bg-background/60 p-4">
            <p className="text-base italic text-foreground/90" data-testid="text-ai-motivation">
              "Oggi hai 3 appuntamenti importanti e 5 clienti da contattare. 
              Concentrati prima sui follow-up urgenti, poi dedicati alle nuove acquisizioni. 
              Sei sulla strada giusta per raggiungere i tuoi obiettivi!"
            </p>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-md bg-background/60 p-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Mattina</p>
                <p className="text-xs text-muted-foreground">Follow-up clienti</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-background/60 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Pomeriggio</p>
                <p className="text-xs text-muted-foreground">Appuntamenti visite</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-background/60 p-3">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Sera</p>
                <p className="text-xs text-muted-foreground">Nuove acquisizioni</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard({ 
  clienti, 
  immobili, 
  loading 
}: { 
  clienti: Cliente[];
  immobili: Immobile[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const recentClienti = clienti.slice(0, 3);
  const recentImmobili = immobili.slice(0, 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Attività Recente</CardTitle>
        <Link href="/clienti">
          <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
            Vedi tutto
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentClienti.length === 0 && recentImmobili.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nessuna attività recente</p>
            <p className="text-xs text-muted-foreground mt-1">Inizia aggiungendo clienti o immobili</p>
          </div>
        ) : (
          <>
            {recentClienti.map((cliente) => (
              <Link key={cliente.id} href={`/clienti/${cliente.id}`}>
                <div className="flex items-center gap-3 rounded-md p-2 hover-elevate cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {cliente.nome[0]}{cliente.cognome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-client-name-${cliente.id}`}>
                      {cliente.nome} {cliente.cognome}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cliente.tipoCliente === "compratore" ? "Compratore" : 
                       cliente.tipoCliente === "venditore" ? "Venditore" : "Compratore/Venditore"}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Nuovo
                  </Badge>
                </div>
              </Link>
            ))}
            {recentImmobili.map((immobile) => (
              <Link key={immobile.id} href={`/immobili/${immobile.id}`}>
                <div className="flex items-center gap-3 rounded-md p-2 hover-elevate cursor-pointer">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-property-title-${immobile.id}`}>
                      {immobile.titolo}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {immobile.zona || "Zona non specificata"}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {immobile.prezzo ? `€${Number(immobile.prezzo).toLocaleString('it-IT')}` : "Prezzo N/D"}
                  </Badge>
                </div>
              </Link>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingAppointmentsCard({ 
  appuntamenti, 
  loading 
}: { 
  appuntamenti: Appuntamento[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  
  const prossimiAppuntamenti = appuntamenti
    .filter(a => new Date(a.dataOra) >= oggi && !a.completato)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Prossimi Appuntamenti</CardTitle>
        <Link href="/appuntamenti">
          <Button variant="ghost" size="sm" data-testid="button-view-all-appointments">
            Vedi tutto
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {prossimiAppuntamenti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nessun appuntamento in programma</p>
            <Link href="/appuntamenti">
              <Button variant="outline" size="sm" className="mt-3" data-testid="button-new-appointment">
                Nuovo Appuntamento
              </Button>
            </Link>
          </div>
        ) : (
          prossimiAppuntamenti.map((app) => {
            const data = new Date(app.dataOra);
            return (
              <div key={app.id} className="flex items-center gap-3 rounded-md border p-3">
                <div className="text-center">
                  <p className="text-lg font-bold">{data.getDate()}</p>
                  <p className="text-xs text-muted-foreground uppercase">
                    {data.toLocaleDateString('it-IT', { month: 'short' })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-appointment-${app.id}`}>
                    {app.luogo || "Luogo da definire"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {app.confermato ? (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                    Confermato
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    In attesa
                  </Badge>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function MatchingSuggestionsCard({ 
  matching, 
  loading 
}: { 
  matching: (Matching & { richiesta?: Richiesta; immobile?: Immobile })[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const suggerimenti = matching
    .filter(m => !m.proposto && m.punteggio >= 60)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Matching Suggeriti
        </CardTitle>
        <Link href="/matching">
          <Button variant="ghost" size="sm" data-testid="button-view-all-matching">
            Vedi tutto
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggerimenti.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nessun matching disponibile</p>
            <p className="text-xs text-muted-foreground mt-1">Aggiungi richieste e immobili per generare match</p>
          </div>
        ) : (
          suggerimenti.map((match) => (
            <div key={match.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold
                ${match.punteggio >= 80 ? 'bg-green-500/10 text-green-600' : 
                  match.punteggio >= 60 ? 'bg-amber-500/10 text-amber-600' : 
                  'bg-red-500/10 text-red-600'}`}
              >
                {match.punteggio}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {match.immobile?.titolo || `Immobile #${match.immobileId}`}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  Per richiesta #{match.richiestaId}
                </p>
              </div>
              <Link href={`/matching/${match.id}`}>
                <Button size="sm" variant="outline" data-testid={`button-view-match-${match.id}`}>
                  Dettagli
                </Button>
              </Link>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: clienti = [], isLoading: clientiLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const { data: immobili = [], isLoading: immobiliLoading } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const { data: appuntamenti = [], isLoading: appuntamentiLoading } = useQuery<Appuntamento[]>({
    queryKey: ["/api/appuntamenti"],
  });

  const { data: matching = [], isLoading: matchingLoading } = useQuery<Matching[]>({
    queryKey: ["/api/matching"],
  });

  const loading = statsLoading || clientiLoading || immobiliLoading;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">Panoramica delle tue attività immobiliari</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clienti Totali"
          value={stats?.clientiTotali ?? clienti.length}
          subtitle={`+${stats?.clientiNuovi ?? 0} questa settimana`}
          icon={Users}
          loading={loading}
        />
        <StatCard
          title="Immobili Attivi"
          value={stats?.immobiliTotali ?? immobili.filter(i => i.attivo).length}
          subtitle={`+${stats?.immobiliNuovi ?? 0} questa settimana`}
          icon={Building2}
          loading={loading}
        />
        <StatCard
          title="Richieste Attive"
          value={stats?.richiesteTotali ?? 0}
          subtitle={`+${stats?.richiesteNuove ?? 0} questa settimana`}
          icon={FileText}
          loading={loading}
        />
        <StatCard
          title="Appuntamenti Oggi"
          value={stats?.appuntamentiOggi ?? appuntamenti.filter(a => {
            const oggi = new Date();
            const appDate = new Date(a.dataOra);
            return appDate.toDateString() === oggi.toDateString();
          }).length}
          icon={Calendar}
          loading={loading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AICoachCard loading={loading} />
        <RecentActivityCard 
          clienti={clienti} 
          immobili={immobili} 
          loading={loading} 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingAppointmentsCard 
          appuntamenti={appuntamenti} 
          loading={appuntamentiLoading} 
        />
        <MatchingSuggestionsCard 
          matching={matching} 
          loading={matchingLoading} 
        />
      </div>
    </div>
  );
}
