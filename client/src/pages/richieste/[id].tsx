import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Users,
  Sparkles,
  ExternalLink,
  Calendar,
  Plus,
  Building2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { RichiestaForm } from "./richiesta-form";
import type { Richiesta, Cliente, ImmobileEsterno } from "@shared/schema";

export default function RichiestaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddExternalDialog, setShowAddExternalDialog] = useState(false);
  const [externalPropertyUrl, setExternalPropertyUrl] = useState("");
  const [externalPropertyTitolo, setExternalPropertyTitolo] = useState("");
  const [externalPropertyZona, setExternalPropertyZona] = useState("");
  const [externalPropertyPrezzo, setExternalPropertyPrezzo] = useState("");
  const [externalPropertyMq, setExternalPropertyMq] = useState("");

  const { data: richiesta, isLoading } = useQuery<Richiesta>({
    queryKey: ["/api/richieste", id],
    queryFn: async () => {
      const res = await fetch(`/api/richieste/${id}`);
      if (!res.ok) throw new Error("Richiesta non trovata");
      return res.json();
    },
  });

  const { data: cliente } = useQuery<Cliente>({
    queryKey: ["/api/clienti", richiesta?.clienteId],
    queryFn: async () => {
      const res = await fetch(`/api/clienti/${richiesta?.clienteId}`);
      if (!res.ok) throw new Error("Cliente non trovato");
      return res.json();
    },
    enabled: !!richiesta?.clienteId,
  });

  const { data: immobiliEsterni = [] } = useQuery<ImmobileEsterno[]>({
    queryKey: ["/api/richieste", id, "immobili-esterni"],
    queryFn: async () => {
      const res = await fetch(`/api/richieste/${id}/immobili-esterni`);
      if (!res.ok) throw new Error("Errore caricamento immobili");
      return res.json();
    },
    enabled: !!id,
  });

  const addExternalMutation = useMutation({
    mutationFn: async (data: { url?: string; titolo?: string; zona?: string; prezzo?: string; mq?: string }) => {
      const res = await apiRequest("POST", `/api/richieste/${id}/add-external-property`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/richieste", id, "immobili-esterni"] });
      queryClient.invalidateQueries({ queryKey: ["/api/acquisizione"] });
      toast({ title: data.message || "Immobile aggiunto con successo" });
      setShowAddExternalDialog(false);
      setExternalPropertyUrl("");
      setExternalPropertyTitolo("");
      setExternalPropertyZona("");
      setExternalPropertyPrezzo("");
      setExternalPropertyMq("");
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiungere l'immobile",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/richieste/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/richieste"] });
      toast({ title: "Richiesta eliminata con successo" });
      navigate("/richieste");
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare la richiesta",
        variant: "destructive",
      });
    },
  });

  const getPriorityLabel = (priorita: number) => {
    if (priorita === 1) return { label: "Alta", color: "bg-red-500/10 text-red-600" };
    if (priorita === 2) return { label: "Media", color: "bg-amber-500/10 text-amber-600" };
    return { label: "Bassa", color: "bg-green-500/10 text-green-600" };
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!richiesta) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Richiesta non trovata</p>
          <Link href="/richieste">
            <Button variant="link">Torna alle richieste</Button>
          </Link>
        </div>
      </div>
    );
  }

  const priority = getPriorityLabel(richiesta.priorita ?? 2);
  const features = [];
  if (richiesta.balcone) features.push("Balcone");
  if (richiesta.terrazzo) features.push("Terrazzo");
  if (richiesta.ascensore) features.push("Ascensore");
  if (richiesta.box) features.push("Box");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/richieste">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">Richiesta #{richiesta.id}</h1>
              <Badge variant={richiesta.attiva ? "default" : "secondary"}>
                {richiesta.attiva ? "Attiva" : "Inattiva"}
              </Badge>
              <Badge className={priority.color}>{priority.label}</Badge>
            </div>
            {cliente && (
              <Link href={`/clienti/${cliente.id}`}>
                <p className="text-muted-foreground flex items-center gap-1 mt-1 hover:underline cursor-pointer">
                  <Users className="h-4 w-4" />
                  {cliente.nome} {cliente.cognome}
                </p>
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {richiesta.linkRicerca && (
            <Button variant="outline" asChild data-testid="button-casafari">
              <a href={richiesta.linkRicerca} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Casafari
              </a>
            </Button>
          )}
          <Link href={`/matching?richiestaId=${richiesta.id}`}>
            <Button variant="outline" data-testid="button-matching">
              <Sparkles className="h-4 w-4 mr-2" />
              Matching
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setShowAddExternalDialog(true)} data-testid="button-add-external">
            <Plus className="h-4 w-4 mr-2" />
            Aggiungi Immobile
          </Button>
          <Button variant="outline" onClick={() => setShowEditForm(true)} data-testid="button-edit">
            <Edit className="h-4 w-4 mr-2" />
            Modifica
          </Button>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} data-testid="button-delete">
            <Trash2 className="h-4 w-4 mr-2" />
            Elimina
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Richiesta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {richiesta.descrizioneLibera && (
              <div>
                <p className="text-sm text-muted-foreground">Descrizione</p>
                <p className="mt-1">{richiesta.descrizioneLibera}</p>
              </div>
            )}
            {richiesta.zona && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Zona</p>
                  <p>{richiesta.zona}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {richiesta.budgetMassimo && (
                <div>
                  <p className="text-sm text-muted-foreground">Budget Massimo</p>
                  <p className="font-medium">€{Number(richiesta.budgetMassimo).toLocaleString('it-IT')}</p>
                </div>
              )}
              {richiesta.mqMinimi && (
                <div>
                  <p className="text-sm text-muted-foreground">MQ Minimi</p>
                  <p className="font-medium">{richiesta.mqMinimi} mq</p>
                </div>
              )}
              {richiesta.camereMinime && (
                <div>
                  <p className="text-sm text-muted-foreground">Camere Minime</p>
                  <p className="font-medium">{richiesta.camereMinime}</p>
                </div>
              )}
              {richiesta.bagniMinimi && (
                <div>
                  <p className="text-sm text-muted-foreground">Bagni Minimi</p>
                  <p className="font-medium">{richiesta.bagniMinimi}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Creata il {new Date(richiesta.createdAt).toLocaleDateString('it-IT')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferenze</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Piano</p>
              <div className="flex flex-wrap gap-1">
                {richiesta.pianoTutti && <Badge variant="outline">Tutti i piani</Badge>}
                {richiesta.pianoTerra && <Badge variant="outline">Piano Terra</Badge>}
                {richiesta.pianoIntermedi && <Badge variant="outline">Piani Intermedi</Badge>}
                {richiesta.pianoUltimo && <Badge variant="outline">Ultimo Piano</Badge>}
                {!richiesta.pianoTutti && !richiesta.pianoTerra && !richiesta.pianoIntermedi && !richiesta.pianoUltimo && (
                  <Badge variant="secondary">Indifferente</Badge>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Stato Immobile</p>
              <div className="flex flex-wrap gap-1">
                {richiesta.statoNuovo && <Badge variant="outline">Nuovo</Badge>}
                {richiesta.statoRistrutturato && <Badge variant="outline">Ristrutturato</Badge>}
                {richiesta.statoBuono && <Badge variant="outline">Buono Stato</Badge>}
                {richiesta.statoDaRistrutturare && <Badge variant="outline">Da Ristrutturare</Badge>}
                {!richiesta.statoNuovo && !richiesta.statoRistrutturato && !richiesta.statoBuono && !richiesta.statoDaRistrutturare && (
                  <Badge variant="secondary">Indifferente</Badge>
                )}
              </div>
            </div>
            {features.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Caratteristiche Richieste</p>
                <div className="flex flex-wrap gap-1">
                  {features.map((f) => (
                    <Badge key={f} variant="outline">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
            {richiesta.caratteristicheObbligatorie && richiesta.caratteristicheObbligatorie.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Caratteristiche Obbligatorie</p>
                <div className="flex flex-wrap gap-1">
                  {richiesta.caratteristicheObbligatorie.map((c) => (
                    <Badge key={c} variant="default">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            {richiesta.caratteristicheGradite && richiesta.caratteristicheGradite.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Caratteristiche Gradite</p>
                <div className="flex flex-wrap gap-1">
                  {richiesta.caratteristicheGradite.map((c) => (
                    <Badge key={c} variant="secondary">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="font-medium">{richiesta.ratingRichiesta} {richiesta.ratingRichiesta === 1 ? "stella" : "stelle"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifica Richiesta</DialogTitle>
          </DialogHeader>
          <RichiestaForm
            richiesta={richiesta}
            onSuccess={() => {
              setShowEditForm(false);
              queryClient.invalidateQueries({ queryKey: ["/api/richieste", id] });
            }}
            onCancel={() => setShowEditForm(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa richiesta? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog per aggiungere immobile esterno */}
      <Dialog open={showAddExternalDialog} onOpenChange={setShowAddExternalDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aggiungi Immobile Esterno</DialogTitle>
            <DialogDescription>
              Incolla l'URL di un annuncio oppure inserisci i dati manualmente
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addExternalMutation.mutate({
                url: externalPropertyUrl || undefined,
                titolo: externalPropertyTitolo || undefined,
                zona: externalPropertyZona || undefined,
                prezzo: externalPropertyPrezzo || undefined,
                mq: externalPropertyMq || undefined,
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="url">URL Annuncio (Idealista, Immobiliare.it, ecc.)</Label>
              <Input
                id="url"
                placeholder="https://www.idealista.it/immobile/..."
                value={externalPropertyUrl}
                onChange={(e) => setExternalPropertyUrl(e.target.value)}
                data-testid="input-external-url"
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">oppure inserisci manualmente</div>
            <div className="space-y-2">
              <Label htmlFor="titolo">Titolo</Label>
              <Input
                id="titolo"
                placeholder="Es: Bilocale in Via Roma"
                value={externalPropertyTitolo}
                onChange={(e) => setExternalPropertyTitolo(e.target.value)}
                data-testid="input-external-titolo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zona">Zona</Label>
                <Input
                  id="zona"
                  placeholder="Es: Centro, Milano"
                  value={externalPropertyZona}
                  onChange={(e) => setExternalPropertyZona(e.target.value)}
                  data-testid="input-external-zona"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prezzo">Prezzo (€)</Label>
                <Input
                  id="prezzo"
                  type="number"
                  placeholder="350000"
                  value={externalPropertyPrezzo}
                  onChange={(e) => setExternalPropertyPrezzo(e.target.value)}
                  data-testid="input-external-prezzo"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mq">Superficie (mq)</Label>
              <Input
                id="mq"
                type="number"
                placeholder="80"
                value={externalPropertyMq}
                onChange={(e) => setExternalPropertyMq(e.target.value)}
                data-testid="input-external-mq"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddExternalDialog(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={addExternalMutation.isPending} data-testid="button-submit-external">
                {addExternalMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Aggiungi
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sezione Immobili Suggeriti */}
      {immobiliEsterni.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Immobili Suggeriti ({immobiliEsterni.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {immobiliEsterni.map((immobile) => (
                <Card key={immobile.id} className="hover-elevate border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <Link href={`/acquisizione/${immobile.id}`}>
                      <h4 className="font-medium hover:underline cursor-pointer line-clamp-2" data-testid={`text-suggested-${immobile.id}`}>
                        {immobile.titolo}
                      </h4>
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {immobile.zona && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {immobile.zona}
                        </span>
                      )}
                      {immobile.prezzo && (
                        <span className="font-medium text-foreground">
                          €{Number(immobile.prezzo).toLocaleString('it-IT')}
                        </span>
                      )}
                      {immobile.mq && <span>{immobile.mq} mq</span>}
                    </div>
                    {immobile.fonte && (
                      <Badge variant="secondary" className="mt-2">
                        {immobile.fonte}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
