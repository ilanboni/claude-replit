import { useState, useCallback } from "react";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@/hooks/use-upload";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OpportunitaMercato, AttivitaOpportunita, PubblicizzatoDa, MatchingOpportunita } from "@shared/schema";
import { 
  ArrowLeft, MapPin, Home, Euro, ExternalLink, Building2, Users, Clock,
  CheckCircle2, XCircle, TrendingUp, Link2, Loader2, Plus, Trash2, Phone,
  Mail, MessageSquare, FileText, Calendar, ChevronRight, Send, Edit, 
  Briefcase, Star, ArrowUpRight, Building, Ruler, Bath, Share2, Upload, File
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
  const config = STATI_CONFIG[stato] || STATI_CONFIG.in_valutazione;
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

function PropertyHeader({ opportunita, onChangeStato, onConverti }: { 
  opportunita: OpportunitaDetail; 
  onChangeStato: () => void;
  onConverti: () => void;
}) {
  const features: string[] = [];
  if (opportunita.balcone) features.push("Balcone");
  if (opportunita.terrazzo) features.push("Terrazzo");
  if (opportunita.ascensore) features.push("Ascensore");
  if (opportunita.box) features.push("Box");

  return (
    <div className="bg-card border-b">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/mercato">
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
              {opportunita.matchCount && opportunita.matchCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-primary-foreground">
                  <Users className="h-3 w-3 mr-1" />
                  {opportunita.matchCount}
                </Badge>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatoBadge stato={(opportunita.stato as OpportunitaStato) || "in_valutazione"} />
                {opportunita.richiestaOrigineId && (
                  <Link href={`/richieste/${opportunita.richiestaOrigineId}`}>
                    <Badge variant="outline" className="gap-1 cursor-pointer hover-elevate">
                      <Link2 className="h-3 w-3" />
                      Collegato a richiesta
                    </Badge>
                  </Link>
                )}
                {opportunita.immobilePortafoglioId && (
                  <Link href={`/immobili/${opportunita.immobilePortafoglioId}`}>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
                      <Building className="h-3 w-3" />
                      In portafoglio
                    </Badge>
                  </Link>
                )}
              </div>
              <h1 className="text-2xl font-bold mt-2" data-testid="text-opportunita-title">
                {opportunita.titolo || opportunita.indirizzo || "Opportunità"}
              </h1>
              {(opportunita.zona || opportunita.indirizzo) && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-4 w-4" />
                  {[opportunita.indirizzo, opportunita.zona, opportunita.citta].filter(Boolean).join(", ")}
                </p>
              )}
              <div className="flex items-center gap-6 mt-4 text-sm">
                {opportunita.mq && (
                  <span className="flex items-center gap-1">
                    <Ruler className="h-4 w-4 text-muted-foreground" />
                    <strong>{opportunita.mq}</strong> mq
                  </span>
                )}
                {opportunita.camere && (
                  <span className="flex items-center gap-1">
                    <Home className="h-4 w-4 text-muted-foreground" />
                    <strong>{opportunita.camere}</strong> camere
                  </span>
                )}
                {opportunita.bagni && (
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4 text-muted-foreground" />
                    <strong>{opportunita.bagni}</strong> bagni
                  </span>
                )}
                {opportunita.piano !== null && opportunita.piano !== undefined && (
                  <span className="flex items-center gap-1">
                    Piano <strong>{opportunita.piano}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <p className="text-3xl font-bold" data-testid="text-opportunita-price">
              {opportunita.prezzo
                ? `€${Number(opportunita.prezzo).toLocaleString("it-IT")}`
                : "Prezzo N/D"}
            </p>
            {opportunita.mq && opportunita.prezzo && (
              <p className="text-sm text-muted-foreground">
                €{Math.round(Number(opportunita.prezzo) / opportunita.mq).toLocaleString("it-IT")}/mq
              </p>
            )}
            <div className="flex gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={onChangeStato} data-testid="button-change-stato">
                <Edit className="h-4 w-4 mr-2" />
                Cambia stato
              </Button>
              {opportunita.stato === "acquisito" && !opportunita.immobilePortafoglioId && (
                <Button size="sm" onClick={onConverti} data-testid="button-converti">
                  <Building className="h-4 w-4 mr-2" />
                  Converti in portafoglio
                </Button>
              )}
              {opportunita.urlAnnuncio && (
                <a href={opportunita.urlAnnuncio} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" data-testid="button-external-link">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabDettagli({ opportunita }: { opportunita: OpportunitaDetail }) {
  const features: string[] = [];
  if (opportunita.balcone) features.push("Balcone");
  if (opportunita.terrazzo) features.push("Terrazzo");
  if (opportunita.ascensore) features.push("Ascensore");
  if (opportunita.box) features.push("Box");
  if (opportunita.cantina) features.push("Cantina");
  if (opportunita.giardino) features.push("Giardino");
  if (opportunita.arredato) features.push("Arredato");

  const getStatoImmobile = () => {
    if (opportunita.statoNuovo) return "Nuovo";
    if (opportunita.statoRistrutturato) return "Ristrutturato";
    if (opportunita.statoBuono) return "Buono Stato";
    if (opportunita.statoDaRistrutturare) return "Da Ristrutturare";
    return "N/D";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Caratteristiche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Superficie</p>
                <p className="font-medium">{opportunita.mq ? `${opportunita.mq} mq` : "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Camere</p>
                <p className="font-medium">{opportunita.camere || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bagni</p>
                <p className="font-medium">{opportunita.bagni || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Piano</p>
                <p className="font-medium">
                  {opportunita.piano !== null && opportunita.piano !== undefined ? opportunita.piano : "N/D"}
                  {opportunita.pianiEdificio ? ` / ${opportunita.pianiEdificio}` : ""}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stato</p>
                <p className="font-medium">{getStatoImmobile()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classe Energetica</p>
                <p className="font-medium">{opportunita.classeEnergetica || "N/D"}</p>
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
                  {[opportunita.indirizzo, opportunita.zona, opportunita.citta].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {opportunita.stato === "scartato" && opportunita.motivoScarto && (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <p className="font-medium text-red-800 dark:text-red-400">Motivo scarto: {opportunita.motivoScarto}</p>
                {opportunita.noteScarto && (
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">{opportunita.noteScarto}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Note Interne</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {opportunita.note || "Nessuna nota"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Riscaldamento</span>
              <span>{opportunita.riscaldamento || "N/D"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Spese condominiali</span>
              <span>{opportunita.speseCondominiali ? `€${Number(opportunita.speseCondominiali).toLocaleString("it-IT")}/mese` : "N/D"}</span>
            </div>
            <Separator />
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TabAgenzie({ opportunita, onRefresh }: { opportunita: OpportunitaDetail; onRefresh: () => void }) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    nomeAgenzia: "",
    portale: "",
    urlAnnuncio: "",
    prezzo: "",
    telefono: "",
    email: "",
    note: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const prezzoValue = formData.prezzo ? Number(formData.prezzo) : null;
      const res = await apiRequest("POST", `/api/mercato/${opportunita.id}/pubblicizzato-da`, {
        nomeAgenzia: formData.nomeAgenzia,
        portale: formData.portale || null,
        urlAnnuncio: formData.urlAnnuncio || null,
        prezzo: prezzoValue && !isNaN(prezzoValue) ? prezzoValue : null,
        telefono: formData.telefono || null,
        email: formData.email || null,
        note: formData.note || null,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Agenzia aggiunta" });
      onRefresh();
      setShowAddDialog(false);
      setFormData({ nomeAgenzia: "", portale: "", urlAnnuncio: "", prezzo: "", telefono: "", email: "", note: "" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere l'agenzia", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/mercato/pubblicizzato-da/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Agenzia rimossa" });
      onRefresh();
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile rimuovere l'agenzia", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Agenzie che pubblicizzano questo immobile</h3>
          <p className="text-sm text-muted-foreground">Traccia quali agenzie stanno vendendo lo stesso immobile</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-agenzia">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Agenzia
        </Button>
      </div>

      {!opportunita.pubblicizzatoDa?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nessuna agenzia registrata</h3>
            <p className="text-muted-foreground text-sm">
              Aggiungi le agenzie che stanno pubblicizzando questo immobile
            </p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)} data-testid="button-add-first-agenzia">
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi prima agenzia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunita.pubblicizzatoDa.map((pub) => (
            <Card key={pub.id} className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{pub.nomeAgenzia}</h4>
                      {pub.portale && (
                        <Badge variant="outline" className="text-xs">{pub.portale}</Badge>
                      )}
                    </div>
                    {pub.prezzo && (
                      <p className="text-lg font-bold mt-1">
                        €{Number(pub.prezzo).toLocaleString("it-IT")}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      {pub.telefono && (
                        <a href={`tel:${pub.telefono}`} className="flex items-center gap-1 hover:text-foreground">
                          <Phone className="h-3 w-3" />
                          {pub.telefono}
                        </a>
                      )}
                      {pub.email && (
                        <a href={`mailto:${pub.email}`} className="flex items-center gap-1 hover:text-foreground">
                          <Mail className="h-3 w-3" />
                          {pub.email}
                        </a>
                      )}
                    </div>
                    {pub.note && (
                      <p className="text-sm text-muted-foreground mt-2">{pub.note}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Rilevato: {pub.dataRilevazione && format(new Date(pub.dataRilevazione), "d MMM yyyy", { locale: it })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {pub.urlAnnuncio && (
                      <a href={pub.urlAnnuncio} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost" data-testid={`button-agenzia-link-${pub.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(pub.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-agenzia-${pub.id}`}
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aggiungi agenzia</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome agenzia *</Label>
                <Input 
                  placeholder="Es. Tecnocasa San Siro"
                  value={formData.nomeAgenzia}
                  onChange={(e) => setFormData({ ...formData, nomeAgenzia: e.target.value })}
                  data-testid="input-nome-agenzia"
                />
              </div>
              <div className="space-y-2">
                <Label>Portale</Label>
                <Select value={formData.portale} onValueChange={(v) => setFormData({ ...formData, portale: v })}>
                  <SelectTrigger data-testid="select-portale-agenzia">
                    <SelectValue placeholder="Seleziona portale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immobiliare.it">Immobiliare.it</SelectItem>
                    <SelectItem value="idealista.it">Idealista.it</SelectItem>
                    <SelectItem value="casa.it">Casa.it</SelectItem>
                    <SelectItem value="subito.it">Subito.it</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL annuncio</Label>
              <Input 
                placeholder="https://..."
                value={formData.urlAnnuncio}
                onChange={(e) => setFormData({ ...formData, urlAnnuncio: e.target.value })}
                data-testid="input-url-agenzia"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prezzo richiesto</Label>
                <Input 
                  placeholder="280000"
                  value={formData.prezzo}
                  onChange={(e) => setFormData({ ...formData, prezzo: e.target.value })}
                  data-testid="input-prezzo-agenzia"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefono</Label>
                <Input 
                  placeholder="+39..."
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  data-testid="input-telefono-agenzia"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email"
                placeholder="agenzia@email.it"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-email-agenzia"
              />
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea 
                placeholder="Note sull'agenzia..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                data-testid="input-note-agenzia"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-agenzia">Annulla</Button>
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formData.nomeAgenzia}
              data-testid="button-save-agenzia"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabAttivita({ opportunita, onRefresh }: { opportunita: OpportunitaDetail; onRefresh: () => void }) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "nota",
    titolo: "",
    descrizione: "",
    esito: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/mercato/${opportunita.id}/attivita`, formData);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Attività aggiunta" });
      onRefresh();
      setShowAddDialog(false);
      setFormData({ tipo: "nota", titolo: "", descrizione: "", esito: "" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere l'attività", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Storico attività</h3>
          <p className="text-sm text-muted-foreground">Traccia tutte le interazioni con proprietario e agenzie</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-attivita">
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Attività
        </Button>
      </div>

      {!opportunita.attivita?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nessuna attività registrata</h3>
            <p className="text-muted-foreground text-sm">
              Registra chiamate, sopralluoghi e note
            </p>
            <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Aggiungi prima attività
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {opportunita.attivita.map((att) => (
            <Card key={att.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{att.tipo}</Badge>
                      {att.esito && (
                        <Badge 
                          variant="secondary" 
                          className={
                            att.esito === "positivo" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" :
                            att.esito === "negativo" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
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
              <Label>Titolo *</Label>
              <Input 
                placeholder="Es. Chiamata al proprietario"
                value={formData.titolo}
                onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                data-testid="input-titolo-attivita"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea 
                placeholder="Dettagli dell'attività..."
                value={formData.descrizione}
                onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                data-testid="input-descrizione-attivita"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Annulla</Button>
            <Button 
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !formData.titolo}
              data-testid="button-save-attivita"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabDocumenti({ opportunita, onRefresh }: { opportunita: OpportunitaDetail; onRefresh: () => void }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ nome: "", tipo: "altro", url: "" });
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{ name: string; progress: number }[]>([]);
  
  const { uploadFile, isUploading } = useUpload({
    onSuccess: () => {},
    onError: (error) => {
      toast({ title: "Errore upload", description: error.message, variant: "destructive" });
    },
  });

  const documenti = opportunita.documenti || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof newDoc) => {
      return apiRequest("POST", `/api/mercato/${opportunita.id}/documenti`, data);
    },
    onSuccess: () => {
      onRefresh();
      toast({ title: "Documento aggiunto" });
      setShowForm(false);
      setNewDoc({ nome: "", tipo: "altro", url: "" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiungere il documento", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/mercato/documenti/${id}`);
    },
    onSuccess: () => {
      onRefresh();
      toast({ title: "Documento eliminato" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare il documento", variant: "destructive" });
    },
  });

  const detectDocumentType = (filename: string): string => {
    const lowerName = filename.toLowerCase();
    if (lowerName.includes("ape") || lowerName.includes("energetic")) return "ape";
    if (lowerName.includes("planimetria") || lowerName.includes("pianta")) return "planimetria";
    if (lowerName.includes("visura")) return "visura";
    if (lowerName.includes("contratto")) return "contratto";
    if (/\.(jpg|jpeg|png|gif|webp)$/i.test(filename)) return "foto";
    return "altro";
  };

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    
    for (const file of fileArray) {
      const fileName = file.name;
      setUploadingFiles(prev => [...prev, { name: fileName, progress: 0 }]);
      
      try {
        setUploadingFiles(prev => prev.map(f => f.name === fileName ? { ...f, progress: 30 } : f));
        
        const response = await uploadFile(file);
        
        if (response) {
          setUploadingFiles(prev => prev.map(f => f.name === fileName ? { ...f, progress: 70 } : f));
          
          const docType = detectDocumentType(fileName);
          const docName = fileName.replace(/\.[^/.]+$/, "");
          
          await apiRequest("POST", `/api/mercato/${opportunita.id}/documenti`, {
            nome: docName,
            tipo: docType,
            url: response.objectPath,
          });
          
          setUploadingFiles(prev => prev.map(f => f.name === fileName ? { ...f, progress: 100 } : f));
          
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(f => f.name !== fileName));
          }, 1000);
          
          onRefresh();
          toast({ title: "Documento caricato", description: fileName });
        }
      } catch (error) {
        setUploadingFiles(prev => prev.filter(f => f.name !== fileName));
        toast({ title: "Errore", description: `Impossibile caricare ${fileName}`, variant: "destructive" });
      }
    }
  }, [uploadFile, opportunita.id, onRefresh, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files);
    }
    e.target.value = "";
  }, [handleFileUpload]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Documenti</h3>
          <p className="text-sm text-muted-foreground">Documenti relativi a questa opportunità</p>
        </div>
        <div className="flex gap-2">
          <label htmlFor="file-upload-input">
            <Button asChild data-testid="button-upload-documento">
              <span>
                <Upload className="h-4 w-4 mr-2" />
                Carica File
              </span>
            </Button>
          </label>
          <input
            id="file-upload-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
            data-testid="input-file-upload"
          />
          <Button variant="outline" onClick={() => setShowForm(true)} data-testid="button-add-documento">
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi URL
          </Button>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? "border-primary bg-primary/5" 
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="dropzone-documenti"
      >
        <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? "text-primary" : "text-muted-foreground/50"}`} />
        <p className={`text-sm ${isDragging ? "text-primary font-medium" : "text-muted-foreground"}`}>
          {isDragging ? "Rilascia i file qui" : "Trascina i file qui oppure clicca su 'Carica File'"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PDF, DOC, immagini (max 10MB)
        </p>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <Card key={file.name} className="p-3">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <Progress value={file.progress} className="h-1 mt-1" />
                </div>
                <span className="text-xs text-muted-foreground">{file.progress}%</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {documenti.length === 0 && uploadingFiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-medium">Nessun documento</h3>
            <p className="text-muted-foreground text-sm text-center">
              Trascina i file nell'area sopra o usa i pulsanti per aggiungere documenti
            </p>
          </CardContent>
        </Card>
      ) : documenti.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documenti.map((doc: any) => (
            <Card key={doc.id} className="hover-elevate">
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
                      <a 
                        href={doc.url.startsWith("/objects/") ? doc.url : doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button variant="ghost" size="icon" data-testid={`button-doc-link-${doc.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-doc-${doc.id}`}
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
            <DialogTitle>Aggiungi Documento (URL)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={newDoc.nome}
                onChange={(e) => setNewDoc({ ...newDoc, nome: e.target.value })}
                placeholder="Nome documento"
                data-testid="input-doc-nome"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newDoc.tipo}
                onValueChange={(v) => setNewDoc({ ...newDoc, tipo: v })}
              >
                <SelectTrigger data-testid="select-doc-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ape">APE</SelectItem>
                  <SelectItem value="planimetria">Planimetria</SelectItem>
                  <SelectItem value="visura">Visura</SelectItem>
                  <SelectItem value="foto">Foto</SelectItem>
                  <SelectItem value="contratto">Contratto</SelectItem>
                  <SelectItem value="altro">Altro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input
                value={newDoc.url}
                onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                placeholder="https://..."
                data-testid="input-doc-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} data-testid="button-cancel-doc">Annulla</Button>
            <Button
              onClick={() => createMutation.mutate(newDoc)}
              disabled={createMutation.isPending || !newDoc.nome}
              data-testid="button-save-doc"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabMatching({ opportunita, onRefresh }: { opportunita: OpportunitaDetail; onRefresh: () => void }) {
  const { toast } = useToast();
  const matching = opportunita.matching || [];

  const updateMatchingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/mercato/matching/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      onRefresh();
      toast({ title: "Matching aggiornato" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare il matching", variant: "destructive" });
    },
  });

  const handleProponiCliente = (match: any) => {
    const cliente = match.cliente;
    if (!cliente) {
      toast({ title: "Errore", description: "Dati cliente non disponibili", variant: "destructive" });
      return;
    }

    let telefono = (cliente.telefono || "").trim();
    if (!telefono) {
      toast({ title: "Errore", description: "Il cliente non ha un numero di telefono", variant: "destructive" });
      return;
    }

    telefono = telefono.replace(/\D/g, "");
    if (!telefono.startsWith("39") && telefono.length === 10) {
      telefono = "39" + telefono;
    }

    const indirizzo = `${opportunita.indirizzo || opportunita.zona || ""}, ${opportunita.citta || ""}`.trim();
    const prezzo = opportunita.prezzo ? `€${Number(opportunita.prezzo).toLocaleString("it-IT")}` : "";
    const mq = opportunita.mq ? `${opportunita.mq} mq` : "";

    const messaggio = `Buongiorno ${cliente.nome}, le propongo un immobile che potrebbe interessarle:\n\n${indirizzo}\n${prezzo}\n${mq}\n\nLe interessa organizzare una visita?`;

    const whatsappUrl = `https://wa.me/${telefono}?text=${encodeURIComponent(messaggio)}`;
    const opened = window.open(whatsappUrl, "_blank");

    if (opened) {
      updateMatchingMutation.mutate({ id: match.id, data: { messaggioInviato: true } });
    } else {
      toast({ title: "Attenzione", description: "Popup bloccato. Abilita i popup per WhatsApp.", variant: "destructive" });
    }
  };

  if (matching.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nessun matching trovato</h3>
          <p className="text-muted-foreground text-sm">
            Non ci sono richieste compatibili con questa opportunità
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Clienti interessati</h3>
        <p className="text-sm text-muted-foreground">Clienti con richieste compatibili con questa opportunità</p>
      </div>

      <div className="space-y-3">
        {matching.map((match: any) => (
          <Card key={match.id} className="hover-elevate">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium">
                      {match.cliente?.nome} {match.cliente?.cognome || ""}
                    </h4>
                    <Badge variant="outline">Score: {match.punteggio}%</Badge>
                    {match.messaggioInviato && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Contattato
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {match.richiesta?.tipoRichiesta} - Budget: €{match.richiesta?.budgetMin?.toLocaleString('it-IT')} - €{match.richiesta?.budgetMax?.toLocaleString('it-IT')}
                  </p>
                  {match.richiesta?.zone && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Zone: {Array.isArray(match.richiesta.zone) ? match.richiesta.zone.join(", ") : match.richiesta.zone}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!match.messaggioInviato && match.cliente?.telefono && (
                    <Button 
                      size="sm" 
                      onClick={() => handleProponiCliente(match)}
                      disabled={updateMatchingMutation.isPending}
                      data-testid={`button-proponi-${match.id}`}
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Proponi
                    </Button>
                  )}
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
        ))}
      </div>
    </div>
  );
}

function TabComunicazioni({ opportunitaId }: { opportunitaId: number }) {
  const { toast } = useToast();
  const { data: comunicazioni = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/mercato", opportunitaId, "comunicazioni"],
    queryFn: async () => {
      const res = await fetch(`/api/mercato/${opportunitaId}/comunicazioni`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error("Failed to fetch");
      }
      return res.json();
    },
  });

  const updateEsitoMutation = useMutation({
    mutationFn: async ({ id, esito }: { id: number; esito: string }) => {
      const res = await apiRequest("PATCH", `/api/comunicazioni/${id}`, { esito });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mercato", opportunitaId, "comunicazioni"] });
      toast({ title: "Esito aggiornato" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare l'esito", variant: "destructive" });
    },
  });

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
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Interessato</Badge>;
      case "non_interessato":
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Non interessato</Badge>;
      case "da_richiamare":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-600">Da richiamare</Badge>;
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nessuna comunicazione</h3>
          <p className="text-muted-foreground text-sm">
            Non ci sono comunicazioni relative a questa opportunità
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Storico comunicazioni</h3>
        <p className="text-sm text-muted-foreground">Tutte le comunicazioni relative a questa opportunità</p>
      </div>

      {comunicazioni.map((com: any) => (
        <Card key={com.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-full">{getCanaleIcon(com.canale)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium">{com.clienteNome || "Cliente"}</h4>
                  <Badge variant="outline">{com.canale || "sistema"}</Badge>
                  <Badge variant="secondary">{com.tipo}</Badge>
                  {getEsitoBadge(com.esito)}
                </div>
                <p className="text-sm mt-1">{com.testo}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {com.dataOra && format(new Date(com.dataOra), "dd MMM yyyy HH:mm", { locale: it })}
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
      ))}
    </div>
  );
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
    <div className="space-y-6">
      <PropertyHeader 
        opportunita={opportunita} 
        onChangeStato={() => setShowStatoDialog(true)}
        onConverti={() => setShowConvertiDialog(true)}
      />

      <div className="p-6">
        <Tabs defaultValue="dettagli">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dettagli" data-testid="tab-dettagli">
              <Home className="h-4 w-4 mr-2" />
              Dettagli
            </TabsTrigger>
            <TabsTrigger value="agenzie" data-testid="tab-agenzie">
              <Briefcase className="h-4 w-4 mr-2" />
              Agenzie ({opportunita.pubblicizzatoDa?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="matching" data-testid="tab-matching">
              <Users className="h-4 w-4 mr-2" />
              Matching ({opportunita.matching?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="comunicazioni" data-testid="tab-comunicazioni">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comunicazioni
            </TabsTrigger>
            <TabsTrigger value="attivita" data-testid="tab-attivita">
              <Clock className="h-4 w-4 mr-2" />
              Attività ({opportunita.attivita?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="documenti" data-testid="tab-documenti">
              <FileText className="h-4 w-4 mr-2" />
              Documenti ({opportunita.documenti?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dettagli" className="mt-6">
            <TabDettagli opportunita={opportunita} />
          </TabsContent>

          <TabsContent value="agenzie" className="mt-6">
            <TabAgenzie opportunita={opportunita} onRefresh={() => refetch()} />
          </TabsContent>

          <TabsContent value="matching" className="mt-6">
            <TabMatching opportunita={opportunita} onRefresh={() => refetch()} />
          </TabsContent>

          <TabsContent value="comunicazioni" className="mt-6">
            <TabComunicazioni opportunitaId={opportunita.id} />
          </TabsContent>

          <TabsContent value="attivita" className="mt-6">
            <TabAttivita opportunita={opportunita} onRefresh={() => refetch()} />
          </TabsContent>

          <TabsContent value="documenti" className="mt-6">
            <TabDocumenti opportunita={opportunita} onRefresh={() => refetch()} />
          </TabsContent>
        </Tabs>
      </div>

      <ChangeStatoDialog 
        opportunita={opportunita} 
        open={showStatoDialog} 
        onOpenChange={setShowStatoDialog}
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
