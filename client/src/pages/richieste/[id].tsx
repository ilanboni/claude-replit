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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { RichiestaForm } from "./richiesta-form";
import type { Richiesta, Cliente } from "@shared/schema";

export default function RichiestaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    </div>
  );
}
