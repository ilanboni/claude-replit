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
  Star,
  StarOff,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  Trash2,
  Check,
  X,
  Copy,
  MessageSquare,
  Plus,
  FileText,
  CheckSquare,
  Globe,
  ChartBar,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ImmobileEsterno } from "@shared/schema";

function PropertyHeader({ immobile }: { immobile: ImmobileEsterno }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getStatoLabel = () => {
    if (immobile.statoNuovo) return "Nuovo";
    if (immobile.statoRistrutturato) return "Ristrutturato";
    if (immobile.statoBuono) return "Buono Stato";
    if (immobile.statoDaRistrutturare) return "Da Ristrutturare";
    return null;
  };

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/acquisizione/${immobile.id}`, {
        preferito: !immobile.preferito,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione", immobile.id] });
      toast({
        title: immobile.preferito ? "Rimosso dai preferiti" : "Aggiunto ai preferiti",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/acquisizione/${immobile.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      toast({ title: "Immobile eliminato" });
      navigate("/acquisizione");
    },
  });

  const statoLabel = getStatoLabel();

  return (
    <>
      <div className="bg-card border-b">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/acquisizione">
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
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                    Acquisizione
                  </Badge>
                  {immobile.preferito && (
                    <Badge className="bg-amber-500/10 text-amber-600">Preferito</Badge>
                  )}
                  {statoLabel && <Badge variant="outline">{statoLabel}</Badge>}
                </div>
                <h1 className="text-2xl font-bold mt-2" data-testid="text-property-title">
                  {immobile.titolo}
                </h1>
                {(immobile.zona || immobile.indirizzo || immobile.citta) && (
                  <p className="text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {[immobile.indirizzo, immobile.zona, immobile.citta].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="flex items-center gap-6 mt-4 text-sm flex-wrap">
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
                      {immobile.pianiEdificio && ` / ${immobile.pianiEdificio}`}
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
              <div className="flex gap-2 mt-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFavorite.mutate()}
                  data-testid="button-toggle-favorite"
                >
                  {immobile.preferito ? (
                    <StarOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Star className="h-4 w-4 mr-2" />
                  )}
                  {immobile.preferito ? "Rimuovi" : "Preferito"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="button-delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo immobile?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. L'immobile verrà rimosso definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TabDettagli({ immobile }: { immobile: ImmobileEsterno }) {
  const { toast } = useToast();

  const features: string[] = [];
  if (immobile.ascensore) features.push("Ascensore");
  if (immobile.balcone) features.push("Balcone");
  if (immobile.terrazzo) features.push("Terrazzo");
  if (immobile.box) features.push("Box");
  if (immobile.cantina) features.push("Cantina");
  if (immobile.giardino) features.push("Giardino");
  if (immobile.arredato) features.push("Arredato");

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copiato` });
  };

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
                  {immobile.piano !== null && immobile.piano !== undefined
                    ? `${immobile.piano}${immobile.pianiEdificio ? ` / ${immobile.pianiEdificio}` : ""}`
                    : "N/D"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Classe Energetica</p>
                <p className="font-medium">{immobile.classeEnergetica || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Riscaldamento</p>
                <p className="font-medium">{immobile.riscaldamento || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Esposizione</p>
                <p className="font-medium">{immobile.esposizione || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Anno Costruzione</p>
                <p className="font-medium">{immobile.annoCostruzione || "N/D"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Spese Condominiali</p>
                <p className="font-medium">
                  {immobile.speseCondominiali
                    ? `€${Number(immobile.speseCondominiali).toLocaleString("it-IT")}/mese`
                    : "N/D"}
                </p>
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

        {immobile.testoOriginale && (
          <Card>
            <CardHeader>
              <CardTitle>Testo Originale Annuncio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {immobile.testoOriginale}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contatti Proprietario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {immobile.contattoNome && (
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{immobile.contattoNome}</p>
              </div>
            )}

            {immobile.contattoTelefono && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Telefono</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {immobile.contattoTelefono}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(immobile.contattoTelefono!, "Telefono")}
                    data-testid="button-copy-phone"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <a href={`tel:${immobile.contattoTelefono}`}>
                    <Button variant="ghost" size="icon" data-testid="button-call">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {immobile.contattoEmail && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {immobile.contattoEmail}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(immobile.contattoEmail!, "Email")}
                    data-testid="button-copy-email"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <a href={`mailto:${immobile.contattoEmail}`}>
                    <Button variant="ghost" size="icon" data-testid="button-email">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {!immobile.contattoNome && !immobile.contattoTelefono && !immobile.contattoEmail && (
              <p className="text-muted-foreground text-sm">Nessun contatto disponibile</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informazioni Annuncio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {immobile.fonte && (
              <div>
                <p className="text-sm text-muted-foreground">Fonte</p>
                <p className="font-medium">{immobile.fonte}</p>
              </div>
            )}

            {immobile.riferimentoAnnuncio && (
              <div>
                <p className="text-sm text-muted-foreground">Riferimento</p>
                <p className="font-medium font-mono text-sm">{immobile.riferimentoAnnuncio}</p>
              </div>
            )}

            {immobile.dataPubblicazione && (
              <div>
                <p className="text-sm text-muted-foreground">Data Pubblicazione</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(immobile.dataPubblicazione), "d MMMM yyyy", { locale: it })}
                </p>
              </div>
            )}

            {immobile.urlAnnuncio && (
              <div>
                <a
                  href={immobile.urlAnnuncio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Vedi annuncio originale
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stato Contatto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Stato</p>
              <Badge
                variant={
                  immobile.statoContatto === "contattato"
                    ? "default"
                    : immobile.statoContatto === "risposto"
                    ? "default"
                    : "secondary"
                }
              >
                {immobile.statoContatto === "nuovo"
                  ? "Da contattare"
                  : immobile.statoContatto === "contattato"
                  ? "Contattato"
                  : immobile.statoContatto === "risposto"
                  ? "Risposta ricevuta"
                  : immobile.statoContatto || "nuovo"}
              </Badge>
            </div>

            {immobile.dataContatto && (
              <div>
                <p className="text-sm text-muted-foreground">Data Contatto</p>
                <p className="font-medium">
                  {format(new Date(immobile.dataContatto), "d MMMM yyyy", { locale: it })}
                </p>
              </div>
            )}

            {immobile.messaggioInviato && (
              <div>
                <p className="text-sm text-muted-foreground">Messaggio Inviato</p>
                <p className="text-sm whitespace-pre-wrap">{immobile.messaggioInviato}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {immobile.note && (
          <Card>
            <CardHeader>
              <CardTitle>Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{immobile.note}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TabAttivita({ immobileId }: { immobileId: number }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ titolo: "", descrizione: "", stato: "da_fare" });

  interface AttivitaAcquisizione {
    id: number;
    immobileEsternoId: number;
    titolo: string;
    descrizione: string | null;
    stato: string;
    createdAt: string;
  }

  const { data: attivita = [], isLoading } = useQuery<AttivitaAcquisizione[]>({
    queryKey: ["/api/acquisizione", immobileId, "attivita"],
    queryFn: async () => {
      const res = await fetch(`/api/acquisizione/${immobileId}/attivita`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error("Failed to fetch");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newTask) => {
      return apiRequest("POST", `/api/acquisizione/${immobileId}/attivita`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione", immobileId, "attivita"] });
      toast({ title: "Attività creata" });
      setShowForm(false);
      setNewTask({ titolo: "", descrizione: "", stato: "da_fare" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completata }: { id: number; completata: boolean }) => {
      return apiRequest("PATCH", `/api/acquisizione/attivita/${id}`, { stato: completata ? "fatto" : "da_fare" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione", immobileId, "attivita"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/acquisizione/attivita/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione", immobileId, "attivita"] });
      toast({ title: "Attività eliminata" });
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
              Aggiungi attività e task per questo immobile in acquisizione
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

function TabComunicazioni({ immobileId }: { immobileId: number }) {
  interface ComunicazioneAcquisizione {
    id: number;
    immobileEsternoId: number;
    tipo: string;
    testo: string;
    canale: string | null;
    esito: string | null;
    dataOra: string;
  }

  const { data: comunicazioni = [], isLoading } = useQuery<ComunicazioneAcquisizione[]>({
    queryKey: ["/api/acquisizione", immobileId, "comunicazioni"],
    queryFn: async () => {
      const res = await fetch(`/api/acquisizione/${immobileId}/comunicazioni`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error("Failed to fetch");
      }
      return res.json();
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium">Nessuna comunicazione</h3>
          <p className="text-muted-foreground text-sm">
            Le comunicazioni con il proprietario appariranno qui
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {comunicazioni.map((com) => (
        <Card key={com.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-muted rounded-full">{getCanaleIcon(com.canale)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{com.canale || "sistema"}</Badge>
                  <Badge variant="secondary">{com.tipo}</Badge>
                  {getEsitoBadge(com.esito)}
                </div>
                <p className="text-sm mt-1">{com.testo}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(com.dataOra), "dd MMM yyyy HH:mm", { locale: it })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TabDocumenti({ immobileId }: { immobileId: number }) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ nome: "", tipo: "altro", url: "" });

  interface DocumentoAcquisizione {
    id: number;
    immobileEsternoId: number;
    nome: string;
    tipo: string;
    url: string | null;
    createdAt: string;
  }

  const { data: documenti = [], isLoading } = useQuery<DocumentoAcquisizione[]>({
    queryKey: ["/api/acquisizione", immobileId, "documenti"],
    queryFn: async () => {
      const res = await fetch(`/api/acquisizione/${immobileId}/documenti`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error("Failed to fetch");
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newDoc) => {
      return apiRequest("POST", `/api/acquisizione/${immobileId}/documenti`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione", immobileId, "documenti"] });
      toast({ title: "Documento aggiunto" });
      setShowForm(false);
      setNewDoc({ nome: "", tipo: "altro", url: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/acquisizione/documenti/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione", immobileId, "documenti"] });
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
                  <SelectItem value="foto">Foto</SelectItem>
                  <SelectItem value="annuncio">Annuncio</SelectItem>
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

function TabNote({ immobile }: { immobile: ImmobileEsterno }) {
  const { toast } = useToast();
  const [note, setNote] = useState(immobile.note || "");
  const [isSaving, setIsSaving] = useState(false);

  const updateNoteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/acquisizione/${immobile.id}`, { note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione", immobile.id] });
      toast({ title: "Note salvate" });
      setIsSaving(false);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare le note", variant: "destructive" });
      setIsSaving(false);
    },
  });

  const handleSave = () => {
    setIsSaving(true);
    updateNoteMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Note Interne</CardTitle>
        <CardDescription>Annotazioni private su questo immobile in acquisizione</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Inserisci le tue note qui..."
          className="min-h-32"
          data-testid="textarea-notes"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || note === (immobile.note || "")}
            data-testid="button-save-notes"
          >
            {isSaving ? "Salvataggio..." : "Salva Note"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TabStatistiche({ immobile }: { immobile: ImmobileEsterno }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo Immobile</CardTitle>
          <CardDescription>Informazioni principali</CardDescription>
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
              <span className="text-muted-foreground">Giorni in lista</span>
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
              <span className="text-muted-foreground">Stato contatto</span>
              <Badge variant="outline">{immobile.statoContatto || "nuovo"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Confronto Mercato</CardTitle>
          <CardDescription>Analisi rispetto al mercato</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              Analisi di mercato disponibile dopo l'acquisizione
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcquisizioneDetailPage() {
  const params = useParams<{ id: string }>();
  const immobileId = params.id ? parseInt(params.id, 10) : null;

  const { data: immobile, isLoading, error } = useQuery<ImmobileEsterno>({
    queryKey: ["/api/acquisizione", immobileId],
    enabled: immobileId !== null,
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
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Immobile non trovato</p>
            <Link href="/acquisizione">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla lista
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
        <Tabs defaultValue="dettagli" className="space-y-6">
          <TabsList className="flex-wrap h-auto gap-1" data-testid="tabs-acquisizione-detail">
            <TabsTrigger value="dettagli" data-testid="tab-dettagli">
              <Home className="h-4 w-4 mr-2" />
              Dettagli
            </TabsTrigger>
            <TabsTrigger value="comunicazioni" data-testid="tab-comunicazioni">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comunicazioni
            </TabsTrigger>
            <TabsTrigger value="attivita" data-testid="tab-attivita">
              <CheckSquare className="h-4 w-4 mr-2" />
              Attività
            </TabsTrigger>
            <TabsTrigger value="documenti" data-testid="tab-documenti">
              <FileText className="h-4 w-4 mr-2" />
              Documenti
            </TabsTrigger>
            <TabsTrigger value="note" data-testid="tab-note">
              <Edit className="h-4 w-4 mr-2" />
              Note
            </TabsTrigger>
            <TabsTrigger value="statistiche" data-testid="tab-statistiche">
              <ChartBar className="h-4 w-4 mr-2" />
              Statistiche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dettagli">
            <TabDettagli immobile={immobile} />
          </TabsContent>
          <TabsContent value="comunicazioni">
            <TabComunicazioni immobileId={immobile.id} />
          </TabsContent>
          <TabsContent value="attivita">
            <TabAttivita immobileId={immobile.id} />
          </TabsContent>
          <TabsContent value="documenti">
            <TabDocumenti immobileId={immobile.id} />
          </TabsContent>
          <TabsContent value="note">
            <TabNote immobile={immobile} />
          </TabsContent>
          <TabsContent value="statistiche">
            <TabStatistiche immobile={immobile} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
