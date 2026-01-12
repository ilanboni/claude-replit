import { useState, useEffect } from "react";
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
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Users,
  ExternalLink,
  MessageCircle,
  Send,
  Loader2,
  Clock,
  FormInput,
  CheckCircle2,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { 
  ImmobileEsterno, 
  Comunicazione, 
  Cliente,
} from "@shared/schema";

function PropertyHeader({ immobile, cliente }: { immobile: ImmobileEsterno; cliente?: Cliente }) {
  const getStatoLabel = () => {
    if (immobile.statoNuovo) return "Nuovo";
    if (immobile.statoRistrutturato) return "Ristrutturato";
    if (immobile.statoBuono) return "Buono Stato";
    if (immobile.statoDaRistrutturare) return "Da Ristrutturare";
    return "N/D";
  };

  const getStatoContattoLabel = () => {
    switch (immobile.statoContatto) {
      case "contattato": return { label: "Contattato", variant: "default" as const };
      case "interessato": return { label: "Interessato", variant: "default" as const };
      case "scartato": return { label: "Scartato", variant: "secondary" as const };
      default: return { label: "Nuovo", variant: "outline" as const };
    }
  };

  const statoContatto = getStatoContattoLabel();
  const proprietarioNome = cliente 
    ? `${cliente.nome} ${cliente.cognome || ''}`.trim()
    : `Proprietario di ${immobile.indirizzo || immobile.zona || 'Immobile'}`;

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
            <div className="w-40 h-32 bg-muted rounded-md flex items-center justify-center shrink-0 relative">
              <Building2 className="h-12 w-12 text-muted-foreground/30" />
              <Badge className="absolute top-2 right-2 bg-amber-500 text-white text-xs">
                Acquisizione
              </Badge>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={statoContatto.variant}>
                  {statoContatto.label}
                </Badge>
                <Badge variant="outline">{getStatoLabel()}</Badge>
                <Badge variant="outline" className="text-amber-600 border-amber-500">
                  {immobile.fonte || "Portale"}
                </Badge>
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
                    <Ruler className="h-4 w-4" />
                    {immobile.mq} mq
                  </span>
                )}
                {immobile.camere && (
                  <span className="flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    {immobile.camere} camere
                  </span>
                )}
                {immobile.bagni && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {immobile.bagni} bagni
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <p className="text-3xl font-bold" data-testid="text-property-price">
              {immobile.prezzo 
                ? `€${Number(immobile.prezzo).toLocaleString('it-IT')}` 
                : "Prezzo N/D"}
            </p>
            <div className="flex gap-2">
              {immobile.urlAnnuncio && (
                <a href={immobile.urlAnnuncio} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Annuncio
                  </Button>
                </a>
              )}
              <Link href={`/acquisizione?id=${immobile.id}`}>
                <Button size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Gestisci
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Proprietario */}
        <div className="mt-4 p-4 bg-muted/50 rounded-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Proprietario</p>
              <p className="font-medium">{proprietarioNome}</p>
            </div>
            <div className="flex gap-2">
              {(cliente?.telefono || immobile.contattoTelefono) && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`tel:${cliente?.telefono || immobile.contattoTelefono}`}>
                    <Phone className="h-4 w-4 mr-1" />
                    Chiama
                  </a>
                </Button>
              )}
              {(cliente?.email || immobile.contattoEmail) && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${cliente?.email || immobile.contattoEmail}`}>
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Banner Contatto via Form */}
        {immobile.contattoMetodo === "form" && (
          <FormContactBanner immobile={immobile} />
        )}
      </div>
    </div>
  );
}

function FormContactBanner({ immobile }: { immobile: ImmobileEsterno }) {
  const { toast } = useToast();
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateMessageMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/generate-form-message", {
        immobileId: immobile.id,
        indirizzo: immobile.indirizzo,
        zona: immobile.zona,
        mq: immobile.mq,
        prezzo: immobile.prezzo,
        titolo: immobile.titolo,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedMessage(data.message);
      toast({ title: "Messaggio generato con AI" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile generare il messaggio", variant: "destructive" });
    },
  });

  const registerSentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/acquisizione/${immobile.id}/register-form-sent`, {
        message: generatedMessage || undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clienti"] });
      toast({ 
        title: "Invio registrato", 
        description: data.cliente ? `Cliente "${data.cliente.nome} ${data.cliente.cognome}" creato` : "Immobile spostato negli Inviati" 
      });
    },
  });

  const handleOpenForm = () => {
    const url = immobile.formUrl || immobile.urlAnnuncio;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyMessage = () => {
    if (generatedMessage) {
      navigator.clipboard.writeText(generatedMessage);
      toast({ title: "Messaggio copiato", description: "Incolla nel form del portale" });
    }
  };

  return (
    <div className="mt-4 p-4 border-2 border-amber-500/50 bg-amber-500/10 rounded-lg" data-testid="banner-form-contact">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-full">
          <FormInput className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-amber-700 dark:text-amber-400">Contatto via Form</h3>
            {immobile.rispostaRicevuta && (
              <Badge className="bg-green-500 text-white">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Risposta ricevuta
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Questo annuncio non ha telefono visibile. Contatta il proprietario tramite il form sul portale{" "}
            <span className="font-medium">{immobile.portale || immobile.fonte}</span>.
          </p>
          
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenForm}
              disabled={!immobile.formUrl && !immobile.urlAnnuncio}
              data-testid="button-open-form"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Apri Form
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateMessageMutation.mutate()}
              disabled={generateMessageMutation.isPending}
              data-testid="button-generate-message"
            >
              {generateMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1" />
              )}
              Genera Messaggio AI
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => registerSentMutation.mutate()}
              disabled={registerSentMutation.isPending}
              data-testid="button-register-sent"
            >
              {registerSentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Registra Invio
            </Button>
          </div>

          {generatedMessage && (
            <div className="mt-3 p-3 bg-background border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Messaggio generato:</span>
                <Button size="sm" variant="ghost" onClick={handleCopyMessage}>
                  Copia
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{generatedMessage}</p>
            </div>
          )}

          {immobile.ultimoTentativoForm && (
            <p className="text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3 inline mr-1" />
              Ultimo tentativo: {format(new Date(immobile.ultimoTentativoForm), "dd/MM/yyyy HH:mm", { locale: it })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyFeatures({ immobile }: { immobile: ImmobileEsterno }) {
  const features = [];
  if (immobile.balcone) features.push("Balcone");
  if (immobile.terrazzo) features.push("Terrazzo");
  if (immobile.ascensore) features.push("Ascensore");
  if (immobile.box) features.push("Box");
  if (immobile.cantina) features.push("Cantina");
  if (immobile.giardino) features.push("Giardino");
  if (immobile.arredato) features.push("Arredato");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Caratteristiche</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
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
            <p className="font-medium">{immobile.piano !== null ? immobile.piano : "N/D"}</p>
          </div>
          {immobile.classeEnergetica && (
            <div>
              <p className="text-sm text-muted-foreground">Classe Energetica</p>
              <p className="font-medium">{immobile.classeEnergetica}</p>
            </div>
          )}
          {immobile.riscaldamento && (
            <div>
              <p className="text-sm text-muted-foreground">Riscaldamento</p>
              <p className="font-medium">{immobile.riscaldamento}</p>
            </div>
          )}
        </div>
        
        {features.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex flex-wrap gap-2">
              {features.map((f) => (
                <Badge key={f} variant="outline">{f}</Badge>
              ))}
            </div>
          </>
        )}

        {immobile.descrizione && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Descrizione</p>
              <p className="text-sm whitespace-pre-wrap">{immobile.descrizione}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ComunicazioniTab({ immobileEsternoId, clienteId }: { immobileEsternoId: number; clienteId?: number }) {
  const { toast } = useToast();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [messageText, setMessageText] = useState("");

  const { data: comunicazioni = [], isLoading } = useQuery<Comunicazione[]>({
    queryKey: ["/api/comunicazioni", "immobileEsterno", immobileEsternoId],
    queryFn: async () => {
      const res = await fetch(`/api/comunicazioni?immobileEsternoId=${immobileEsternoId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { tipo: string; testo: string }) => {
      await apiRequest("POST", "/api/comunicazioni", {
        ...data,
        clienteId: clienteId,
        immobileEsternoId: immobileEsternoId,
        canale: "nota",
        creatoDA: "agente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comunicazioni", "immobileEsterno", immobileEsternoId] });
      toast({ title: "Nota aggiunta con successo" });
      setShowSendDialog(false);
      setMessageText("");
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere la nota", variant: "destructive" });
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
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Comunicazioni ({comunicazioni.length})</h3>
        <Button size="sm" onClick={() => setShowSendDialog(true)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Aggiungi Nota
        </Button>
      </div>

      {comunicazioni.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Nessuna comunicazione registrata</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {comunicazioni.map((com) => (
            <Card key={com.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{com.tipo}</Badge>
                      <Badge variant="secondary">{com.canale}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {com.dataOra && format(new Date(com.dataOra), "dd MMM yyyy HH:mm", { locale: it })}
                      </span>
                    </div>
                    <p className="text-sm">{com.testo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Nota</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Scrivi una nota..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Annulla
            </Button>
            <Button 
              onClick={() => sendMutation.mutate({ tipo: "nota", testo: messageText })}
              disabled={!messageText.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StoricoTab({ immobile }: { immobile: ImmobileEsterno }) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium">Storico Acquisizione</h3>
      
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <div className="flex-1">
                <p className="font-medium">Immobile aggiunto</p>
                <p className="text-sm text-muted-foreground">
                  {immobile.createdAt && format(new Date(immobile.createdAt), "dd MMMM yyyy HH:mm", { locale: it })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {immobile.dataContatto && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">Primo contatto</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(immobile.dataContatto), "dd MMMM yyyy HH:mm", { locale: it })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {immobile.messaggioInviato && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Messaggio inviato</p>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {immobile.messaggioInviato}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function ImmobileEsternoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  
  // Redirect to acquisizione page which has the complete layout with all tabs
  // This ensures the same layout as portfolio properties without code duplication
  useEffect(() => {
    if (id) {
      setLocation(`/acquisizione/${id}`, { replace: true });
    }
  }, [id, setLocation]);

  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
