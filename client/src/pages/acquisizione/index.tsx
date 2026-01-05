import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ImmobileEsterno } from "@shared/schema";
import { 
  Search, Star, StarOff, Phone, Mail, ExternalLink, MapPin, Home, Euro, 
  Trash2, MessageSquare, Copy, Check, Loader2, Sparkles, Building2, Plus, Link
} from "lucide-react";

interface ParsedListing {
  titolo?: string;
  descrizione?: string;
  indirizzo?: string;
  zona?: string;
  mq?: number;
  prezzo?: number;
  piano?: number;
  camere?: number;
  bagni?: number;
  contattoNome?: string;
  contattoTelefono?: string;
  contattoEmail?: string;
  fonte?: string;
  dataPubblicazione?: string;
  caratteristiche?: Record<string, any>;
}

function ParseAnnuncioForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [annuncioText, setAnnuncioText] = useState("");
  const [annuncioUrl, setAnnuncioUrl] = useState("");
  const [parsedData, setParsedData] = useState<ParsedListing | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [scrapedText, setScrapedText] = useState("");

  const parseMutation = useMutation({
    mutationFn: async (data: { text: string; url?: string }) => {
      const res = await apiRequest("POST", "/api/acquisizione/parse", data);
      return res.json();
    },
    onSuccess: (data: ParsedListing) => {
      setParsedData(data);
      setShowPreview(true);
      toast({
        title: "Annuncio analizzato",
        description: "Verifica i dati estratti e salva l'immobile",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile analizzare l'annuncio",
        variant: "destructive",
      });
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/acquisizione/scrape", { url });
      return res.json();
    },
    onSuccess: (data: ParsedListing & { testoOriginale?: string }) => {
      setParsedData(data);
      if (data.testoOriginale) {
        setScrapedText(data.testoOriginale);
      }
      setShowPreview(true);
      toast({
        title: "Annuncio estratto e analizzato",
        description: "Verifica i dati estratti e salva l'immobile",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Impossibile estrarre l'annuncio";
      toast({
        title: "Errore",
        description: message.includes("APIFY") ? "Configura la API key di Apify" : message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ParsedListing) => {
      const res = await apiRequest("POST", "/api/acquisizione", {
        ...data,
        testoOriginale: scrapedText || annuncioText,
        urlAnnuncio: annuncioUrl || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Immobile salvato",
        description: "L'immobile è stato aggiunto alla lista",
      });
      setAnnuncioText("");
      setAnnuncioUrl("");
      setScrapedText("");
      setParsedData(null);
      setShowPreview(false);
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile salvare l'immobile",
        variant: "destructive",
      });
    },
  });

  const handleParse = () => {
    if (!annuncioText.trim()) {
      toast({
        title: "Testo richiesto",
        description: "Incolla il testo dell'annuncio per analizzarlo",
        variant: "destructive",
      });
      return;
    }
    parseMutation.mutate({ text: annuncioText, url: annuncioUrl || undefined });
  };

  const handleScrape = () => {
    if (!annuncioUrl.trim()) {
      toast({
        title: "URL richiesto",
        description: "Inserisci l'URL dell'annuncio",
        variant: "destructive",
      });
      return;
    }
    scrapeMutation.mutate(annuncioUrl);
  };

  const isLoading = parseMutation.isPending || scrapeMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="url">URL annuncio</Label>
        <div className="flex gap-2">
          <Input
            id="url"
            placeholder="https://www.immobiliare.it/annunci/..."
            value={annuncioUrl}
            onChange={(e) => setAnnuncioUrl(e.target.value)}
            data-testid="input-annuncio-url"
            className="flex-1"
          />
          <Button 
            onClick={handleScrape}
            disabled={isLoading || !annuncioUrl.trim()}
            variant="default"
            data-testid="button-scrape-url"
          >
            {scrapeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Link className="h-4 w-4 mr-2" />
                Estrai
              </>
            )}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Incolla il link e clicca Estrai per scaricare automaticamente l'annuncio (richiede API key Apify)
        </p>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">oppure</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="text">Testo dell'annuncio</Label>
        <Textarea
          id="text"
          placeholder="Incolla qui il testo completo dell'annuncio immobiliare..."
          value={annuncioText}
          onChange={(e) => setAnnuncioText(e.target.value)}
          className="min-h-[200px]"
          data-testid="textarea-annuncio-text"
        />
        <p className="text-sm text-muted-foreground">
          Copia e incolla il testo dell'annuncio manualmente
        </p>
      </div>

      <Button 
        onClick={handleParse} 
        disabled={isLoading || !annuncioText.trim()}
        className="w-full"
        variant="outline"
        data-testid="button-parse-annuncio"
      >
        {parseMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analisi in corso...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Analizza con AI
          </>
        )}
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Dati estratti dall'annuncio</DialogTitle>
          </DialogHeader>
          
          {parsedData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Titolo</Label>
                  <p className="font-medium">{parsedData.titolo || "Non trovato"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Zona</Label>
                  <p>{parsedData.zona || "Non trovata"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Indirizzo</Label>
                  <p>{parsedData.indirizzo || "Non trovato"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Prezzo</Label>
                  <p className="font-semibold text-primary">
                    {parsedData.prezzo ? `€${parsedData.prezzo.toLocaleString('it-IT')}` : "Non trovato"}
                  </p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Metri quadri</Label>
                  <p>{parsedData.mq ? `${parsedData.mq} mq` : "Non trovato"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Camere</Label>
                  <p>{parsedData.camere || "Non trovato"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Bagni</Label>
                  <p>{parsedData.bagni || "Non trovato"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Piano</Label>
                  <p>{parsedData.piano !== undefined ? (parsedData.piano === 0 ? "Terra" : parsedData.piano) : "Non trovato"}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">Fonte</Label>
                  <p>{parsedData.fonte || "Non riconosciuta"}</p>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <Label className="text-muted-foreground text-xs">Contatto</Label>
                  <div className="flex gap-4 mt-1">
                    {parsedData.contattoNome && <p>{parsedData.contattoNome}</p>}
                    {parsedData.contattoTelefono && (
                      <Badge variant="secondary">
                        <Phone className="h-3 w-3 mr-1" />
                        {parsedData.contattoTelefono}
                      </Badge>
                    )}
                    {parsedData.contattoEmail && (
                      <Badge variant="secondary">
                        <Mail className="h-3 w-3 mr-1" />
                        {parsedData.contattoEmail}
                      </Badge>
                    )}
                  </div>
                </div>

                {parsedData.descrizione && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Descrizione</Label>
                    <p className="text-sm mt-1 text-muted-foreground line-clamp-4">{parsedData.descrizione}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} data-testid="button-modify-preview">
              Modifica
            </Button>
            <Button 
              onClick={() => parsedData && saveMutation.mutate(parsedData)}
              disabled={saveMutation.isPending}
              data-testid="button-save-immobile"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Salva Immobile
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImmobileEsternoCard({ 
  immobile, 
  onGenerateMessage, 
  onDelete 
}: { 
  immobile: ImmobileEsterno;
  onGenerateMessage: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const togglePreferitoMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/acquisizione/${immobile.id}/toggle-preferito`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
    },
  });

  const copyPhone = () => {
    if (immobile.contattoTelefono) {
      navigator.clipboard.writeText(immobile.contattoTelefono);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Telefono copiato" });
    }
  };

  const statoColors: Record<string, string> = {
    nuovo: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    contattato: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    interessato: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    scartato: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  return (
    <Card className="relative" data-testid={`card-immobile-esterno-${immobile.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-1">{immobile.titolo}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{immobile.zona || immobile.indirizzo || "Zona non specificata"}</span>
            </CardDescription>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => togglePreferitoMutation.mutate()}
            disabled={togglePreferitoMutation.isPending}
            data-testid={`button-toggle-preferito-${immobile.id}`}
          >
            {immobile.preferito ? (
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ) : (
              <StarOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {immobile.prezzo && (
            <Badge variant="default" className="text-sm">
              <Euro className="h-3 w-3 mr-1" />
              {Number(immobile.prezzo).toLocaleString('it-IT')}
            </Badge>
          )}
          {immobile.mq && (
            <Badge variant="secondary">
              <Home className="h-3 w-3 mr-1" />
              {immobile.mq} mq
            </Badge>
          )}
          {immobile.camere && (
            <Badge variant="secondary">
              {immobile.camere} cam
            </Badge>
          )}
          <Badge className={statoColors[immobile.statoContatto || 'nuovo']}>
            {immobile.statoContatto || 'nuovo'}
          </Badge>
        </div>

        {immobile.contattoTelefono && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-mono text-sm flex-1">{immobile.contattoTelefono}</span>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copyPhone}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        )}

        {immobile.fonte && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span>{immobile.fonte}</span>
            {immobile.urlAnnuncio && (
              <a 
                href={immobile.urlAnnuncio} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-auto"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2 pt-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={() => onGenerateMessage(immobile.id)}
          data-testid={`button-generate-message-${immobile.id}`}
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          Messaggio
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onDelete(immobile.id)}
          data-testid={`button-delete-immobile-${immobile.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function AcquisizionePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("tutti");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [selectedImmobileId, setSelectedImmobileId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [messageCopied, setMessageCopied] = useState(false);

  const { data: immobili = [], isLoading } = useQuery<ImmobileEsterno[]>({
    queryKey: ["/api/acquisizione"],
  });

  const preferiti = immobili.filter(i => i.preferito);
  const tutti = immobili;

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/acquisizione/${id}`, undefined);
    },
    onSuccess: () => {
      toast({ title: "Immobile eliminato" });
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      setDeletingId(null);
    },
  });

  const generateMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/acquisizione/${id}/generate-message`, {});
      return res.json();
    },
    onSuccess: (data: { message: string }) => {
      setGeneratedMessage(data.message);
    },
    onError: () => {
      setMessageDialogOpen(false);
      toast({
        title: "Errore",
        description: "Impossibile generare il messaggio",
        variant: "destructive",
      });
    },
  });

  const handleGenerateMessage = (id: number) => {
    setSelectedImmobileId(id);
    setGeneratedMessage("");
    setMessageDialogOpen(true);
    generateMessageMutation.mutate(id);
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setMessageCopied(true);
    setTimeout(() => setMessageCopied(false), 2000);
    toast({ title: "Messaggio copiato" });
  };

  const displayedImmobili = activeTab === "preferiti" ? preferiti : tutti;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-acquisizione-title">Acquisizione</h1>
        <p className="text-muted-foreground">
          Analizza annunci di privati e genera messaggi personalizzati
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tutti" data-testid="tab-tutti">
            Tutti ({tutti.length})
          </TabsTrigger>
          <TabsTrigger value="preferiti" data-testid="tab-preferiti">
            <Star className="h-4 w-4 mr-1" />
            Preferiti ({preferiti.length})
          </TabsTrigger>
          <TabsTrigger value="nuovo" data-testid="tab-nuovo">
            <Plus className="h-4 w-4 mr-1" />
            Nuovo Annuncio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutti" className="mt-6">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          ) : tutti.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nessun annuncio salvato</h3>
                <p className="text-muted-foreground text-center mt-1">
                  Inizia aggiungendo un annuncio da analizzare
                </p>
                <Button className="mt-4" onClick={() => setActiveTab("nuovo")} data-testid="button-add-annuncio-empty">
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Annuncio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {displayedImmobili.map(immobile => (
                <ImmobileEsternoCard
                  key={immobile.id}
                  immobile={immobile}
                  onGenerateMessage={handleGenerateMessage}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preferiti" className="mt-6">
          {preferiti.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Star className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Nessun preferito</h3>
                <p className="text-muted-foreground text-center mt-1">
                  Aggiungi immobili ai preferiti per contattare i proprietari
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {preferiti.map(immobile => (
                <ImmobileEsternoCard
                  key={immobile.id}
                  immobile={immobile}
                  onGenerateMessage={handleGenerateMessage}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nuovo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Analizza Annuncio
              </CardTitle>
              <CardDescription>
                Incolla il testo di un annuncio immobiliare e l'AI estrarrà automaticamente tutti i dati
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParseAnnuncioForm onSuccess={() => setActiveTab("tutti")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Messaggio per il proprietario</DialogTitle>
          </DialogHeader>
          
          {generateMessageMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                className="min-h-[200px]"
                data-testid="textarea-generated-message"
              />
              <p className="text-sm text-muted-foreground">
                Puoi modificare il messaggio prima di copiarlo
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)} data-testid="button-close-message-dialog">
              Chiudi
            </Button>
            <Button onClick={copyMessage} disabled={!generatedMessage} data-testid="button-copy-message">
              {messageCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiato!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copia Messaggio
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo immobile?</AlertDialogTitle>
            <AlertDialogDescription>
              L'immobile verrà rimosso definitivamente dalla lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
