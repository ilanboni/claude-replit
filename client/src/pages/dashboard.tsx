import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
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
  MessageCircle,
  Send,
  Mail,
  Plus,
  ListTodo,
  CalendarPlus,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Cliente, Immobile, Richiesta, Appuntamento, Matching, WhatsappConversation, Task, Comunicazione, ImmobileEsterno } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TrendData {
  nome: string;
  data: string;
  clienti: number;
  richieste: number;
  immobili: number;
  appuntamenti: number;
}

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
                    {cliente.nome?.[0] || ''}{cliente.cognome?.[0] || ''}
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

function TrendChartCard({ loading }: { loading?: boolean }) {
  const { data: trends = [] } = useQuery<TrendData[]>({
    queryKey: ["/api/dashboard/trends"],
  });

  if (loading || trends.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trend Settimanale
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="nome" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
              />
              <Legend 
                iconType="circle" 
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
              <Bar 
                dataKey="clienti" 
                name="Clienti" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="richieste" 
                name="Richieste" 
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="immobili" 
                name="Immobili" 
                fill="hsl(var(--chart-3))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="appuntamenti" 
                name="Appuntamenti" 
                fill="hsl(var(--chart-4))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function WhatsAppChatCard({ 
  conversations, 
  loading 
}: { 
  conversations: WhatsappConversation[];
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
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const totalUnread = conversations.reduce((sum, c) => sum + (c.nonLetti || 0), 0);
  const recentConversations = conversations.slice(0, 5);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[1][0];
    }
    return name.substring(0, 2);
  };

  const getAvatarColor = (id: number) => {
    const colors = [
      'bg-green-500', 'bg-blue-500', 'bg-purple-500', 
      'bg-orange-500', 'bg-pink-500', 'bg-teal-500'
    ];
    return colors[id % colors.length];
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 24) {
      return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Ieri';
    } else {
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Chat WhatsApp
          {totalUnread > 0 && (
            <Badge variant="destructive" className="ml-2">
              {totalUnread}
            </Badge>
          )}
        </CardTitle>
        <Link href="/whatsapp">
          <Button variant="ghost" size="sm" data-testid="button-view-all-whatsapp">
            Apri chat
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {recentConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nessuna conversazione</p>
            <Link href="/whatsapp">
              <Button variant="outline" size="sm" className="mt-3" data-testid="button-start-whatsapp">
                Inizia a chattare
              </Button>
            </Link>
          </div>
        ) : (
          recentConversations.map((conv) => (
            <Link key={conv.id} href="/whatsapp">
              <div className="flex items-center gap-3 rounded-md p-2 hover-elevate cursor-pointer">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-white text-sm font-medium ${getAvatarColor(conv.id)}`}>
                  {getInitials(conv.nome || conv.phoneNumber)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate ${(conv.nonLetti ?? 0) > 0 ? 'font-semibold' : 'font-medium'}`}>
                      {conv.nome || conv.phoneNumber}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTime(conv.ultimoMessaggioData)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.phoneNumber}
                    </p>
                    {(conv.nonLetti ?? 0) > 0 && (
                      <Badge variant="default" className="bg-green-500 text-white min-w-[20px] h-5 flex items-center justify-center">
                        {conv.nonLetti}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))
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

interface MessaggioRecente extends Comunicazione {
  clienteNome?: string | null;
}

function MessaggiRecentiCard({ loading }: { loading?: boolean }) {
  const { toast } = useToast();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedMessaggio, setSelectedMessaggio] = useState<MessaggioRecente | null>(null);
  const [taskTitolo, setTaskTitolo] = useState("");
  const [taskScadenza, setTaskScadenza] = useState("");
  const [syncCalendar, setSyncCalendar] = useState(true);

  const { data: messaggi = [], isLoading } = useQuery<MessaggioRecente[]>({
    queryKey: ["/api/dashboard/messaggi-recenti"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { titolo: string; descrizione?: string; scadenza?: string; comunicazioneId?: number; clienteId?: number; syncCalendar?: boolean }) => {
      return apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      toast({ title: "Task creato", description: "Il promemoria è stato creato" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowTaskDialog(false);
      setTaskTitolo("");
      setTaskScadenza("");
      setSelectedMessaggio(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile creare il task", variant: "destructive" });
    },
  });

  const handleCreateTask = () => {
    if (!taskTitolo.trim()) return;
    createTaskMutation.mutate({
      titolo: taskTitolo,
      descrizione: selectedMessaggio ? `Da messaggio: ${selectedMessaggio.testo?.substring(0, 100)}...` : undefined,
      scadenza: taskScadenza ? new Date(taskScadenza).toISOString() : undefined,
      comunicazioneId: selectedMessaggio?.id,
      clienteId: selectedMessaggio?.clienteId || undefined,
      syncCalendar: syncCalendar && !!taskScadenza,
    });
  };

  const openTaskDialog = (msg: MessaggioRecente) => {
    setSelectedMessaggio(msg);
    setTaskTitolo(`Rispondere a ${msg.clienteNome || "cliente"}`);
    setShowTaskDialog(true);
  };

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m fa`;
    if (diffHours < 24) return `${diffHours}h fa`;
    if (diffDays < 7) return `${diffDays}g fa`;
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          Messaggi Recenti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {messaggi.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nessun messaggio recente</p>
          </div>
        ) : (
          messaggi.slice(0, 5).map((msg) => (
            <div key={msg.id} className="flex items-center gap-3 rounded-md border p-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${msg.tipo === "whatsapp" ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"}`}>
                {msg.tipo === "whatsapp" ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">
                    {msg.clienteNome || "Cliente sconosciuto"}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(msg.dataOra)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {msg.testo?.substring(0, 50)}...
                </p>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => openTaskDialog(msg)}
                data-testid={`button-create-task-${msg.id}`}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea Promemoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Titolo</Label>
              <Input 
                value={taskTitolo} 
                onChange={(e) => setTaskTitolo(e.target.value)}
                placeholder="Es: Richiamare cliente"
                data-testid="input-task-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Scadenza (opzionale)</Label>
              <Input 
                type="datetime-local" 
                value={taskScadenza} 
                onChange={(e) => setTaskScadenza(e.target.value)}
                data-testid="input-task-scadenza"
              />
            </div>
            {taskScadenza && (
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="syncCalendar" 
                  checked={syncCalendar} 
                  onChange={(e) => setSyncCalendar(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="syncCalendar" className="text-sm cursor-pointer flex items-center gap-1">
                  <CalendarPlus className="h-4 w-4" />
                  Sincronizza con Google Calendar
                </Label>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
                Annulla
              </Button>
              <Button onClick={handleCreateTask} disabled={!taskTitolo.trim() || createTaskMutation.isPending}>
                {createTaskMutation.isPending ? "Creazione..." : "Crea Task"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function TasksCard({ loading }: { loading?: boolean }) {
  const { toast } = useToast();
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitolo, setNewTaskTitolo] = useState("");
  const [newTaskScadenza, setNewTaskScadenza] = useState("");
  const [newTaskClienteId, setNewTaskClienteId] = useState<string>("");
  const [newTaskImmobileId, setNewTaskImmobileId] = useState<string>("");
  const [syncCalendar, setSyncCalendar] = useState(true);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const { data: immobili = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const { data: acquisizioni = [] } = useQuery<ImmobileEsterno[]>({
    queryKey: ["/api/acquisizione"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { titolo: string; scadenza?: string; clienteId?: number; immobileId?: number; syncCalendar?: boolean }) => {
      return apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      toast({ title: "Task creato" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setShowNewTask(false);
      setNewTaskTitolo("");
      setNewTaskScadenza("");
      setNewTaskClienteId("");
      setNewTaskImmobileId("");
    },
  });

  // Combina immobili normali e acquisizioni per il selettore
  const tuttiImmobili = [
    ...immobili.map(i => ({ id: i.id, label: `${i.titolo || i.indirizzo || 'Immobile'}`, tipo: 'portfolio' as const })),
    ...acquisizioni.map(a => ({ id: a.id, label: `[Acq] ${a.titolo || a.indirizzo || 'Acquisizione'}`, tipo: 'acquisizione' as const })),
  ];

  const completeTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/tasks/${id}`, { stato: "completato" });
    },
    onSuccess: () => {
      toast({ title: "Task completato" });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  if (loading || isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const tasksDaFare = tasks.filter(t => t.stato === "da_fare").slice(0, 5);

  const formatScadenza = (scadenza: string | Date | null) => {
    if (!scadenza) return null;
    const d = new Date(scadenza);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays < 0) return { text: "Scaduto", color: "text-red-600" };
    if (diffDays === 0) return { text: "Oggi", color: "text-amber-600" };
    if (diffDays === 1) return { text: "Domani", color: "text-amber-600" };
    return { text: d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }), color: "text-muted-foreground" };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-primary" />
          I Miei Task
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={() => setShowNewTask(true)} data-testid="button-new-task">
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {showNewTask && (
          <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/30">
            <Input 
              value={newTaskTitolo}
              onChange={(e) => setNewTaskTitolo(e.target.value)}
              placeholder="Cosa devi fare?"
              autoFocus
              data-testid="input-new-task"
            />
            <div className="flex gap-2 items-center">
              <Input 
                type="datetime-local"
                value={newTaskScadenza}
                onChange={(e) => setNewTaskScadenza(e.target.value)}
                className="flex-1"
                data-testid="input-new-task-scadenza"
              />
              {newTaskScadenza && (
                <label className="flex items-center gap-1 text-xs cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={syncCalendar} 
                    onChange={(e) => setSyncCalendar(e.target.checked)}
                    className="h-3 w-3"
                  />
                  <CalendarPlus className="h-3 w-3" />
                </label>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={newTaskClienteId} onValueChange={setNewTaskClienteId}>
                <SelectTrigger className="flex-1" data-testid="select-task-cliente">
                  <SelectValue placeholder="Cliente (opz.)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun cliente</SelectItem>
                  {clienti.slice(0, 50).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome} {c.cognome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newTaskImmobileId} onValueChange={setNewTaskImmobileId}>
                <SelectTrigger className="flex-1" data-testid="select-task-immobile">
                  <SelectValue placeholder="Immobile (opz.)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessun immobile</SelectItem>
                  {tuttiImmobili.slice(0, 50).map(i => (
                    <SelectItem key={`${i.tipo}-${i.id}`} value={`${i.tipo}-${i.id}`}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1 justify-end">
              <Button size="sm" variant="ghost" onClick={() => { setShowNewTask(false); setNewTaskTitolo(""); setNewTaskScadenza(""); setNewTaskClienteId(""); setNewTaskImmobileId(""); }}>
                <X className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                disabled={!newTaskTitolo.trim() || createTaskMutation.isPending}
                onClick={() => {
                  const immobileValue = newTaskImmobileId && newTaskImmobileId !== "none" ? newTaskImmobileId.split("-") : null;
                  createTaskMutation.mutate({ 
                    titolo: newTaskTitolo, 
                    scadenza: newTaskScadenza ? new Date(newTaskScadenza).toISOString() : undefined,
                    clienteId: newTaskClienteId && newTaskClienteId !== "none" ? parseInt(newTaskClienteId) : undefined,
                    immobileId: immobileValue && immobileValue[0] === "portfolio" ? parseInt(immobileValue[1]) : undefined,
                    syncCalendar: syncCalendar && !!newTaskScadenza
                  });
                }}
                data-testid="button-save-task"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {tasksDaFare.length === 0 && !showNewTask ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">Nessun task in sospeso</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowNewTask(true)}>
              Nuovo Task
            </Button>
          </div>
        ) : (
          tasksDaFare.map((task) => {
            const scadenzaInfo = formatScadenza(task.scadenza);
            return (
              <div key={task.id} className="flex items-center gap-3 rounded-md border p-3">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 rounded-full border"
                  onClick={() => completeTaskMutation.mutate(task.id)}
                  data-testid={`button-complete-task-${task.id}`}
                >
                  <Check className="h-3 w-3 opacity-0 hover:opacity-100" />
                </Button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.titolo}</p>
                  {scadenzaInfo && (
                    <p className={`text-xs ${scadenzaInfo.color}`}>{scadenzaInfo.text}</p>
                  )}
                </div>
                {task.calendarSyncStatus === "synced" && (
                  <CalendarPlus className="h-4 w-4 text-green-500" />
                )}
              </div>
            );
          })
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

  const { data: whatsappConversations = [], isLoading: whatsappLoading } = useQuery<WhatsappConversation[]>({
    queryKey: ["/api/whatsapp/conversations"],
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
        <MessaggiRecentiCard loading={loading} />
        <TasksCard loading={loading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <UpcomingAppointmentsCard 
          appuntamenti={appuntamenti} 
          loading={appuntamentiLoading} 
        />
        <WhatsAppChatCard 
          conversations={whatsappConversations} 
          loading={whatsappLoading} 
        />
        <MatchingSuggestionsCard 
          matching={matching} 
          loading={matchingLoading} 
        />
      </div>

      <TrendChartCard loading={loading} />
    </div>
  );
}
