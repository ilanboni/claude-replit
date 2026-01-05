import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Users,
  Building2,
  MoreHorizontal,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AppuntamentoForm } from "./appuntamento-form";
import type { Appuntamento, Cliente, Immobile } from "@shared/schema";

type ViewMode = 'list' | 'week' | 'month';

function CalendarView({
  appuntamenti,
  clientiMap,
  immobiliMap,
  viewMode,
  currentDate,
  onDateChange,
  onAppuntamentoClick,
}: {
  appuntamenti: Appuntamento[];
  clientiMap: Map<number, Cliente>;
  immobiliMap: Map<number, Immobile>;
  viewMode: 'week' | 'month';
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onAppuntamentoClick: (app: Appuntamento) => void;
}) {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const giorni = useMemo(() => {
    const result: Date[] = [];
    if (viewMode === 'week') {
      const inizioSettimana = new Date(currentDate);
      const giorno = inizioSettimana.getDay();
      const diff = giorno === 0 ? -6 : 1 - giorno;
      inizioSettimana.setDate(inizioSettimana.getDate() + diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(inizioSettimana);
        d.setDate(inizioSettimana.getDate() + i);
        result.push(d);
      }
    } else {
      const inizioMese = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const fineMese = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const inizioCalendario = new Date(inizioMese);
      inizioCalendario.setDate(inizioCalendario.getDate() - (inizioCalendario.getDay() === 0 ? 6 : inizioCalendario.getDay() - 1));
      for (let i = 0; i < 42; i++) {
        const d = new Date(inizioCalendario);
        d.setDate(inizioCalendario.getDate() + i);
        if (d <= fineMese || result.length < 35) {
          result.push(d);
        }
      }
    }
    return result;
  }, [viewMode, currentDate]);

  const appuntamentiPerGiorno = useMemo(() => {
    const map = new Map<string, Appuntamento[]>();
    appuntamenti.forEach(app => {
      const d = new Date(app.dataOra);
      const key = d.toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(app);
    });
    return map;
  }, [appuntamenti]);

  const navigaPeriodo = (direzione: number) => {
    const nuovaData = new Date(currentDate);
    if (viewMode === 'week') {
      nuovaData.setDate(nuovaData.getDate() + (direzione * 7));
    } else {
      nuovaData.setMonth(nuovaData.getMonth() + direzione);
    }
    onDateChange(nuovaData);
  };

  const vaAdOggi = () => onDateChange(new Date());

  const formatHeader = () => {
    if (viewMode === 'week') {
      const inizio = giorni[0];
      const fine = giorni[6];
      if (inizio.getMonth() === fine.getMonth()) {
        return `${inizio.getDate()} - ${fine.getDate()} ${inizio.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`;
      }
      return `${inizio.getDate()} ${inizio.toLocaleDateString('it-IT', { month: 'short' })} - ${fine.getDate()} ${fine.toLocaleDateString('it-IT', { month: 'short', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  };

  const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigaPeriodo(-1)} data-testid="button-prev-period">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigaPeriodo(1)} data-testid="button-next-period">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={vaAdOggi} data-testid="button-today">
            Oggi
          </Button>
        </div>
        <CardTitle className="text-lg capitalize">{formatHeader()}</CardTitle>
        <div className="w-24" />
      </CardHeader>
      <CardContent className="p-0">
        <div className={`grid ${viewMode === 'week' ? 'grid-cols-7' : 'grid-cols-7'} border-t`}>
          {giorniSettimana.map((g, i) => (
            <div key={g} className={`p-2 text-center text-xs font-medium text-muted-foreground border-b ${i < 6 ? 'border-r' : ''}`}>
              {g}
            </div>
          ))}
          {giorni.map((giorno, i) => {
            const apps = appuntamentiPerGiorno.get(giorno.toDateString()) || [];
            const isOggi = giorno.toDateString() === oggi.toDateString();
            const isAltroMese = viewMode === 'month' && giorno.getMonth() !== currentDate.getMonth();
            
            return (
              <div
                key={giorno.toISOString()}
                className={`min-h-24 p-1 border-b ${i % 7 < 6 ? 'border-r' : ''} ${isAltroMese ? 'bg-muted/30' : ''}`}
              >
                <div className={`text-xs font-medium mb-1 p-1 rounded-full w-6 h-6 flex items-center justify-center
                  ${isOggi ? 'bg-primary text-primary-foreground' : isAltroMese ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}
                >
                  {giorno.getDate()}
                </div>
                <div className="space-y-1">
                  {apps.slice(0, 3).map(app => {
                    const cliente = clientiMap.get(app.clienteId);
                    return (
                      <button
                        key={app.id}
                        onClick={() => onAppuntamentoClick(app)}
                        className={`w-full text-left text-xs p-1 rounded truncate hover-elevate
                          ${app.completato ? 'bg-muted text-muted-foreground line-through' :
                            app.confermato ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400' :
                            'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}
                        data-testid={`calendar-app-${app.id}`}
                      >
                        {new Date(app.dataOra).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        {cliente && ` ${cliente.nome[0]}${cliente.cognome[0]}`}
                      </button>
                    );
                  })}
                  {apps.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">+{apps.length - 3}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AppuntamentoCard({ 
  appuntamento, 
  cliente,
  immobile,
  onEdit, 
  onDelete,
  onToggleConfirmation,
  onToggleComplete,
}: { 
  appuntamento: Appuntamento; 
  cliente?: Cliente;
  immobile?: Immobile;
  onEdit: () => void;
  onDelete: () => void;
  onToggleConfirmation: () => void;
  onToggleComplete: () => void;
}) {
  const data = new Date(appuntamento.dataOra);
  const isPast = data < new Date();
  const isToday = data.toDateString() === new Date().toDateString();

  return (
    <Card className={`hover-elevate ${isPast && !appuntamento.completato ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`text-center min-w-16 p-2 rounded-md ${
            isToday ? 'bg-primary/10' : 'bg-muted'
          }`}>
            <p className="text-2xl font-bold">{data.getDate()}</p>
            <p className="text-xs text-muted-foreground uppercase">
              {data.toLocaleDateString('it-IT', { month: 'short' })}
            </p>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {isToday && <Badge className="bg-primary/10 text-primary">Oggi</Badge>}
              {appuntamento.completato ? (
                <Badge className="bg-green-500/10 text-green-600">Completato</Badge>
              ) : appuntamento.confermato ? (
                <Badge className="bg-blue-500/10 text-blue-600">Confermato</Badge>
              ) : (
                <Badge variant="secondary">In attesa</Badge>
              )}
            </div>

            {appuntamento.luogo && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                <MapPin className="h-4 w-4" />
                {appuntamento.luogo}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2 text-sm">
              {cliente && (
                <Link href={`/clienti/${cliente.id}`}>
                  <span className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    <Users className="h-4 w-4" />
                    {cliente.nome} {cliente.cognome}
                  </span>
                </Link>
              )}
              {immobile && (
                <Link href={`/immobili/${immobile.id}`}>
                  <span className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    <Building2 className="h-4 w-4" />
                    {immobile.titolo}
                  </span>
                </Link>
              )}
            </div>

            {appuntamento.note && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {appuntamento.note}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!appuntamento.completato && (
                <>
                  <DropdownMenuItem onClick={onToggleConfirmation}>
                    {appuntamento.confermato ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Rimuovi conferma
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Conferma
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleComplete}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Segna completato
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete} 
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AppuntamentiPage() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingAppuntamento, setEditingAppuntamento] = useState<Appuntamento | null>(null);
  const [deletingAppuntamento, setDeletingAppuntamento] = useState<Appuntamento | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: appuntamenti = [], isLoading } = useQuery<Appuntamento[]>({
    queryKey: ["/api/appuntamenti"],
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const { data: immobili = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const clientiMap = new Map(clienti.map(c => [c.id, c]));
  const immobiliMap = new Map(immobili.map(i => [i.id, i]));

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appuntamenti/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appuntamenti"] });
      toast({ title: "Appuntamento eliminato con successo" });
      setDeletingAppuntamento(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Appuntamento> }) => {
      await apiRequest("PATCH", `/api/appuntamenti/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appuntamenti"] });
      toast({ title: "Appuntamento aggiornato" });
    },
  });

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const appuntamentiOggi = appuntamenti.filter(a => {
    const d = new Date(a.dataOra);
    return d.toDateString() === oggi.toDateString();
  });

  const appuntamentiFuturi = appuntamenti.filter(a => {
    const d = new Date(a.dataOra);
    d.setHours(0, 0, 0, 0);
    return d > oggi;
  }).sort((a, b) => new Date(a.dataOra).getTime() - new Date(b.dataOra).getTime());

  const appuntamentiPassati = appuntamenti.filter(a => {
    const d = new Date(a.dataOra);
    d.setHours(0, 0, 0, 0);
    return d < oggi;
  }).sort((a, b) => new Date(b.dataOra).getTime() - new Date(a.dataOra).getTime());

  const renderAppuntamenti = (list: Appuntamento[]) => {
    if (list.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Nessun appuntamento</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {list.map((app) => (
          <AppuntamentoCard
            key={app.id}
            appuntamento={app}
            cliente={clientiMap.get(app.clienteId)}
            immobile={app.immobileId ? immobiliMap.get(app.immobileId) : undefined}
            onEdit={() => {
              setEditingAppuntamento(app);
              setShowForm(true);
            }}
            onDelete={() => setDeletingAppuntamento(app)}
            onToggleConfirmation={() => {
              updateMutation.mutate({ id: app.id, data: { confermato: !app.confermato } });
            }}
            onToggleComplete={() => {
              updateMutation.mutate({ id: app.id, data: { completato: true } });
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-appuntamenti-title">Appuntamenti</h1>
          <p className="text-muted-foreground">Gestisci i tuoi appuntamenti con i clienti</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-md">
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4 mr-1" />
              Lista
            </Button>
            <Button 
              variant={viewMode === 'week' ? 'secondary' : 'ghost'} 
              size="sm"
              className="rounded-none border-x"
              onClick={() => setViewMode('week')}
              data-testid="button-view-week"
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              Settimana
            </Button>
            <Button 
              variant={viewMode === 'month' ? 'secondary' : 'ghost'} 
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('month')}
              data-testid="button-view-month"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Mese
            </Button>
          </div>
          <Button onClick={() => setShowForm(true)} data-testid="button-new-appointment">
            <Plus className="h-4 w-4 mr-2" />
            Nuovo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : viewMode !== 'list' ? (
        <CalendarView
          appuntamenti={appuntamenti}
          clientiMap={clientiMap}
          immobiliMap={immobiliMap}
          viewMode={viewMode}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onAppuntamentoClick={(app) => {
            setEditingAppuntamento(app);
            setShowForm(true);
          }}
        />
      ) : appuntamenti.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nessun appuntamento</h3>
            <p className="text-muted-foreground text-center mt-1">
              Inizia pianificando il tuo primo appuntamento
            </p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Appuntamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {appuntamentiOggi.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Oggi ({appuntamentiOggi.length})
              </h2>
              {renderAppuntamenti(appuntamentiOggi)}
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-4">
              Prossimi Appuntamenti ({appuntamentiFuturi.length})
            </h2>
            {renderAppuntamenti(appuntamentiFuturi)}
          </div>

          {appuntamentiPassati.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                Passati ({appuntamentiPassati.length})
              </h2>
              {renderAppuntamenti(appuntamentiPassati)}
            </div>
          )}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAppuntamento ? "Modifica Appuntamento" : "Nuovo Appuntamento"}
            </DialogTitle>
          </DialogHeader>
          <AppuntamentoForm
            appuntamento={editingAppuntamento}
            onSuccess={() => {
              setShowForm(false);
              setEditingAppuntamento(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingAppuntamento(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingAppuntamento} onOpenChange={() => setDeletingAppuntamento(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l'appuntamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingAppuntamento && deleteMutation.mutate(deletingAppuntamento.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
