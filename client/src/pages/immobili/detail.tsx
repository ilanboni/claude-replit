import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Ruler,
  Home,
  Bath,
  Edit,
  Share2,
  Heart,
  Calendar,
  MessageSquare,
  FileText,
  TrendingUp,
  Users,
  CheckSquare,
  Globe,
  ChartBar,
  Plus,
  Phone,
  Mail,
  Clock,
  Check,
  X,
  Trash2,
  ExternalLink,
  MessageCircle,
  CheckCircle2,
  Circle,
  Send,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { 
  Immobile, 
  Comunicazione, 
  Appuntamento, 
  Matching,
  AttivitaImmobile,
  AttivitaCliente,
  DocumentoImmobile,
  PortaleImmobile,
  StoricoPrezzo,
  Richiesta,
  Cliente,
} from "@shared/schema";

function PropertyHeader({ immobile }: { immobile: Immobile }) {
  const getStatoLabel = () => {
    if (immobile.statoNuovo) return "Nuovo";
    if (immobile.statoRistrutturato) return "Ristrutturato";
    if (immobile.statoBuono) return "Buono Stato";
    if (immobile.statoDaRistrutturare) return "Da Ristrutturare";
    return "N/D";
  };

  return (
    <div className="bg-card border-b">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/immobili">
            <Button variant="ghost" size="sm" data-testid="button-back-to-list">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna alla lista
            </Button>
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex gap-6">
            <div className="w-40 h-32 bg-muted rounded-md flex items-center justify-center shrink-0">
              <Building2 className="h-12 w-12 text-muted-foreground/30" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={immobile.attivo ? "default" : "secondary"}>
                  {immobile.attivo ? "Attivo" : "Inattivo"}
                </Badge>
                {immobile.esclusiva && (
                  <Badge className="bg-amber-500/10 text-amber-600">Esclusiva</Badge>
                )}
                <Badge variant="outline">{getStatoLabel()}</Badge>
              </div>
              <h1 className="text-2xl font-bold mt-2" data-testid="text-property-title">
                {immobile.titolo}
              </h1>
              {(immobile.zona || immobile.indirizzo) && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {[immobile.indirizzo, immobile.zona, immobile.citta].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="flex items-center gap-6 mt-4 text-sm">
                {immobile.mq && (
                  <span className="flex items-center gap-1">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <strong>{immobile.mq}</strong> mq
                  </span>
                )}
                {immobile.camere && (
                  <span className="flex items-center gap-1">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <strong>{immobile.camere}</strong> camere
                  </span>
                )}
                {immobile.bagni && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <strong>{immobile.bagni}</strong> bagni
                  </span>
                )}
                {immobile.piano !== null && immobile.piano !== undefined && (
                  <span className="flex items-center gap-1">
                    Piano <strong>{immobile.piano}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <p className="text-3xl font-bold" data-testid="text-property-price">
              {immobile.prezzo
                ? `€${Number(immobile.prezzo).toLocaleString("it-IT")}`
                : "Prezzo N/D"}
            </p>
            {immobile.mq && immobile.prezzo && (
              <p className="text-sm text-muted-foreground">
                €{Math.round(Number(immobile.prezzo) / immobile.mq).toLocaleString("it-IT")}/mq
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <Link href={`/immobili?edit=${immobile.id}`}>
                <Button variant="outline" size="sm" data-testid="button-edit-property">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
                </Button>
              </Link>
              <Button variant="outline" size="sm" data-testid="button-share-property">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabDettagli({ immobile }: { immobile: Immobile }) {
  const features: string[] = [];
  if (immobile.balcone) features.push("Balcone");
  if (immobile.terrazzo) features.push("Terrazzo");
  if (immobile.ascensore) features.push("Ascensore");
  if (immobile.box) features.push("Box");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Descrizione</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-muted-foreground" data-testid="text-property-description">
              {immobile.descrizione || "Nessuna descrizione disponibile"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Caratteristiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Superficie</p>
                <p className="font-medium">{immobile.mq ? `${immobile.mq} mq` : "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Camere</p>
                <p className="font-medium">{immobile.camere || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bagni</p>
                <p className="font-medium">{immobile.bagni || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Piano</p>
                <p className="font-medium">
                  {immobile.piano !== null && immobile.piano !== undefined ? immobile.piano : "N/D"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stato Vendita</p>
                <p className="font-medium">{immobile.statoVendita || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fonte</p>
                <p className="font-medium">{immobile.fonte || "N/D"}</p>
              </div>
            </div>

            {features.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Dotazioni</p>
                  <div className="flex flex-wrap gap-2">
                    {features.map((f) => (
                      <Badge key={f} variant="secondary">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posizione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Mappa non disponibile</p>
                <p className="text-xs">
                  {[immobile.indirizzo, immobile.zona, immobile.citta].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Note Interne</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {immobile.noteInterne || "Nessuna nota"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Esclusiva</span>
              <span>{immobile.esclusiva ? "Sì" : "No"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Multiagenzia</span>
              <span>{immobile.multiagenzia ? "Sì" : "No"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabMatching({ immobileId, immobile }: { immobileId: number; immobile: Immobile }) {
  const { toast } = useToast();
  const { data: matchingList = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/immobili", immobileId, "matching"],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobileId}/matching`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const generateMatchingMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/matching/generate", { richiestaId: undefined });
      return res.json();
    },
    onSuccess: (data) => {
      refetch();
      toast({ title: "Matching generati", description: `Trovati ${data.count} matching totali` });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile generare i matching", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Clienti interessati</h3>
          <p className="text-sm text-muted-foreground">Clienti con richieste compatibili con questo immobile</p>
        </div>
        <Button 
          onClick={() => generateMatchingMutation.mutate()}
          disabled={generateMatchingMutation.isPending}
          data-testid="button-genera-matching"
        >
          {generateMatchingMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4 mr-2" />
          )}
          Calcola Matching
        </Button>
      </div>

      {matchingList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nessun matching trovato</h3>
            <p className="text-muted-foreground text-sm text-center">
              Clicca "Calcola Matching" per trovare clienti con richieste compatibili
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {matchingList.map((match: any) => {
            const punteggio = match.punteggio || 0;

            return (
              <Card key={match.id} className="hover-elevate">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium truncate">
                          {match.cliente?.nome || "Cliente"} {match.cliente?.cognome || ""}
                        </h4>
                        <Badge variant="outline">Score: {punteggio}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 truncate">
                        {match.richiesta?.zona && `Zona: ${match.richiesta.zona}`}
                        {match.richiesta?.budgetMassimo && ` - Budget max: €${Number(match.richiesta.budgetMassimo).toLocaleString("it-IT")}`}
                      </p>
                      {match.richiesta?.mqMinimi && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Mq minimi: {match.richiesta.mqMinimi} - Camere: {match.richiesta.camereMinime || "N/D"}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {match.cliente?.telefono && (
                        <Button size="sm" variant="outline" asChild data-testid={`button-call-${match.id}`}>
                          <a href={`tel:${match.cliente.telefono}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      {match.cliente && (
                        <Link href={`/clienti/${match.cliente.id}`}>
                          <Button size="sm" variant="outline" data-testid={`button-view-client-${match.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabComunicazioni({ immobileId, immobile }: { immobileId: number; immobile?: Immobile }) {
  const { toast } = useToast();
  const { data: comunicazioni = [], isLoading } = useQuery<Comunicazione[]>({
    queryKey: ["/api/immobili", immobileId, "comunicazioni"],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobileId}/comunicazioni`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const updateEsitoMutation = useMutation({
    mutationFn: async ({ id, esito }: { id: number; esito: string }) => {
      const res = await apiRequest("PATCH", `/api/comunicazioni/${id}`, { esito });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "comunicazioni"] });
      queryClient.invalidateQueries({ queryKey: ["/api/comunicazioni"] });
      toast({ title: "Esito aggiornato" });
    },
  });

  const getCliente = (clienteId: number | null) => clienteId ? clienti.find((c) => c.id === clienteId) : null;

  const getCanaleIcon = (canale: string | null) => {
    switch (canale) {
      case "telefono":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "whatsapp":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getEsitoBadge = (esito: string | null) => {
    switch (esito) {
      case "interessato":
        return <Badge className="bg-green-500/10 text-green-600">Interessato</Badge>;
      case "non_interessato":
        return <Badge className="bg-red-500/10 text-red-600">Non interessato</Badge>;
      case "da_richiamare":
        return <Badge className="bg-yellow-500/10 text-yellow-700">Da richiamare</Badge>;
      case "in_attesa":
        return <Badge variant="outline">In attesa</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (comunicazioni.length === 0) {
    return (
      <div className="space-y-4">
        <MessaggiDaGestire immobileId={immobileId} immobile={immobile} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nessuna comunicazione</h3>
            <p className="text-muted-foreground text-sm">
              Non ci sono comunicazioni relative a questo immobile
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MessaggiDaGestire immobileId={immobileId} immobile={immobile} />
      {comunicazioni.map((com) => {
        const cliente = getCliente(com.clienteId);
        return (
          <Card key={com.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-muted rounded-full">{getCanaleIcon(com.canale)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">{cliente?.nome || "Cliente"}</h4>
                    <Badge variant="outline">{com.canale || "sistema"}</Badge>
                    <Badge variant="secondary">{com.tipo}</Badge>
                    {getEsitoBadge(com.esito)}
                  </div>
                  <p className="text-sm mt-1">{com.testo}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(com.dataOra), "dd MMM yyyy HH:mm", { locale: it })}
                    </p>
                    {com.tipo === "proposta" && (
                      <Select
                        value={com.esito || "in_attesa"}
                        onValueChange={(value) => updateEsitoMutation.mutate({ id: com.id, esito: value })}
                      >
                        <SelectTrigger className="w-40" data-testid={`select-esito-${com.id}`}>
                          <SelectValue placeholder="Esito" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_attesa">In attesa</SelectItem>
                          <SelectItem value="interessato">Interessato</SelectItem>
                          <SelectItem value="non_interessato">Non interessato</SelectItem>
                          <SelectItem value="da_richiamare">Da richiamare</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface NotificaArricchita {
  id: number;
  tipo: string;
  titolo: string | null;
  messaggio: string | null;
  letta: boolean;
  clienteId: number | null;
  immobileId: number | null;
  createdAt: string;
  cliente: Cliente | null;
}

function MessaggiDaGestire({ immobileId, immobile }: { immobileId: number; immobile?: Immobile }) {
  const { toast } = useToast();
  
  const { data: notifiche = [], isLoading, isError } = useQuery<NotificaArricchita[]>({
    queryKey: ["/api/immobili", immobileId, "notifiche-da-gestire"],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobileId}/notifiche-da-gestire`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const formatMessaggio = (notifica: NotificaArricchita) => {
    const clienteNome = notifica.cliente ? `${notifica.cliente.nome || ''} ${notifica.cliente.cognome || ''}`.trim() : 'Cliente';
    const indirizzoImmobile = immobile?.indirizzo || immobile?.titolo || '';
    if (indirizzoImmobile) {
      return `${clienteNome} ha richiesto informazioni per ${indirizzoImmobile}`;
    }
    return notifica.messaggio;
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/notifiche/${id}/letta`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "notifiche-da-gestire"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifiche"] });
      toast({ title: "Messaggio gestito" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare la notifica", variant: "destructive" });
    },
  });

  if (isError) return null;
  if (notifiche.length === 0 && !isLoading) return null;


  return (
    <div className="mb-6" data-testid="section-messaggi-da-gestire">
      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" data-testid="title-messaggi-da-gestire">
        <MessageCircle className="h-5 w-5 text-green-600" />
        Messaggi da Gestire ({isLoading ? '...' : notifiche.length})
      </h3>
      {isLoading ? (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Caricamento messaggi...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifiche.map((notifica) => {
            const cliente = notifica.cliente;
            const telefono = cliente?.telefono;
            
            return (
              <Card 
                key={notifica.id} 
                className="border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
                data-testid={`card-messaggio-da-gestire-${notifica.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-green-500 text-white" data-testid={`badge-da-gestire-${notifica.id}`}>Da gestire</Badge>
                        {cliente && (
                          <Link href={`/clienti/${cliente.id}`}>
                            <Badge variant="outline" className="cursor-pointer">
                              <Users className="h-3 w-3 mr-1" />
                              {cliente.nome} {cliente.cognome}
                            </Badge>
                          </Link>
                        )}
                      </div>
                      <p className="font-medium mt-2" data-testid={`text-titolo-${notifica.id}`}>{notifica.titolo}</p>
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`text-messaggio-${notifica.id}`}>{formatMessaggio(notifica)}</p>
                      <p className="text-xs text-muted-foreground mt-2" data-testid={`text-data-${notifica.id}`}>
                        {format(new Date(notifica.createdAt), "dd MMM yyyy HH:mm", { locale: it })}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      {telefono ? (
                        <Button
                          size="sm"
                          asChild
                          data-testid={`button-whatsapp-reply-${notifica.id}`}
                        >
                          <Link href={`/whatsapp?phone=${encodeURIComponent(telefono)}`}>
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Rispondi
                          </Link>
                        </Button>
                      ) : cliente?.email ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          asChild
                          data-testid={`button-email-reply-${notifica.id}`}
                        >
                          <a href={`mailto:${cliente.email}`}>
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </a>
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsReadMutation.mutate(notifica.id)}
                        data-testid={`button-mark-gestito-${notifica.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Gestito
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabAttivita({ immobileId }: { immobileId: number }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ titolo: "", descrizione: "", stato: "da_fare" });
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; type: 'whatsapp' | 'email'; task: AttivitaCliente | null; cliente: Cliente | null }>({
    open: false,
    type: 'whatsapp',
    task: null,
    cliente: null
  });
  const [replyMessage, setReplyMessage] = useState("");

  const { data: attivita = [], isLoading } = useQuery<AttivitaImmobile[]>({
    queryKey: ["/api/immobili", immobileId, "attivita"],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobileId}/attivita`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Attività cliente collegate a questo immobile
  const { data: attivitaCliente = [] } = useQuery<AttivitaCliente[]>({
    queryKey: ["/api/attivita-cliente", "immobile", immobileId],
    queryFn: async () => {
      const res = await fetch(`/api/attivita-cliente?immobileId=${immobileId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Recupera tutti i clienti per avere accesso a telefono/email
  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const getCliente = (clienteId: number) => clienti.find(c => c.id === clienteId);

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTask) => {
      return apiRequest("POST", `/api/immobili/${immobileId}/attivita`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "attivita"] });
      toast({ title: "Attività creata" });
      setShowForm(false);
      setNewTask({ titolo: "", descrizione: "", stato: "da_fare" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completata }: { id: number; completata: boolean }) => {
      return apiRequest("PATCH", `/api/attivita/${id}`, { stato: completata ? "fatto" : "da_fare" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "attivita"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/attivita/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "attivita"] });
      toast({ title: "Attività eliminata" });
    },
  });

  const toggleClienteActivityMutation = useMutation({
    mutationFn: async ({ id, stato }: { id: number; stato: string }) => {
      return apiRequest("PATCH", `/api/attivita-cliente/${id}`, { stato });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attivita-cliente", "immobile", immobileId] });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ clienteId, type, message, taskId }: { clienteId: number; type: 'whatsapp' | 'email'; message: string; taskId: number }) => {
      return apiRequest("POST", `/api/clienti/${clienteId}/comunicazioni/invia`, {
        canale: type,
        messaggio: message,
        immobileId,
        attivitaClienteId: taskId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attivita-cliente", "immobile", immobileId] });
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "comunicazioni"] });
      toast({ title: "Messaggio inviato e attività completata" });
      setReplyDialog({ open: false, type: 'whatsapp', task: null, cliente: null });
      setReplyMessage("");
    },
    onError: (error: Error) => {
      toast({ title: "Errore nell'invio", description: error.message, variant: "destructive" });
    }
  });

  const openReplyDialog = (task: AttivitaCliente, type: 'whatsapp' | 'email') => {
    const cliente = getCliente(task.clienteId);
    if (cliente) {
      setReplyDialog({ open: true, type, task, cliente });
      setReplyMessage("");
    } else {
      toast({ title: "Cliente non trovato", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} data-testid="button-new-activity">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Attività
        </Button>
      </div>

      {attivita.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nessuna attività</h3>
            <p className="text-muted-foreground text-sm">
              Aggiungi attività e task per questo immobile
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {attivita.map((task) => (
            <Card key={task.id} className={task.stato === "fatto" ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={task.stato === "fatto"}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: task.id, completata: !!checked })
                    }
                    data-testid={`checkbox-task-${task.id}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-medium ${task.stato === "fatto" ? "line-through" : ""}`}
                      >
                        {task.titolo}
                      </p>
                      <Badge
                        variant={
                          task.stato === "fatto"
                            ? "secondary"
                            : task.stato === "in_corso"
                            ? "default"
                            : "outline"
                        }
                      >
                        {task.stato === "fatto" ? "Fatto" : task.stato === "in_corso" ? "In Corso" : "Da Fare"}
                      </Badge>
                    </div>
                    {task.descrizione && (
                      <p className="text-sm text-muted-foreground mt-1">{task.descrizione}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(task.id)}
                    data-testid={`button-delete-task-${task.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Sezione Richieste dai Clienti */}
      {attivitaCliente.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Richieste dai Clienti</h3>
          <div className="space-y-3">
            {attivitaCliente.map((task) => {
              const cliente = getCliente(task.clienteId);
              const isCompleted = task.stato === "fatto";
              const isUrgent = task.titolo?.toLowerCase().includes("urgente");
              const hasPhone = cliente?.telefono;
              const hasEmail = cliente?.email;
              return (
                <Card key={`cliente-${task.id}`} className={isCompleted ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleClienteActivityMutation.mutate({ 
                          id: task.id, 
                          stato: isCompleted ? "da_fare" : "fatto" 
                        })}
                        className="mt-1 flex-shrink-0"
                        data-testid={`button-toggle-cliente-attivita-${task.id}`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium ${isCompleted ? 'line-through' : ''}`}>
                            {task.titolo}
                          </p>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs">Urgente</Badge>
                          )}
                          {cliente && (
                            <Link href={`/clienti/${task.clienteId}`}>
                              <Badge variant="outline" className="text-xs cursor-pointer">
                                <Users className="h-3 w-3 mr-1" />
                                {cliente.nome} {cliente.cognome}
                              </Badge>
                            </Link>
                          )}
                        </div>
                        {task.descrizione && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.descrizione}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(task.createdAt).toLocaleDateString('it-IT', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {!isCompleted && (
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReplyDialog(task, 'whatsapp')}
                              disabled={!hasPhone}
                              data-testid={`button-reply-whatsapp-immobile-${task.id}`}
                            >
                              <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
                              Rispondi WhatsApp
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openReplyDialog(task, 'email')}
                              disabled={!hasEmail}
                              data-testid={`button-reply-email-immobile-${task.id}`}
                            >
                              <Mail className="h-4 w-4 mr-1 text-blue-600" />
                              Rispondi Email
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Dialog risposta WhatsApp/Email */}
      <Dialog open={replyDialog.open} onOpenChange={(open) => setReplyDialog({ ...replyDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {replyDialog.type === 'whatsapp' ? (
                <span className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  Rispondi via WhatsApp
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-blue-600" />
                  Rispondi via Email
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Destinatario</Label>
              <p className="font-medium">
                {replyDialog.cliente?.nome} {replyDialog.cliente?.cognome}
                {replyDialog.type === 'whatsapp' ? ` - ${replyDialog.cliente?.telefono || 'N/A'}` : ` - ${replyDialog.cliente?.email || 'N/A'}`}
              </p>
            </div>
            {replyDialog.task && (
              <div>
                <Label className="text-sm text-muted-foreground">In risposta a</Label>
                <p className="text-sm">{replyDialog.task.titolo}</p>
              </div>
            )}
            <div>
              <Label>Messaggio</Label>
              <Textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Scrivi il tuo messaggio..."
                rows={5}
                data-testid="textarea-reply-message-immobile"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog({ open: false, type: 'whatsapp', task: null, cliente: null })}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                if (replyDialog.task && replyDialog.cliente) {
                  sendReplyMutation.mutate({
                    clienteId: replyDialog.cliente.id,
                    type: replyDialog.type,
                    message: replyMessage,
                    taskId: replyDialog.task.id
                  });
                }
              }}
              disabled={!replyMessage.trim() || sendReplyMutation.isPending}
              data-testid="button-send-reply-immobile"
            >
              {sendReplyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Invia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuova Attività</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Titolo</label>
              <Input
                value={newTask.titolo}
                onChange={(e) => setNewTask({ ...newTask, titolo: e.target.value })}
                placeholder="Titolo attività"
                data-testid="input-task-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Descrizione</label>
              <Textarea
                value={newTask.descrizione}
                onChange={(e) => setNewTask({ ...newTask, descrizione: e.target.value })}
                placeholder="Descrizione opzionale"
                data-testid="input-task-description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stato</label>
              <Select
                value={newTask.stato}
                onValueChange={(v) => setNewTask({ ...newTask, stato: v })}
              >
                <SelectTrigger data-testid="select-task-stato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="da_fare">Da Fare</SelectItem>
                  <SelectItem value="in_corso">In Corso</SelectItem>
                  <SelectItem value="fatto">Fatto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => createMutation.mutate(newTask)}
              disabled={!newTask.titolo || createMutation.isPending}
              data-testid="button-save-task"
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabAppuntamenti({ immobileId }: { immobileId: number }) {
  const { data: appuntamenti = [], isLoading } = useQuery<Appuntamento[]>({
    queryKey: ["/api/immobili", immobileId, "appuntamenti"],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobileId}/appuntamenti`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const getCliente = (clienteId: number) => clienti.find((c) => c.id === clienteId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (appuntamenti.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nessun appuntamento</h3>
          <p className="text-muted-foreground text-sm">
            Non ci sono appuntamenti per questo immobile
          </p>
          <Link href="/appuntamenti">
            <Button className="mt-4" data-testid="button-go-to-appointments">
              Vai agli Appuntamenti
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appuntamenti.map((app) => {
        const cliente = getCliente(app.clienteId);
        const isPast = new Date(app.dataOra) < new Date();

        return (
          <Card key={app.id} className={isPast ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center p-2 bg-muted rounded-md min-w-16">
                    <p className="text-xl font-bold">
                      {format(new Date(app.dataOra), "dd")}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      {format(new Date(app.dataOra), "MMM", { locale: it })}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{app.luogo || "Appuntamento"}</h4>
                      {app.confermato && (
                        <Badge variant="default">Confermato</Badge>
                      )}
                      {app.completato && (
                        <Badge variant="secondary">Completato</Badge>
                      )}
                      {!app.confermato && !app.completato && (
                        <Badge variant="outline">In attesa</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(app.dataOra), "HH:mm")} - {cliente?.nome || "Cliente"}
                    </p>
                    {app.esito && (
                      <p className="text-xs text-muted-foreground mt-1">Esito: {app.esito}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TabDocumenti({ immobileId }: { immobileId: number }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ nome: "", tipo: "altro", url: "" });

  const { data: documenti = [], isLoading } = useQuery<DocumentoImmobile[]>({
    queryKey: ["/api/immobili", immobileId, "documenti"],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobileId}/documenti`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newDoc) => {
      return apiRequest("POST", `/api/immobili/${immobileId}/documenti`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "documenti"] });
      toast({ title: "Documento aggiunto" });
      setShowForm(false);
      setNewDoc({ nome: "", tipo: "altro", url: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/documenti/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "documenti"] });
      toast({ title: "Documento eliminato" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} data-testid="button-new-document">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Documento
        </Button>
      </div>

      {documenti.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nessun documento</h3>
            <p className="text-muted-foreground text-sm">
              Carica documenti relativi a questo immobile
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documenti.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-md">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.nome}</p>
                      <Badge variant="outline" className="mt-1">
                        {doc.tipo}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {doc.url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Documento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome</label>
              <Input
                value={newDoc.nome}
                onChange={(e) => setNewDoc({ ...newDoc, nome: e.target.value })}
                placeholder="Nome documento"
                data-testid="input-doc-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={newDoc.tipo}
                onValueChange={(v) => setNewDoc({ ...newDoc, tipo: v })}
              >
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ape">APE</SelectItem>
                  <SelectItem value="planimetria">Planimetria</SelectItem>
                  <SelectItem value="visura">Visura</SelectItem>
                  <SelectItem value="rogito">Rogito</SelectItem>
                  <SelectItem value="foto">Foto</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">URL (opzionale)</label>
              <Input
                value={newDoc.url}
                onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                placeholder="https://..."
                data-testid="input-doc-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => createMutation.mutate(newDoc)}
              disabled={!newDoc.nome || createMutation.isPending}
              data-testid="button-save-doc"
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabMarketing({ immobileId }: { immobileId: number }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newPortale, setNewPortale] = useState({
    nomePortale: "",
    urlAnnuncio: "",
    stato: "attivo",
  });

  const { data: portali = [], isLoading } = useQuery<PortaleImmobile[]>({
    queryKey: ["/api/immobili", immobileId, "portali"],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobileId}/portali`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newPortale) => {
      return apiRequest("POST", `/api/immobili/${immobileId}/portali`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "portali"] });
      toast({ title: "Portale aggiunto" });
      setShowForm(false);
      setNewPortale({ nomePortale: "", urlAnnuncio: "", stato: "attivo" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/portali/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili", immobileId, "portali"] });
      toast({ title: "Portale rimosso" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} data-testid="button-new-portal">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Portale
        </Button>
      </div>

      {portali.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nessun portale</h3>
            <p className="text-muted-foreground text-sm">
              Aggiungi i portali dove è pubblicato questo immobile
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portali.map((portale) => (
            <Card key={portale.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{portale.nomePortale}</h4>
                    <Badge
                      variant={portale.stato === "attivo" ? "default" : "secondary"}
                      className="mt-2"
                    >
                      {portale.stato}
                    </Badge>
                    {portale.dataPubblicazione && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Pubblicato:{" "}
                        {format(new Date(portale.dataPubblicazione), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {portale.urlAnnuncio && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={portale.urlAnnuncio} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(portale.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo Portale</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome Portale</label>
              <Select
                value={newPortale.nomePortale}
                onValueChange={(v) => setNewPortale({ ...newPortale, nomePortale: v })}
              >
                <SelectTrigger data-testid="select-portal-name">
                  <SelectValue placeholder="Seleziona portale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Immobiliare.it">Immobiliare.it</SelectItem>
                  <SelectItem value="Idealista">Idealista</SelectItem>
                  <SelectItem value="Casa.it">Casa.it</SelectItem>
                  <SelectItem value="Subito.it">Subito.it</SelectItem>
                  <SelectItem value="Altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">URL Annuncio</label>
              <Input
                value={newPortale.urlAnnuncio}
                onChange={(e) => setNewPortale({ ...newPortale, urlAnnuncio: e.target.value })}
                placeholder="https://..."
                data-testid="input-portal-url"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Stato</label>
              <Select
                value={newPortale.stato}
                onValueChange={(v) => setNewPortale({ ...newPortale, stato: v })}
              >
                <SelectTrigger data-testid="select-portal-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attivo">Attivo</SelectItem>
                  <SelectItem value="sospeso">Sospeso</SelectItem>
                  <SelectItem value="scaduto">Scaduto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Annulla
            </Button>
            <Button
              onClick={() => createMutation.mutate(newPortale)}
              disabled={!newPortale.nomePortale || createMutation.isPending}
              data-testid="button-save-portal"
            >
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabStatistiche({ immobile }: { immobile: Immobile }) {
  const { data: storicoPrezzo = [], isLoading } = useQuery<StoricoPrezzo[]>({
    queryKey: ["/api/immobili", immobile.id, "storico-prezzo"],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobile.id}/storico-prezzo`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Storico Prezzo</CardTitle>
          <CardDescription>Andamento del prezzo nel tempo</CardDescription>
        </CardHeader>
        <CardContent>
          {storicoPrezzo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nessuna variazione di prezzo registrata
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {storicoPrezzo.map((sp, i) => (
                  <div key={sp.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {format(new Date(sp.dataModifica), "dd/MM/yyyy")}
                    </span>
                    <span className="font-medium">
                      €{Number(sp.prezzo).toLocaleString("it-IT")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistiche Generali</CardTitle>
          <CardDescription>Panoramica dell'immobile</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Prezzo al mq</span>
              <span className="font-medium">
                {immobile.mq && immobile.prezzo
                  ? `€${Math.round(Number(immobile.prezzo) / immobile.mq).toLocaleString("it-IT")}`
                  : "N/D"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Giorni in vendita</span>
              <span className="font-medium">
                {immobile.createdAt
                  ? Math.floor(
                      (Date.now() - new Date(immobile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                    )
                  : "N/D"}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Variazioni prezzo</span>
              <span className="font-medium">{storicoPrezzo.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ImmobileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const immobileId = parseInt(id || "0");

  const { data: immobile, isLoading, error } = useQuery<Immobile>({
    queryKey: ["/api/immobili", immobileId],
    queryFn: async () => {
      const res = await fetch(`/api/immobili/${immobileId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!immobileId,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !immobile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Immobile non trovato</h3>
            <p className="text-muted-foreground text-sm">
              L'immobile richiesto non esiste o è stato eliminato
            </p>
            <Link href="/immobili">
              <Button className="mt-4" data-testid="button-back-to-properties">
                Torna agli Immobili
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PropertyHeader immobile={immobile} />

      <div className="p-6">
        <MessaggiDaGestire immobileId={immobile.id} immobile={immobile} />
        
        <Tabs defaultValue="dettagli" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-property-detail">
            <TabsTrigger value="dettagli" data-testid="tab-dettagli">
              <Home className="h-4 w-4 mr-2" />
              Dettagli
            </TabsTrigger>
            <TabsTrigger value="matching" data-testid="tab-matching">
              <Users className="h-4 w-4 mr-2" />
              Matching
            </TabsTrigger>
            <TabsTrigger value="comunicazioni" data-testid="tab-comunicazioni">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comunicazioni
            </TabsTrigger>
            <TabsTrigger value="attivita" data-testid="tab-attivita">
              <CheckSquare className="h-4 w-4 mr-2" />
              Attività
            </TabsTrigger>
            <TabsTrigger value="appuntamenti" data-testid="tab-appuntamenti">
              <Calendar className="h-4 w-4 mr-2" />
              Appuntamenti
            </TabsTrigger>
            <TabsTrigger value="documenti" data-testid="tab-documenti">
              <FileText className="h-4 w-4 mr-2" />
              Documenti
            </TabsTrigger>
            <TabsTrigger value="marketing" data-testid="tab-marketing">
              <Globe className="h-4 w-4 mr-2" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="statistiche" data-testid="tab-statistiche">
              <ChartBar className="h-4 w-4 mr-2" />
              Statistiche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dettagli">
            <TabDettagli immobile={immobile} />
          </TabsContent>
          <TabsContent value="matching">
            <TabMatching immobileId={immobile.id} immobile={immobile} />
          </TabsContent>
          <TabsContent value="comunicazioni">
            <TabComunicazioni immobileId={immobile.id} immobile={immobile} />
          </TabsContent>
          <TabsContent value="attivita">
            <TabAttivita immobileId={immobile.id} />
          </TabsContent>
          <TabsContent value="appuntamenti">
            <TabAppuntamenti immobileId={immobile.id} />
          </TabsContent>
          <TabsContent value="documenti">
            <TabDocumenti immobileId={immobile.id} />
          </TabsContent>
          <TabsContent value="marketing">
            <TabMarketing immobileId={immobile.id} />
          </TabsContent>
          <TabsContent value="statistiche">
            <TabStatistiche immobile={immobile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
