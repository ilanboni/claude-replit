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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
            <CardTitle>Contatti</CardTitle>
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
                <p className="font-medium">{immobile.riferimentoAnnuncio}</p>
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
                  : immobile.statoContatto}
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
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
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
    <div className="min-h-full">
      <PropertyHeader immobile={immobile} />
      <div className="p-6">
        <TabDettagli immobile={immobile} />
      </div>
    </div>
  );
}
