import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  Star,
  Plus,
  Building2,
  FileText,
  MessageSquare,
  CalendarDays,
  Send,
  ClipboardList,
  CheckCircle2,
  Circle,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ClienteForm } from "./cliente-form";
import { RichiestaForm } from "../richieste/richiesta-form";
import type { Cliente, Richiesta, Immobile, Comunicazione, Appuntamento, AttivitaCliente } from "@shared/schema";

function ClienteHeader({ cliente, onEdit, onDelete }: { 
  cliente: Cliente; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tipoLabel = cliente.tipoCliente === "compratore" ? "Compratore" : 
    cliente.tipoCliente === "venditore" ? "Venditore" : "Compratore/Venditore";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-semibold">
          {cliente.nome?.[0] || ''}{cliente.cognome?.[0] || ''}
        </div>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold" data-testid="text-client-fullname">
              {cliente.appellativo && `${cliente.appellativo} `}
              {cliente.nome} {cliente.cognome}
            </h1>
            <Badge variant={cliente.attivo ? "default" : "secondary"}>
              {cliente.attivo ? "Attivo" : "Inattivo"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <Badge variant="outline">{tipoLabel}</Badge>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${star <= (cliente.ratingCliente ?? 3) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground flex-wrap">
            {cliente.telefono && (
              <a href={`tel:${cliente.telefono}`} className="flex items-center gap-1.5 hover:text-foreground">
                <Phone className="h-4 w-4" />
                {cliente.telefono}
              </a>
            )}
            {cliente.email && (
              <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 hover:text-foreground">
                <Mail className="h-4 w-4" />
                {cliente.email}
              </a>
            )}
            {cliente.compleanno && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {new Date(cliente.compleanno).toLocaleDateString('it-IT')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onEdit} data-testid="button-edit-client">
          <Edit className="h-4 w-4 mr-2" />
          Modifica
        </Button>
        <Button variant="destructive" onClick={onDelete} data-testid="button-delete-client">
          <Trash2 className="h-4 w-4 mr-2" />
          Elimina
        </Button>
      </div>
    </div>
  );
}

function TabPanoramica({ cliente }: { cliente: Cliente }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Personali</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Nome Completo</dt>
              <dd className="mt-1">{cliente.appellativo} {cliente.nome} {cliente.cognome}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Tipo Cliente</dt>
              <dd className="mt-1 capitalize">{cliente.tipoCliente}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Telefono</dt>
              <dd className="mt-1">{cliente.telefono || "Non specificato"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1">{cliente.email || "Non specificata"}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Data di Nascita</dt>
              <dd className="mt-1">
                {cliente.compleanno 
                  ? new Date(cliente.compleanno).toLocaleDateString('it-IT') 
                  : "Non specificata"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Religione</dt>
              <dd className="mt-1 capitalize">{cliente.religione || "Non specificata"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {cliente.note && (
        <Card>
          <CardHeader>
            <CardTitle>Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap" data-testid="text-client-notes">{cliente.note}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informazioni Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Data Creazione</dt>
              <dd className="mt-1">
                {new Date(cliente.createdAt).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Ultimo Aggiornamento</dt>
              <dd className="mt-1">
                {new Date(cliente.updatedAt).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function TabRichieste({ clienteId, onAddRichiesta }: { clienteId: number; onAddRichiesta: () => void }) {
  const { data: richieste = [], isLoading } = useQuery<Richiesta[]>({
    queryKey: ["/api/richieste", "cliente", clienteId],
    queryFn: async () => {
      const res = await fetch(`/api/richieste?clienteId=${clienteId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (richieste.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium">Nessuna richiesta</h3>
          <p className="text-muted-foreground text-center mt-1">
            Questo cliente non ha ancora richieste attive
          </p>
          <Button className="mt-4" onClick={onAddRichiesta} data-testid="button-add-request">
            <Plus className="h-4 w-4 mr-2" />
            Nuova Richiesta
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onAddRichiesta} data-testid="button-add-request">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Richiesta
        </Button>
      </div>
      {richieste.map((richiesta) => (
        <Card key={richiesta.id} className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Richiesta #{richiesta.id}</h3>
                  <Badge variant={richiesta.attiva ? "default" : "secondary"}>
                    {richiesta.attiva ? "Attiva" : "Inattiva"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {richiesta.descrizioneLibera || "Nessuna descrizione"}
                </p>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  {richiesta.zona && <span>Zona: {richiesta.zona}</span>}
                  {richiesta.budgetMassimo && (
                    <span>Budget: €{Number(richiesta.budgetMassimo).toLocaleString('it-IT')}</span>
                  )}
                  {richiesta.mqMinimi && <span>Min. {richiesta.mqMinimi} mq</span>}
                </div>
              </div>
              <Link href={`/richieste/${richiesta.id}`}>
                <Button variant="outline" size="sm" data-testid={`button-view-request-${richiesta.id}`}>
                  Dettagli
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TabImmobili({ clienteId }: { clienteId: number }) {
  const { data: immobili = [], isLoading } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili", "proprietario", clienteId],
    queryFn: async () => {
      const res = await fetch(`/api/immobili?proprietarioId=${clienteId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (immobili.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium">Nessun immobile</h3>
          <p className="text-muted-foreground text-center mt-1">
            Questo cliente non ha immobili in vendita
          </p>
          <Link href={`/immobili/nuovo?proprietarioId=${clienteId}`}>
            <Button className="mt-4" data-testid="button-add-property">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi Immobile
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {immobili.map((immobile) => (
        <Card key={immobile.id} className="hover-elevate">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link href={`/immobili/${immobile.id}`}>
                  <h3 className="font-medium hover:underline cursor-pointer" data-testid={`text-property-${immobile.id}`}>
                    {immobile.titolo}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground">{immobile.zona || immobile.indirizzo}</p>
              </div>
              <Badge variant={immobile.attivo ? "default" : "secondary"}>
                {immobile.attivo ? "Attivo" : "Inattivo"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm">
              {immobile.prezzo && (
                <span className="font-medium">€{Number(immobile.prezzo).toLocaleString('it-IT')}</span>
              )}
              {immobile.mq && <span>{immobile.mq} mq</span>}
              {immobile.camere && <span>{immobile.camere} camere</span>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CommunicationComposer({ clienteId, cliente }: { clienteId: number; cliente: Cliente }) {
  const { toast } = useToast();
  const [canale, setCanale] = useState<"whatsapp" | "email">("whatsapp");
  const [messaggio, setMessaggio] = useState("");
  const [immobileId, setImmobileId] = useState<string>("");
  const [tipo, setTipo] = useState<string>("nota");

  const { data: immobiliProprietario = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili", "proprietario", clienteId],
    queryFn: async () => {
      const res = await fetch(`/api/immobili?proprietarioId=${clienteId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { canale: string; messaggio: string; immobileId?: number; tipo: string }) => {
      const res = await apiRequest("POST", `/api/clienti/${clienteId}/comunicazioni/invia`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Invio fallito");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comunicazioni", "cliente", clienteId] });
      queryClient.invalidateQueries({ queryKey: ["/api/attivita", "cliente", clienteId] });
      toast({ title: "Messaggio inviato", description: `${canale === "whatsapp" ? "WhatsApp" : "Email"} inviato con successo` });
      setMessaggio("");
      setImmobileId("");
    },
    onError: (error: Error) => {
      toast({ title: "Errore invio", description: error.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!messaggio.trim()) {
      toast({ title: "Messaggio vuoto", description: "Inserisci un messaggio", variant: "destructive" });
      return;
    }
    sendMutation.mutate({
      canale,
      messaggio: messaggio.trim(),
      immobileId: immobileId ? parseInt(immobileId) : undefined,
      tipo,
    });
  };

  const canSendWhatsApp = !!cliente.telefono;
  const canSendEmail = !!cliente.email;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Invia Comunicazione</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant={canale === "whatsapp" ? "default" : "outline"}
            size="sm"
            onClick={() => setCanale("whatsapp")}
            disabled={!canSendWhatsApp}
            data-testid="button-channel-whatsapp"
          >
            <Phone className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
          <Button
            variant={canale === "email" ? "default" : "outline"}
            size="sm"
            onClick={() => setCanale("email")}
            disabled={!canSendEmail}
            data-testid="button-channel-email"
          >
            <Mail className="h-4 w-4 mr-1" />
            Email
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo comunicazione</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger data-testid="select-communication-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nota">Nota</SelectItem>
                <SelectItem value="proposta">Proposta</SelectItem>
                <SelectItem value="richiesta">Richiesta</SelectItem>
                <SelectItem value="risposta">Risposta</SelectItem>
                <SelectItem value="followup">Follow-up</SelectItem>
                <SelectItem value="auguri">Auguri</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {immobiliProprietario.length > 0 && (
            <div className="space-y-2">
              <Label>Collega a immobile (opzionale)</Label>
              <Select value={immobileId} onValueChange={setImmobileId}>
                <SelectTrigger data-testid="select-property-link">
                  <SelectValue placeholder="Nessun immobile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nessun immobile</SelectItem>
                  {immobiliProprietario.map((imm) => (
                    <SelectItem key={imm.id} value={String(imm.id)}>
                      {imm.titolo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Messaggio</Label>
          <Textarea
            value={messaggio}
            onChange={(e) => setMessaggio(e.target.value)}
            placeholder={`Scrivi il tuo messaggio ${canale === "whatsapp" ? "WhatsApp" : "email"}...`}
            rows={4}
            data-testid="input-message"
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSend}
            disabled={sendMutation.isPending || !messaggio.trim()}
            data-testid="button-send-communication"
          >
            {sendMutation.isPending ? (
              "Invio..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Invia {canale === "whatsapp" ? "WhatsApp" : "Email"}
              </>
            )}
          </Button>
        </div>

        {!canSendWhatsApp && !canSendEmail && (
          <p className="text-sm text-muted-foreground">
            Il cliente non ha telefono o email configurati
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TabComunicazioni({ clienteId, cliente }: { clienteId: number; cliente: Cliente }) {
  const { toast } = useToast();
  const { data: comunicazioni = [], isLoading } = useQuery<Comunicazione[]>({
    queryKey: ["/api/comunicazioni", "cliente", clienteId],
    queryFn: async () => {
      const res = await fetch(`/api/comunicazioni?clienteId=${clienteId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data: immobili = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const updateEsitoMutation = useMutation({
    mutationFn: async ({ id, esito }: { id: number; esito: string }) => {
      const res = await apiRequest("PATCH", `/api/comunicazioni/${id}`, { esito });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comunicazioni", "cliente", clienteId] });
      toast({ title: "Esito aggiornato" });
    },
  });

  const getImmobile = (immobileId: number | null) => immobileId ? immobili.find((i) => i.id === immobileId) : null;

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
      <div>
        <CommunicationComposer clienteId={clienteId} cliente={cliente} />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">Nessuna comunicazione</h3>
            <p className="text-muted-foreground text-center mt-1">
              Non ci sono ancora comunicazioni con questo cliente
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <CommunicationComposer clienteId={clienteId} cliente={cliente} />
      <div className="space-y-3">
      {comunicazioni.map((com) => {
        const immobile = getImmobile(com.immobileId);
        const indirizzo = immobile ? `${immobile.indirizzo || immobile.zona || ""}, ${immobile.citta || ""}`.trim() : null;
        
        return (
          <Card key={com.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full 
                  ${com.canale === 'whatsapp' ? 'bg-green-500/10 text-green-600' :
                    com.canale === 'email' ? 'bg-blue-500/10 text-blue-600' :
                    com.canale === 'telefono' ? 'bg-amber-500/10 text-amber-600' :
                    'bg-muted text-muted-foreground'}`}
                >
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">{com.tipo}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{com.canale}</Badge>
                    {getEsitoBadge(com.esito)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(com.dataOra).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm mt-2">{com.testo}</p>
                  {indirizzo && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Immobile: {indirizzo}
                    </p>
                  )}
                  {com.tipo === "proposta" && (
                    <div className="mt-2">
                      <Select
                        value={com.esito || "in_attesa"}
                        onValueChange={(value) => updateEsitoMutation.mutate({ id: com.id, esito: value })}
                      >
                        <SelectTrigger className="w-40" data-testid={`select-esito-cliente-${com.id}`}>
                          <SelectValue placeholder="Esito" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_attesa">In attesa</SelectItem>
                          <SelectItem value="interessato">Interessato</SelectItem>
                          <SelectItem value="non_interessato">Non interessato</SelectItem>
                          <SelectItem value="da_richiamare">Da richiamare</SelectItem>
                        </SelectContent>
                      </Select>
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
  );
}

function TabAppuntamenti({ clienteId }: { clienteId: number }) {
  const { data: appuntamenti = [], isLoading } = useQuery<Appuntamento[]>({
    queryKey: ["/api/appuntamenti", "cliente", clienteId],
    queryFn: async () => {
      const res = await fetch(`/api/appuntamenti?clienteId=${clienteId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (appuntamenti.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium">Nessun appuntamento</h3>
          <p className="text-muted-foreground text-center mt-1">
            Non ci sono appuntamenti programmati con questo cliente
          </p>
          <Link href={`/appuntamenti/nuovo?clienteId=${clienteId}`}>
            <Button className="mt-4" data-testid="button-new-appointment">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Appuntamento
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {appuntamenti.map((app) => {
        const data = new Date(app.dataOra);
        const isPast = data < new Date();
        return (
          <Card key={app.id} className={isPast ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-center min-w-16">
                  <p className="text-2xl font-bold">{data.getDate()}</p>
                  <p className="text-xs text-muted-foreground uppercase">
                    {data.toLocaleDateString('it-IT', { month: 'short' })}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{app.luogo || "Luogo da definire"}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {app.note && (
                    <p className="text-sm text-muted-foreground mt-1">{app.note}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  {app.completato ? (
                    <Badge variant="secondary">Completato</Badge>
                  ) : app.confermato ? (
                    <Badge className="bg-green-500/10 text-green-600">Confermato</Badge>
                  ) : (
                    <Badge variant="outline">In attesa</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TabAttivita({ clienteId, cliente }: { clienteId: number; cliente?: Cliente }) {
  const { toast } = useToast();
  const [replyDialog, setReplyDialog] = useState<{ open: boolean; type: 'whatsapp' | 'email'; task: AttivitaCliente | null }>({
    open: false,
    type: 'whatsapp',
    task: null
  });
  const [replyMessage, setReplyMessage] = useState("");
  
  const { data: attivita = [], isLoading } = useQuery<AttivitaCliente[]>({
    queryKey: ["/api/clienti", clienteId, "attivita"],
    queryFn: async () => {
      const res = await fetch(`/api/clienti/${clienteId}/attivita`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const toggleStatoMutation = useMutation({
    mutationFn: async ({ id, stato }: { id: number; stato: string }) => {
      return apiRequest("PATCH", `/api/attivita-cliente/${id}`, { stato });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clienti", clienteId, "attivita"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attivita-cliente"] });
      toast({ title: "Stato aggiornato" });
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ type, message, taskId }: { type: 'whatsapp' | 'email'; message: string; taskId: number }) => {
      const task = attivita.find(t => t.id === taskId);
      return apiRequest("POST", `/api/clienti/${clienteId}/comunicazioni/invia`, {
        canale: type,
        messaggio: message,
        immobileId: task?.immobileId || null,
        attivitaClienteId: taskId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clienti", clienteId, "attivita"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clienti", clienteId, "comunicazioni"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attivita-cliente"] });
      toast({ title: "Messaggio inviato e attività completata" });
      setReplyDialog({ open: false, type: 'whatsapp', task: null });
      setReplyMessage("");
    },
    onError: (error: Error) => {
      toast({ title: "Errore nell'invio", description: error.message, variant: "destructive" });
    }
  });

  const openReplyDialog = (task: AttivitaCliente, type: 'whatsapp' | 'email') => {
    setReplyDialog({ open: true, type, task });
    setReplyMessage("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (attivita.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-medium">Nessuna attività</h3>
          <p className="text-muted-foreground text-center mt-1">
            Non ci sono attività registrate per questo cliente
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasPhone = cliente?.telefono;
  const hasEmail = cliente?.email;

  return (
    <>
      <div className="space-y-3">
        {attivita.map((task) => {
          const isCompleted = task.stato === "fatto";
          const isUrgent = task.titolo?.toLowerCase().includes("urgente");
          return (
            <Card key={task.id} className={isCompleted ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleStatoMutation.mutate({ 
                      id: task.id, 
                      stato: isCompleted ? "da_fare" : "fatto" 
                    })}
                    className="mt-1 flex-shrink-0"
                    data-testid={`button-toggle-attivita-${task.id}`}
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
                      {task.immobileId && (
                        <Link href={`/immobili/${task.immobileId}`}>
                          <Badge variant="outline" className="text-xs cursor-pointer">
                            <Building2 className="h-3 w-3 mr-1" />
                            Immobile #{task.immobileId}
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
                          data-testid={`button-reply-whatsapp-${task.id}`}
                        >
                          <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
                          Rispondi WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReplyDialog(task, 'email')}
                          disabled={!hasEmail}
                          data-testid={`button-reply-email-${task.id}`}
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
                {cliente?.nome} {cliente?.cognome}
                {replyDialog.type === 'whatsapp' ? ` - ${cliente?.telefono || 'N/A'}` : ` - ${cliente?.email || 'N/A'}`}
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
                data-testid="textarea-reply-message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog({ open: false, type: 'whatsapp', task: null })}>
              Annulla
            </Button>
            <Button
              onClick={() => {
                if (replyDialog.task) {
                  sendReplyMutation.mutate({
                    type: replyDialog.type,
                    message: replyMessage,
                    taskId: replyDialog.task.id
                  });
                }
              }}
              disabled={!replyMessage.trim() || sendReplyMutation.isPending}
              data-testid="button-send-reply"
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
    </>
  );
}

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRichiestaForm, setShowRichiestaForm] = useState(false);

  const clienteId = parseInt(params.id || "0");

  const { data: cliente, isLoading } = useQuery<Cliente>({
    queryKey: ["/api/clienti", clienteId],
    enabled: clienteId > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/clienti/${clienteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clienti"] });
      toast({ title: "Cliente eliminato con successo" });
      navigate("/clienti");
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile eliminare il cliente", 
        variant: "destructive" 
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-medium">Cliente non trovato</h3>
            <p className="text-muted-foreground mt-1">
              Il cliente richiesto non esiste o è stato eliminato
            </p>
            <Link href="/clienti">
              <Button className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna ai Clienti
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/clienti">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-muted-foreground">Clienti</span>
        <span className="text-muted-foreground">/</span>
        <span>{cliente.nome} {cliente.cognome}</span>
      </div>

      <ClienteHeader 
        cliente={cliente} 
        onEdit={() => setShowEditForm(true)}
        onDelete={() => setShowDeleteDialog(true)}
      />

      <Tabs defaultValue="panoramica" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
          <TabsTrigger 
            value="panoramica" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-panoramica"
          >
            Panoramica
          </TabsTrigger>
          <TabsTrigger 
            value="richieste"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-richieste"
          >
            Richieste
          </TabsTrigger>
          <TabsTrigger 
            value="immobili"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-immobili"
          >
            Immobili
          </TabsTrigger>
          <TabsTrigger 
            value="comunicazioni"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-comunicazioni"
          >
            Comunicazioni
          </TabsTrigger>
          <TabsTrigger 
            value="appuntamenti"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-appuntamenti"
          >
            Appuntamenti
          </TabsTrigger>
          <TabsTrigger 
            value="attivita"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            data-testid="tab-attivita"
          >
            Attività
          </TabsTrigger>
        </TabsList>

        <TabsContent value="panoramica" className="mt-6">
          <TabPanoramica cliente={cliente} />
        </TabsContent>
        <TabsContent value="richieste" className="mt-6">
          <TabRichieste clienteId={clienteId} onAddRichiesta={() => setShowRichiestaForm(true)} />
        </TabsContent>
        <TabsContent value="immobili" className="mt-6">
          <TabImmobili clienteId={clienteId} />
        </TabsContent>
        <TabsContent value="comunicazioni" className="mt-6">
          <TabComunicazioni clienteId={clienteId} cliente={cliente} />
        </TabsContent>
        <TabsContent value="appuntamenti" className="mt-6">
          <TabAppuntamenti clienteId={clienteId} />
        </TabsContent>
        <TabsContent value="attivita" className="mt-6">
          <TabAttivita clienteId={clienteId} cliente={cliente} />
        </TabsContent>
      </Tabs>

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Cliente</DialogTitle>
          </DialogHeader>
          <ClienteForm
            cliente={cliente}
            onSuccess={() => setShowEditForm(false)}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showRichiestaForm} onOpenChange={setShowRichiestaForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuova Richiesta per {cliente.nome} {cliente.cognome}</DialogTitle>
          </DialogHeader>
          <RichiestaForm
            clienteId={clienteId}
            onSuccess={() => setShowRichiestaForm(false)}
            onCancel={() => setShowRichiestaForm(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente il cliente 
              <strong> {cliente.nome} {cliente.cognome}</strong> e tutti i dati associati.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
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
