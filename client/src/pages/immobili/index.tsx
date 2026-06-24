import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  MapPin,
  Ruler,
  Home,
  Bath,
  Trash2,
  Edit,
  Eye,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { ImmobileForm } from "./immobile-form";
import type { Immobile, ImmobileEsterno, Cliente } from "@shared/schema";

function ImmobileCard({ immobile, onEdit, onDelete }: { 
  immobile: Immobile; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getStatoLabel = () => {
    if (immobile.statoNuovo) return "Nuovo";
    if (immobile.statoRistrutturato) return "Ristrutturato";
    if (immobile.statoBuono) return "Buono Stato";
    if (immobile.statoDaRistrutturare) return "Da Ristrutturare";
    return "N/D";
  };

  const features = [];
  if (immobile.balcone) features.push("Balcone");
  if (immobile.terrazzo) features.push("Terrazzo");
  if (immobile.ascensore) features.push("Ascensore");
  if (immobile.box) features.push("Box");

  return (
    <Card className="hover-elevate overflow-hidden">
      <div className="aspect-video bg-muted flex items-center justify-center">
        <Building2 className="h-12 w-12 text-muted-foreground/30" />
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/immobili/${immobile.id}`}>
              <h3 className="font-medium hover:underline cursor-pointer truncate" data-testid={`text-property-title-${immobile.id}`}>
                {immobile.indirizzo || immobile.titolo}
              </h3>
            </Link>
            {immobile.zona && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{immobile.zona}</span>
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-property-menu-${immobile.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/immobili/${immobile.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete} 
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold" data-testid={`text-property-price-${immobile.id}`}>
            {immobile.tipoContratto === 'locazione' && immobile.canoneMensile
              ? `€${Number(immobile.canoneMensile).toLocaleString('it-IT')}/mese`
              : immobile.prezzo
                ? `€${Number(immobile.prezzo).toLocaleString('it-IT')}`
                : "Prezzo N/D"}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {immobile.mq && (
            <span className="flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {immobile.mq} mq
            </span>
          )}
          {immobile.camere && (
            <span className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              {immobile.camere} cam.
            </span>
          )}
          {immobile.bagni && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {immobile.bagni} bagni
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge variant="secondary">{getStatoLabel()}</Badge>
          {immobile.esclusiva && (
            <Badge className="bg-amber-500/10 text-amber-600">Esclusiva</Badge>
          )}
          {immobile.piano !== null && immobile.piano !== undefined && (
            <Badge variant="outline">Piano {immobile.piano}</Badge>
          )}
        </div>

        {features.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {features.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <Badge variant={immobile.attivo ? "default" : "secondary"}>
            {immobile.attivo ? "Attivo" : "Inattivo"}
          </Badge>
          <div className="flex items-center gap-2">
            {immobile.urlAnnuncio && (
              <a 
                href={immobile.urlAnnuncio} 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid={`link-property-external-${immobile.id}`}
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Annuncio
                </Button>
              </a>
            )}
            <Link href={`/immobili/${immobile.id}`}>
              <Button size="sm" variant="outline" data-testid={`button-view-property-${immobile.id}`}>
                Dettagli
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ImmobileEsternoCard({ immobile, clienti }: { 
  immobile: ImmobileEsterno;
  clienti: Cliente[];
}) {
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

  // Get proprietario name
  const cliente = immobile.clienteId ? clienti.find(c => c.id === immobile.clienteId) : null;
  const proprietarioNome = cliente 
    ? `${cliente.nome} ${cliente.cognome || ''}`.trim()
    : `Proprietario di ${immobile.indirizzo || immobile.zona || 'Immobile'}`;

  const features = [];
  if (immobile.balcone) features.push("Balcone");
  if (immobile.terrazzo) features.push("Terrazzo");
  if (immobile.ascensore) features.push("Ascensore");
  if (immobile.box) features.push("Box");

  return (
    <Card className="hover-elevate overflow-hidden border-l-4 border-l-amber-500">
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        <Building2 className="h-12 w-12 text-muted-foreground/30" />
        <Badge className="absolute top-2 right-2 bg-amber-500 text-white">
          In Acquisizione
        </Badge>
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/immobili/esterno/${immobile.id}`}>
              <h3 className="font-medium hover:underline cursor-pointer truncate" data-testid={`text-property-ext-title-${immobile.id}`}>
                {immobile.indirizzo || immobile.titolo}
              </h3>
            </Link>
            {immobile.zona && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{immobile.zona}</span>
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-property-ext-menu-${immobile.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/immobili/esterno/${immobile.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/acquisizione?id=${immobile.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Gestisci Acquisizione
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Proprietario */}
        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            Proprietario: <span className="text-foreground font-medium">{proprietarioNome}</span>
          </p>
        </div>

        <div className="mt-3">
          <p className="text-2xl font-bold" data-testid={`text-property-ext-price-${immobile.id}`}>
            {immobile.prezzo 
              ? `€${Number(immobile.prezzo).toLocaleString('it-IT')}` 
              : "Prezzo N/D"}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {immobile.mq && (
            <span className="flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {immobile.mq} mq
            </span>
          )}
          {immobile.camere && (
            <span className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              {immobile.camere} cam.
            </span>
          )}
          {immobile.bagni && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {immobile.bagni} bagni
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Badge variant={statoContatto.variant}>{statoContatto.label}</Badge>
          <Badge variant="secondary">{getStatoLabel()}</Badge>
          {immobile.piano !== null && immobile.piano !== undefined && (
            <Badge variant="outline">Piano {immobile.piano}</Badge>
          )}
        </div>

        {features.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {features.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <Badge variant="outline" className="text-amber-600 border-amber-500">
            {immobile.fonte || "Portale"}
          </Badge>
          <div className="flex items-center gap-2">
            {immobile.urlAnnuncio && (
              <a 
                href={immobile.urlAnnuncio} 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid={`link-property-ext-external-${immobile.id}`}
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Annuncio
                </Button>
              </a>
            )}
            <Link href={`/immobili/esterno/${immobile.id}`}>
              <Button size="sm" variant="outline" data-testid={`button-view-property-ext-${immobile.id}`}>
                Dettagli
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ImmobileCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <CardContent className="p-4">
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-3" />
        <Skeleton className="h-8 w-32 mb-3" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

export default function ImmobiliPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [filterStato, setFilterStato] = useState<string>("tutti");
  const [filterTipo, setFilterTipo] = useState<string>("tutti");
  const [showForm, setShowForm] = useState(false);
  const [editingImmobile, setEditingImmobile] = useState<Immobile | null>(null);
  const [deletingImmobile, setDeletingImmobile] = useState<Immobile | null>(null);

  const { data: immobili = [], isLoading } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const { data: immobiliEsterni = [], isLoading: isLoadingEsterni } = useQuery<ImmobileEsterno[]>({
    queryKey: ["/api/immobili-esterni"],
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId && immobili.length > 0) {
      const immobileToEdit = immobili.find(i => i.id === parseInt(editId));
      if (immobileToEdit) {
        setEditingImmobile(immobileToEdit);
        setShowForm(true);
        setLocation("/immobili", { replace: true });
      }
    }
  }, [immobili, setLocation]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/immobili/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/immobili"] });
      toast({ title: "Immobile eliminato con successo" });
      setDeletingImmobile(null);
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile eliminare l'immobile", 
        variant: "destructive" 
      });
    },
  });

  // Filter immobili propri
  const filteredImmobili = immobili.filter((immobile) => {
    if (filterTipo === "acquisizione") return false; // Solo esterni
    
    const matchSearch = 
      immobile.titolo.toLowerCase().includes(search.toLowerCase()) ||
      immobile.zona?.toLowerCase().includes(search.toLowerCase()) ||
      immobile.indirizzo?.toLowerCase().includes(search.toLowerCase());
    
    let matchStato = true;
    if (filterStato === "nuovo") matchStato = !!immobile.statoNuovo;
    else if (filterStato === "ristrutturato") matchStato = !!immobile.statoRistrutturato;
    else if (filterStato === "buono") matchStato = !!immobile.statoBuono;
    else if (filterStato === "da_ristrutturare") matchStato = !!immobile.statoDaRistrutturare;
    
    return matchSearch && matchStato;
  });

  // Filter immobili esterni (in acquisizione)
  const filteredImmobiliEsterni = immobiliEsterni.filter((immobile) => {
    if (filterTipo === "miei") return false; // Solo propri
    
    const searchLower = search.toLowerCase();
    const matchSearch = !search || 
      (immobile.titolo || '').toLowerCase().includes(searchLower) ||
      (immobile.zona || '').toLowerCase().includes(searchLower) ||
      (immobile.indirizzo || '').toLowerCase().includes(searchLower);
    
    let matchStato = true;
    if (filterStato === "nuovo") matchStato = !!immobile.statoNuovo;
    else if (filterStato === "ristrutturato") matchStato = !!immobile.statoRistrutturato;
    else if (filterStato === "buono") matchStato = !!immobile.statoBuono;
    else if (filterStato === "da_ristrutturare") matchStato = !!immobile.statoDaRistrutturare;
    
    return matchSearch && matchStato;
  });

  const totalItems = filteredImmobili.length + filteredImmobiliEsterni.length;
  const isLoadingAll = isLoading || isLoadingEsterni;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-immobili-title">Immobili</h1>
          <p className="text-muted-foreground">Gestisci il tuo portafoglio immobiliare</p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-new-property">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Immobile
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per titolo, zona o indirizzo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-properties"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-tipo">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli immobili</SelectItem>
            <SelectItem value="miei">I miei immobili</SelectItem>
            <SelectItem value="acquisizione">In acquisizione</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-stato">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Stato immobile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="nuovo">Nuovo</SelectItem>
            <SelectItem value="ristrutturato">Ristrutturato</SelectItem>
            <SelectItem value="buono">Buono Stato</SelectItem>
            <SelectItem value="da_ristrutturare">Da Ristrutturare</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoadingAll ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ImmobileCardSkeleton key={i} />
          ))}
        </div>
      ) : totalItems === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nessun immobile trovato</h3>
            <p className="text-muted-foreground text-center mt-1">
              {search || filterStato !== "tutti" || filterTipo !== "tutti"
                ? "Prova a modificare i filtri di ricerca"
                : "Inizia aggiungendo il tuo primo immobile"}
            </p>
            {!search && filterStato === "tutti" && filterTipo === "tutti" && (
              <Button className="mt-4" onClick={() => setShowForm(true)} data-testid="button-add-first-property">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Immobile
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Immobili propri */}
          {filteredImmobili.map((immobile) => (
            <ImmobileCard
              key={`proprio-${immobile.id}`}
              immobile={immobile}
              onEdit={() => {
                setEditingImmobile(immobile);
                setShowForm(true);
              }}
              onDelete={() => setDeletingImmobile(immobile)}
            />
          ))}
          {/* Immobili in acquisizione */}
          {filteredImmobiliEsterni.map((immobile) => (
            <ImmobileEsternoCard
              key={`esterno-${immobile.id}`}
              immobile={immobile}
              clienti={clienti}
            />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingImmobile ? "Modifica Immobile" : "Nuovo Immobile"}
            </DialogTitle>
          </DialogHeader>
          <ImmobileForm
            immobile={editingImmobile}
            onSuccess={() => {
              setShowForm(false);
              setEditingImmobile(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingImmobile(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingImmobile} onOpenChange={() => setDeletingImmobile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente l'immobile 
              <strong> {deletingImmobile?.titolo}</strong>.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingImmobile && deleteMutation.mutate(deletingImmobile.id)}
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
