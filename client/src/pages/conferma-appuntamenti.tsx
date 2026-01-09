import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { 
  CalendarCheck, 
  Send, 
  RefreshCw, 
  Clock, 
  MapPin, 
  User, 
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  Loader2,
  Link as LinkIcon
} from "lucide-react";
import type { AppointmentConfirmation, CalendarEvent } from "@shared/schema";

export default function ConfermaAppuntamentiPage() {
  const { toast } = useToast();
  const [messageText, setMessageText] = useState("");
  const [extractedData, setExtractedData] = useState<any>(null);

  const { data: confirmations = [], isLoading: isLoadingConfirmations } = useQuery<AppointmentConfirmation[]>({
    queryKey: ["/api/appointment-confirmations"],
  });

  const { data: calendarEvents = [], isLoading: isLoadingEvents } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

  const { data: authStatus } = useQuery<{ connected: boolean; email?: string }>({
    queryKey: ["/api/calendar/auth-status"],
  });

  const extractMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await apiRequest("POST", "/api/appointment-confirmations/extract", { message });
      return res.json();
    },
    onSuccess: (data) => {
      setExtractedData(data);
      toast({
        title: "Dati estratti",
        description: "I dati dell'appuntamento sono stati estratti dal messaggio.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore estrazione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/calendar-events", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Evento creato",
        description: "L'appuntamento è stato aggiunto al calendario.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointment-confirmations"] });
      setExtractedData(null);
      setMessageText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Errore creazione evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await apiRequest("POST", `/api/calendar-events/${eventId}/sync`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sincronizzazione completata",
        description: "L'evento è stato sincronizzato con Google Calendar.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore sincronizzazione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExtract = () => {
    if (!messageText.trim()) {
      toast({
        title: "Messaggio vuoto",
        description: "Inserisci un messaggio WhatsApp da analizzare.",
        variant: "destructive",
      });
      return;
    }
    extractMutation.mutate(messageText);
  };

  const handleCreateEvent = () => {
    if (!extractedData) return;
    createEventMutation.mutate({
      title: `${extractedData.clientName} - ${extractedData.clientPhone || ""}`,
      description: extractedData.originalMessage,
      startDate: extractedData.appointmentDate,
      endDate: new Date(new Date(extractedData.appointmentDate).getTime() + 60 * 60 * 1000), // +1h
      location: extractedData.address,
      clientName: extractedData.clientName,
      clientPhone: extractedData.clientPhone,
      salutation: extractedData.salutation,
    });
  };

  const getSyncStatusBadge = (status: string | null) => {
    switch (status) {
      case "synced":
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Sincronizzato</Badge>;
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> In attesa</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Fallito</Badge>;
      case "needs_auth":
        return <Badge variant="outline" className="border-amber-500 text-amber-500"><AlertCircle className="h-3 w-3 mr-1" /> Auth richiesta</Badge>;
      default:
        return <Badge variant="outline">Sconosciuto</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" />
            Conferma Appuntamenti
          </h1>
          <p className="text-muted-foreground">
            Estrai appuntamenti da messaggi WhatsApp e sincronizza con Google Calendar
          </p>
        </div>
        <div className="flex items-center gap-2">
          {authStatus?.connected ? (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Google Calendar collegato
              {authStatus.email && ` (${authStatus.email})`}
            </Badge>
          ) : (
            <Button variant="outline" asChild>
              <a href="/api/calendar/auth" data-testid="button-connect-calendar">
                <LinkIcon className="h-4 w-4 mr-2" />
                Collega Google Calendar
              </a>
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="extract" className="space-y-4">
        <TabsList>
          <TabsTrigger value="extract" data-testid="tab-extract">
            <Send className="h-4 w-4 mr-2" />
            Estrai da Messaggio
          </TabsTrigger>
          <TabsTrigger value="events" data-testid="tab-events">
            <Calendar className="h-4 w-4 mr-2" />
            Eventi ({calendarEvents.length})
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="h-4 w-4 mr-2" />
            Storico ({confirmations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="extract" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Messaggio WhatsApp</CardTitle>
                <CardDescription>
                  Incolla il messaggio di conferma appuntamento inviato al cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Gentile Dott.ssa Bianchi,
Le confermo l'appuntamento di Venerdì 20/6, alle ore 11:00 
in Via Montenapoleone 8, Milano.
La ringrazio per la disponibilità.
Cordiali saluti"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  data-testid="textarea-message"
                />
                <Button 
                  onClick={handleExtract} 
                  disabled={extractMutation.isPending || !messageText.trim()}
                  className="w-full"
                  data-testid="button-extract"
                >
                  {extractMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Estrai Dati Appuntamento
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dati Estratti</CardTitle>
                <CardDescription>
                  Verifica i dati estratti prima di creare l'evento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {extractedData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Cliente</span>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {extractedData.salutation} {extractedData.clientName}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Telefono</span>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{extractedData.clientPhone || "Non trovato"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Data e Ora</span>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {extractedData.appointmentDate 
                            ? format(new Date(extractedData.appointmentDate), "EEEE d MMMM yyyy, HH:mm", { locale: it })
                            : "Non trovata"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Indirizzo</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{extractedData.address || "Non trovato"}</span>
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateEvent}
                      disabled={createEventMutation.isPending || !authStatus?.connected || !extractedData?.appointmentDate}
                      className="w-full"
                      data-testid="button-create-event"
                    >
                      {createEventMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CalendarCheck className="h-4 w-4 mr-2" />
                      )}
                      Crea Evento in Google Calendar
                    </Button>
                    {!authStatus?.connected && (
                      <p className="text-xs text-amber-500 text-center">
                        Collega Google Calendar per creare eventi
                      </p>
                    )}
                    {authStatus?.connected && !extractedData?.appointmentDate && (
                      <p className="text-xs text-destructive text-center">
                        Impossibile creare evento: data appuntamento non estratta
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <CalendarCheck className="h-12 w-12 mb-2 opacity-20" />
                    <p className="text-sm">Estrai i dati dal messaggio</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          {isLoadingEvents ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : calendarEvents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-2 opacity-20" />
                <p>Nessun evento nel calendario</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {calendarEvents.map((event) => (
                <Card key={event.id} data-testid={`card-event-${event.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{event.title}</CardTitle>
                      {getSyncStatusBadge(event.syncStatus)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(event.startDate), "d MMM yyyy, HH:mm", { locale: it })}
                      </span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    {event.syncStatus !== "synced" && authStatus?.connected && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => syncMutation.mutate(event.id)}
                        disabled={syncMutation.isPending}
                        data-testid={`button-sync-${event.id}`}
                      >
                        {syncMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Sincronizza
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {isLoadingConfirmations ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : confirmations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Clock className="h-12 w-12 mb-2 opacity-20" />
                <p>Nessuna conferma appuntamento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {confirmations.map((conf) => (
                <Card key={conf.id} data-testid={`card-confirmation-${conf.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {conf.salutation} {conf.clientName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {conf.appointmentDate && format(new Date(conf.appointmentDate), "d MMM yyyy, HH:mm", { locale: it })}
                            {conf.address && ` - ${conf.address}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant={conf.status === "synced" ? "default" : "secondary"}>
                        {conf.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
