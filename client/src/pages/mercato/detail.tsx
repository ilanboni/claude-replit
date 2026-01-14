import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OpportunitaMercato, AttivitaOpportunita, PubblicizzatoDa, MatchingOpportunita } from "@shared/schema";
import { 
  ArrowLeft, MapPin, Home, Euro, ExternalLink, Building2, Users, Clock,
  CheckCircle2, XCircle, TrendingUp, Link2, Loader2, Plus, Trash2, Phone,
  Mail, MessageSquare, FileText, Calendar, ChevronRight, Send, Edit, 
  Briefcase, Star, ArrowUpRight, Building
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type OpportunitaStato = "in_valutazione" | "iter_proprietario" | "acquisito" | "scartato";

const STATI_CONFIG: Record<OpportunitaStato, { label: string; color: string; icon: typeof Clock }> = {
  in_valutazione: { label: "In valutazione", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  iter_proprietario: { label: "Iter proprietario", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: TrendingUp },
  acquisito: { label: "Acquisito", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  scartato: { label: "Scartato", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

const MOTIVI_SCARTO = [
  "Prezzo troppo alto",
  "Proprietario non interessato", 
  "Immobile già venduto",
  "Non risponde/irreperibile",
  "Esclusiva con altra agenzia",
  "Requisiti non soddisfatti",
  "Altro",
];

function StatoBadge({ stato }: { stato: OpportunitaStato }) {
  const config = STATI_CONFIG[stato];
  const Icon = config.icon;
  return (
    <Badge variant="secondary" className={`gap-1 ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

interface OpportunitaDetail extends OpportunitaMercato {
  pubblicizzatoDa?: PubblicizzatoDa[];
  attivita?: AttivitaOpportunita[];
  documenti?: any[];
  matching?: MatchingOpportunita[];
}

function ChangeStatoDialog({ 
  opportunita, 
  open, 
  onOpenChange,
  onSuccess
}: { 
  opportunita: OpportunitaDetail;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [newStato, setNewStato] = useState(opportunita.stato);
  const [motivoScarto, setMotivoScarto] = useState("");
  const [noteScarto, setNoteScarto] = useState("");

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/mercato/${opportunita.id}/stato`, {
        stato: newStato,
        motivoScarto: newStato === "scartato" ? motivoScarto : undefined,
        noteScarto: newStato === "scartato" ? noteScarto : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Stato aggiornato" });
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare lo stato", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambia stato opportunità</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nuovo stato</Label>
            <Select value={newStato} onValueChange={setNewStato}>
              <SelectTrigger data-testid="select-new-stato">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_valutazione">In valutazione</SelectItem>
                <SelectItem value="iter_proprietario">Iter proprietario</SelectItem>
                <SelectItem value="acquisito">Acquisito</SelectItem>
                <SelectItem value="scartato">Scartato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newStato === "scartato" && (
            <>
              <div className="space-y-2">
                <Label>Motivo scarto</Label>
                <Select value={motivoScarto} onValueChange={setMotivoScarto}>
                  <SelectTrigger data-testid="select-motivo">
                    <SelectValue placeholder="Seleziona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVI_SCARTO.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Note aggiuntive</Label>
                <Textarea 
                  placeholder="Dettagli sul motivo dello scarto..."
                  value={noteScarto}
                  onChange={(e) => setNoteScarto(e.target.value)}
                  data-testid="input-note-scarto"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button 
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || (newStato === "scartato" && !motivoScarto)}
            data-testid="button-save-stato"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAttivitaDialog({ 
  opportunitaId, 
  open, 
  onOpenChange,
  onSuccess
}: { 
  opportunitaId: number;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    tipo: "nota",
    titolo: "",
    descrizione: "",
    esito: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/mercato/${opportunitaId}/attivita`, formData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Attività aggiunta" });
      onSuccess();
      onOpenChange(false);
      setFormData({ tipo: "nota", titolo: "", descrizione: "", esito: "" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere l'attività", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuova attività</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nota">Nota</SelectItem>
                  <SelectItem value="chiamata">Chiamata</SelectItem>
                  <SelectItem value="sopralluogo">Sopralluogo</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Esito</Label>
              <Select value={formData.esito} onValueChange={(v) => setFormData({ ...formData, esito: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona esito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positivo">Positivo</SelectItem>
                  <SelectItem value="neutro">Neutro</SelectItem>
                  <SelectItem value="negativo">Negativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titolo</Label>
            <Input 
              placeholder="Es. Chiamata al proprietario"
              value={formData.titolo}
              onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrizione</Label>
            <Textarea 
              placeholder="Dettagli dell'attività..."
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !formData.titolo}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAgenziaDialog({ 
  opportunitaId, 
  open, 
  onOpenChange,
  onSuccess
}: { 
  opportunitaId: number;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nomeAgenzia: "",
    urlAnnuncio: "",
    prezzoRichiesto: "",
    note: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/mercato/${opportunitaId}/pubblicizzato-da`, {
        ...formData,
        prezzo: formData.prezzoRichiesto || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Agenzia aggiunta" });
      onSuccess();
      onOpenChange(false);
      setFormData({ nomeAgenzia: "", urlAnnuncio: "", prezzoRichiesto: "", note: "" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere l'agenzia", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi agenzia</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome agenzia</Label>
            <Input 
              placeholder="Es. Tecnocasa San Siro"
              value={formData.nomeAgenzia}
              onChange={(e) => setFormData({ ...formData, nomeAgenzia: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>URL annuncio</Label>
            <Input 
              placeholder="https://..."
              value={formData.urlAnnuncio}
              onChange={(e) => setFormData({ ...formData, urlAnnuncio: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Prezzo richiesto</Label>
            <Input 
              placeholder="280000"
              value={formData.prezzoRichiesto}
              onChange={(e) => setFormData({ ...formData, prezzoRichiesto: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea 
              placeholder="Note sull'annuncio..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button 
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !formData.nomeAgenzia}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertiPortafoglioDialog({ 
  opportunita, 
  open, 
  onOpenChange,
  onSuccess
}: { 
  opportunita: OpportunitaDetail;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const convertMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/mercato/${opportunita.id}/converti-portafoglio`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Convertito in portafoglio", description: `Immobile creato con ID ${data.immobile?.id}` });
      onSuccess();
      onOpenChange(false);
      if (data.immobile?.id) {
        setLocation(`/immobili/${data.immobile.id}`);
      }
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile convertire", variant: "destructive" });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Converti in Portafoglio</AlertDialogTitle>
          <AlertDialogDescription>
            Questa azione creerà un nuovo immobile nel portafoglio interno con tutti i dati dell'opportunità.
            L'opportunità verrà segnata come "acquisita" e manterrà lo storico delle attività.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => convertMutation.mutate()}
            disabled={convertMutation.isPending}
          >
            {convertMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Converti
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function MercatoDetailPage() {
  const [, params] = useRoute("/mercato/:id");
  const id = params?.id ? Number(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [showStatoDialog, setShowStatoDialog] = useState(false);
  const [showAttivitaDialog, setShowAttivitaDialog] = useState(false);
  const [showAgenziaDialog, setShowAgenziaDialog] = useState(false);
  const [showConvertiDialog, setShowConvertiDialog] = useState(false);

  const { data: opportunita, isLoading, refetch } = useQuery<OpportunitaDetail>({
    queryKey: ["/api/mercato", id],
    queryFn: async () => {
      const res = await fetch(`/api/mercato/${id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!id,
  });

  const { data: proponiClienti } = useQuery<any[]>({
    queryKey: ["/api/mercato", id, "proponi-clienti"],
    queryFn: async () => {
      const res = await fetch(`/api/mercato/${id}/proponi-clienti`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!id && opportunita?.stato === "acquisito",
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/mercato/${id}`, {});
    },
    onSuccess: () => {
      toast({ title: "Opportunità eliminata" });
      queryClient.invalidateQueries({ queryKey: ["/api/mercato"] });
      setLocation("/mercato");
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare", variant: "destructive" });
    },
  });

  if (!id) {
    return (
      <div className="p-6">
        <p>ID non valido</p>
        <Link href="/mercato">
          <Button variant="outline">Torna alla lista</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!opportunita) {
    return (
      <div className="p-6">
        <p>Opportunità non trovata</p>
        <Link href="/mercato">
          <Button variant="outline">Torna alla lista</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/mercato">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{opportunita.titolo || "Opportunità"}</h1>
            <div className="flex items-center gap-2 mt-1">
              <StatoBadge stato={opportunita.stato as OpportunitaStato} />
              {opportunita.richiestaOrigineId && (
                <Link href={`/richieste/${opportunita.richiestaOrigineId}`}>
                  <Badge variant="outline" className="gap-1 cursor-pointer hover-elevate">
                    <Link2 className="h-3 w-3" />
                    Vedi richiesta origine
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowStatoDialog(true)} data-testid="button-change-stato">
            <Edit className="h-4 w-4 mr-2" />
            Cambia stato
          </Button>
          {opportunita.stato === "acquisito" && !opportunita.immobilePortafoglioId && (
            <Button onClick={() => setShowConvertiDialog(true)} data-testid="button-converti">
              <Building className="h-4 w-4 mr-2" />
              Converti in portafoglio
            </Button>
          )}
          {opportunita.immobilePortafoglioId && (
            <Link href={`/immobili/${opportunita.immobilePortafoglioId}`}>
              <Button variant="outline">
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Vedi in portafoglio
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dettagli immobile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {opportunita.indirizzo && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Indirizzo</p>
                      <p className="font-medium">{opportunita.indirizzo}</p>
                    </div>
                  </div>
                )}
                {opportunita.zona && (
                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Zona</p>
                      <p className="font-medium">{opportunita.zona}</p>
                    </div>
                  </div>
                )}
                {opportunita.mq && (
                  <div className="flex items-start gap-2">
                    <Home className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Superficie</p>
                      <p className="font-medium">{opportunita.mq} mq</p>
                    </div>
                  </div>
                )}
                {opportunita.prezzo && (
                  <div className="flex items-start gap-2">
                    <Euro className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prezzo</p>
                      <p className="font-medium">{Number(opportunita.prezzo).toLocaleString("it-IT")} €</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-4 gap-4 text-sm">
                {opportunita.camere && (
                  <div>
                    <span className="text-muted-foreground">Camere:</span> {opportunita.camere}
                  </div>
                )}
                {opportunita.bagni && (
                  <div>
                    <span className="text-muted-foreground">Bagni:</span> {opportunita.bagni}
                  </div>
                )}
                {opportunita.piano !== null && opportunita.piano !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Piano:</span> {opportunita.piano}
                  </div>
                )}
                {opportunita.classeEnergetica && (
                  <div>
                    <span className="text-muted-foreground">Classe:</span> {opportunita.classeEnergetica}
                  </div>
                )}
              </div>

              {opportunita.urlAnnuncio && (
                <a 
                  href={opportunita.urlAnnuncio} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Vedi annuncio originale
                </a>
              )}

              {opportunita.note && (
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground mb-1">Note</p>
                  <p className="text-sm">{opportunita.note}</p>
                </div>
              )}

              {opportunita.stato === "scartato" && opportunita.motivoScarto && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="font-medium text-red-800 dark:text-red-400">Motivo scarto: {opportunita.motivoScarto}</p>
                  {opportunita.noteScarto && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">{opportunita.noteScarto}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="attivita">
            <TabsList>
              <TabsTrigger value="attivita" data-testid="tab-attivita">
                Storico attività ({opportunita.attivita?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="agenzie" data-testid="tab-agenzie">
                Pubblicizzato da ({opportunita.pubblicizzatoDa?.length || 0})
              </TabsTrigger>
              {opportunita.stato === "acquisito" && (
                <TabsTrigger value="clienti" data-testid="tab-clienti">
                  Clienti matchati ({proponiClienti?.length || 0})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="attivita" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                  <CardTitle className="text-base">Storico attività</CardTitle>
                  <Button size="sm" onClick={() => setShowAttivitaDialog(true)} data-testid="button-add-attivita">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi
                  </Button>
                </CardHeader>
                <CardContent>
                  {!opportunita.attivita?.length ? (
                    <p className="text-muted-foreground text-center py-8">Nessuna attività registrata</p>
                  ) : (
                    <div className="space-y-3">
                      {opportunita.attivita.map((att) => (
                        <div key={att.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">{att.tipo}</Badge>
                              {att.esito && (
                                <Badge 
                                  variant="secondary" 
                                  className={
                                    att.esito === "positivo" ? "bg-green-100 text-green-800" :
                                    att.esito === "negativo" ? "bg-red-100 text-red-800" :
                                    ""
                                  }
                                >
                                  {att.esito}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground ml-auto">
                                {att.createdAt && format(new Date(att.createdAt), "d MMM yyyy, HH:mm", { locale: it })}
                              </span>
                            </div>
                            <p className="font-medium mt-1">{att.titolo}</p>
                            {att.descrizione && <p className="text-sm text-muted-foreground mt-1">{att.descrizione}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="agenzie" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                  <CardTitle className="text-base">Agenzie che pubblicizzano</CardTitle>
                  <Button size="sm" onClick={() => setShowAgenziaDialog(true)} data-testid="button-add-agenzia">
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi
                  </Button>
                </CardHeader>
                <CardContent>
                  {!opportunita.pubblicizzatoDa?.length ? (
                    <p className="text-muted-foreground text-center py-8">Nessuna agenzia registrata</p>
                  ) : (
                    <div className="space-y-3">
                      {opportunita.pubblicizzatoDa.map((pub) => (
                        <div key={pub.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{pub.nomeAgenzia}</p>
                            {pub.prezzo && (
                              <p className="text-sm text-muted-foreground">
                                Prezzo: {Number(pub.prezzo).toLocaleString("it-IT")} €
                              </p>
                            )}
                          </div>
                          {pub.urlAnnuncio && (
                            <a 
                              href={pub.urlAnnuncio} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {opportunita.stato === "acquisito" && (
              <TabsContent value="clienti" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Clienti interessati</CardTitle>
                    <CardDescription>
                      Clienti con richieste compatibili con questa opportunità
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!proponiClienti?.length ? (
                      <p className="text-muted-foreground text-center py-8">Nessun cliente matchato</p>
                    ) : (
                      <div className="space-y-3">
                        {proponiClienti.map((pc: any) => (
                          <div key={pc.matchingId} className="p-4 rounded-lg border">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {pc.cliente?.nome} {pc.cliente?.cognome}
                                  </p>
                                  <Badge variant="outline">Score: {pc.punteggio}%</Badge>
                                  {pc.messaggioInviato && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Contattato
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {pc.richiesta?.tipoRichiesta} - Budget: {pc.richiesta?.budgetMin?.toLocaleString('it-IT')} - {pc.richiesta?.budgetMax?.toLocaleString('it-IT')} €
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {pc.cliente?.telefono && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a href={`tel:${pc.cliente.telefono}`}>
                                      <Phone className="h-4 w-4" />
                                    </a>
                                  </Button>
                                )}
                                <Link href={`/clienti/${pc.cliente?.id}`}>
                                  <Button size="sm" variant="outline">
                                    <ChevronRight className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                            {pc.bozzaMessaggio && !pc.messaggioInviato && (
                              <div className="mt-3 p-3 bg-muted rounded text-sm">
                                <p className="text-muted-foreground text-xs mb-1">Bozza messaggio:</p>
                                <p>{pc.bozzaMessaggio}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Match clienti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <Users className="h-12 w-12 mx-auto text-primary/50 mb-2" />
                <p className="text-3xl font-bold">{opportunita.matchCount || 0}</p>
                <p className="text-sm text-muted-foreground">clienti interessati</p>
              </div>
              {(opportunita.matchAlti || opportunita.matchMedi) && (
                <div className="flex justify-center gap-4 mt-2">
                  {opportunita.matchAlti && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">{opportunita.matchAlti}</p>
                      <p className="text-xs text-muted-foreground">Alti</p>
                    </div>
                  )}
                  {opportunita.matchMedi && (
                    <div className="text-center">
                      <p className="text-lg font-semibold text-amber-600">{opportunita.matchMedi}</p>
                      <p className="text-xs text-muted-foreground">Medi</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Creato il</span>
                <span>{opportunita.createdAt && format(new Date(opportunita.createdAt), "d MMM yyyy", { locale: it })}</span>
              </div>
              {opportunita.dataAcquisizione && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acquisito il</span>
                  <span>{format(new Date(opportunita.dataAcquisizione), "d MMM yyyy", { locale: it })}</span>
                </div>
              )}
              {(opportunita as any).fonteOrigine && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fonte</span>
                  <span>{(opportunita as any).fonteOrigine}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-0">
              <AlertDialog>
                <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" asChild>
                  <AlertDialogAction className="justify-start p-0 h-auto bg-transparent hover:bg-transparent">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Elimina opportunità
                  </AlertDialogAction>
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminare questa opportunità?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Questa azione è irreversibile. Tutti i dati associati verranno persi.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                      Elimina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </div>
      </div>

      <ChangeStatoDialog 
        opportunita={opportunita} 
        open={showStatoDialog} 
        onOpenChange={setShowStatoDialog}
        onSuccess={() => refetch()}
      />
      <AddAttivitaDialog 
        opportunitaId={id} 
        open={showAttivitaDialog} 
        onOpenChange={setShowAttivitaDialog}
        onSuccess={() => refetch()}
      />
      <AddAgenziaDialog 
        opportunitaId={id} 
        open={showAgenziaDialog} 
        onOpenChange={setShowAgenziaDialog}
        onSuccess={() => refetch()}
      />
      <ConvertiPortafoglioDialog 
        opportunita={opportunita} 
        open={showConvertiDialog} 
        onOpenChange={setShowConvertiDialog}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
