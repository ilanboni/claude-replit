import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  MapPin,
  Trash2,
  Edit,
  Eye,
  FileText,
  Users,
  Sparkles,
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
import { RichiestaForm } from "./richiesta-form";
import type { Richiesta, Cliente } from "@shared/schema";

function RichiestaCard({ 
  richiesta, 
  cliente,
  onEdit, 
  onDelete 
}: { 
  richiesta: Richiesta; 
  cliente?: Cliente;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const getPriorityColor = (priorita: number) => {
    if (priorita === 1) return "bg-red-500/10 text-red-600";
    if (priorita === 2) return "bg-amber-500/10 text-amber-600";
    return "bg-green-500/10 text-green-600";
  };

  const features = [];
  if (richiesta.balcone) features.push("Balcone");
  if (richiesta.terrazzo) features.push("Terrazzo");
  if (richiesta.ascensore) features.push("Ascensore");
  if (richiesta.box) features.push("Box");

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium" data-testid={`text-request-${richiesta.id}`}>
                Richiesta #{richiesta.id}
              </h3>
              <Badge variant={richiesta.attiva ? "default" : "secondary"}>
                {richiesta.attiva ? "Attiva" : "Inattiva"}
              </Badge>
              <Badge className={getPriorityColor(richiesta.priorita ?? 2)}>
                {richiesta.priorita === 1 ? "Alta" : richiesta.priorita === 2 ? "Media" : "Bassa"}
              </Badge>
            </div>
            {cliente && (
              <Link href={`/clienti/${cliente.id}`}>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 hover:underline cursor-pointer">
                  <Users className="h-3 w-3" />
                  {cliente.nome} {cliente.cognome}
                </p>
              </Link>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/richieste/${richiesta.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifica
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/matching?richiestaId=${richiesta.id}`}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Trova Matching
                </Link>
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

        {richiesta.descrizioneLibera && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {richiesta.descrizioneLibera}
          </p>
        )}

        <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
          {richiesta.zona && (
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {richiesta.zona}
            </span>
          )}
          {richiesta.budgetMassimo && (
            <span className="font-medium">
              Budget: €{Number(richiesta.budgetMassimo).toLocaleString('it-IT')}
            </span>
          )}
          {richiesta.mqMinimi && (
            <span>Min. {richiesta.mqMinimi} mq</span>
          )}
        </div>

        {features.length > 0 && (
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {features.map((f) => (
              <Badge key={f} variant="outline" className="text-xs">
                {f}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Creata il {new Date(richiesta.createdAt).toLocaleDateString('it-IT')}
          </span>
          <Link href={`/matching?richiestaId=${richiesta.id}`}>
            <Button size="sm" variant="outline" data-testid={`button-matching-${richiesta.id}`}>
              <Sparkles className="h-4 w-4 mr-1" />
              Matching
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function RichiestePage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterPriorita, setFilterPriorita] = useState<string>("tutti");
  const [showForm, setShowForm] = useState(false);
  const [editingRichiesta, setEditingRichiesta] = useState<Richiesta | null>(null);
  const [deletingRichiesta, setDeletingRichiesta] = useState<Richiesta | null>(null);

  const { data: richieste = [], isLoading } = useQuery<Richiesta[]>({
    queryKey: ["/api/richieste"],
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const clientiMap = new Map(clienti.map(c => [c.id, c]));

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/richieste/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/richieste"] });
      toast({ title: "Richiesta eliminata con successo" });
      setDeletingRichiesta(null);
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile eliminare la richiesta", 
        variant: "destructive" 
      });
    },
  });

  const filteredRichieste = richieste.filter((richiesta) => {
    const cliente = clientiMap.get(richiesta.clienteId);
    const matchSearch = 
      richiesta.descrizioneLibera?.toLowerCase().includes(search.toLowerCase()) ||
      richiesta.zona?.toLowerCase().includes(search.toLowerCase()) ||
      cliente?.nome.toLowerCase().includes(search.toLowerCase()) ||
      cliente?.cognome.toLowerCase().includes(search.toLowerCase());
    
    let matchPriorita = true;
    if (filterPriorita === "alta") matchPriorita = richiesta.priorita === 1;
    else if (filterPriorita === "media") matchPriorita = richiesta.priorita === 2;
    else if (filterPriorita === "bassa") matchPriorita = richiesta.priorita === 3;
    
    return matchSearch && matchPriorita;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-richieste-title">Richieste</h1>
          <p className="text-muted-foreground">Gestisci le richieste dei compratori</p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-new-request">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Richiesta
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per descrizione, zona o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-requests"
          />
        </div>
        <Select value={filterPriorita} onValueChange={setFilterPriorita}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Priorità" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutte le priorità</SelectItem>
            <SelectItem value="alta">Alta priorità</SelectItem>
            <SelectItem value="media">Media priorità</SelectItem>
            <SelectItem value="bassa">Bassa priorità</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-3" />
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRichieste.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nessuna richiesta trovata</h3>
            <p className="text-muted-foreground text-center mt-1">
              {search || filterPriorita !== "tutti" 
                ? "Prova a modificare i filtri di ricerca"
                : "Inizia aggiungendo una nuova richiesta"}
            </p>
            {!search && filterPriorita === "tutti" && (
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Richiesta
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRichieste.map((richiesta) => (
            <RichiestaCard
              key={richiesta.id}
              richiesta={richiesta}
              cliente={clientiMap.get(richiesta.clienteId)}
              onEdit={() => {
                setEditingRichiesta(richiesta);
                setShowForm(true);
              }}
              onDelete={() => setDeletingRichiesta(richiesta)}
            />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRichiesta ? "Modifica Richiesta" : "Nuova Richiesta"}
            </DialogTitle>
          </DialogHeader>
          <RichiestaForm
            richiesta={editingRichiesta}
            onSuccess={() => {
              setShowForm(false);
              setEditingRichiesta(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingRichiesta(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRichiesta} onOpenChange={() => setDeletingRichiesta(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente la richiesta #{deletingRichiesta?.id}.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingRichiesta && deleteMutation.mutate(deletingRichiesta.id)}
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
