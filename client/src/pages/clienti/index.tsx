import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Star,
  Phone,
  Mail,
  Trash2,
  Edit,
  Eye,
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
import { ClienteForm } from "./cliente-form";
import type { Cliente } from "@shared/schema";

function ClienteCard({ cliente, onEdit, onDelete }: { 
  cliente: Cliente; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tipoLabel = cliente.tipoCliente === "compratore" ? "Compratore" : 
    cliente.tipoCliente === "venditore" ? "Venditore" : "Compratore/Venditore";

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              {cliente.nome[0]}{cliente.cognome[0]}
            </div>
            <div>
              <Link href={`/clienti/${cliente.id}`}>
                <h3 className="font-medium hover:underline cursor-pointer" data-testid={`text-client-name-${cliente.id}`}>
                  {cliente.appellativo && `${cliente.appellativo} `}
                  {cliente.nome} {cliente.cognome}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {tipoLabel}
                </Badge>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${star <= (cliente.ratingCliente ?? 3) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-client-menu-${cliente.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/clienti/${cliente.id}`}>
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

        <div className="mt-4 space-y-2">
          {cliente.telefono && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span data-testid={`text-client-phone-${cliente.id}`}>{cliente.telefono}</span>
            </div>
          )}
          {cliente.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span data-testid={`text-client-email-${cliente.id}`}>{cliente.email}</span>
            </div>
          )}
        </div>

        {cliente.note && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {cliente.note}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <Badge variant={cliente.attivo ? "default" : "secondary"}>
            {cliente.attivo ? "Attivo" : "Inattivo"}
          </Badge>
          <Link href={`/clienti/${cliente.id}`}>
            <Button size="sm" variant="outline" data-testid={`button-view-client-${cliente.id}`}>
              Scheda Completa
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function ClienteCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientiPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("tutti");
  const [showForm, setShowForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [deletingCliente, setDeletingCliente] = useState<Cliente | null>(null);

  const { data: clienti = [], isLoading } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/clienti/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clienti"] });
      toast({ title: "Cliente eliminato con successo" });
      setDeletingCliente(null);
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile eliminare il cliente", 
        variant: "destructive" 
      });
    },
  });

  const filteredClienti = clienti.filter((cliente) => {
    const matchSearch = 
      cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
      cliente.cognome.toLowerCase().includes(search.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(search.toLowerCase()) ||
      cliente.telefono?.includes(search);
    
    const matchTipo = filterTipo === "tutti" || cliente.tipoCliente === filterTipo;
    
    return matchSearch && matchTipo;
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-clienti-title">Clienti</h1>
          <p className="text-muted-foreground">Gestisci la tua rubrica clienti</p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-new-client">
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Cliente
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per nome, email o telefono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-type">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Tipo cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i tipi</SelectItem>
            <SelectItem value="compratore">Compratori</SelectItem>
            <SelectItem value="venditore">Venditori</SelectItem>
            <SelectItem value="entrambi">Compratori/Venditori</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ClienteCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredClienti.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nessun cliente trovato</h3>
            <p className="text-muted-foreground text-center mt-1">
              {search || filterTipo !== "tutti" 
                ? "Prova a modificare i filtri di ricerca"
                : "Inizia aggiungendo il tuo primo cliente"}
            </p>
            {!search && filterTipo === "tutti" && (
              <Button className="mt-4" onClick={() => setShowForm(true)} data-testid="button-add-first-client">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredClienti.map((cliente) => (
            <ClienteCard
              key={cliente.id}
              cliente={cliente}
              onEdit={() => {
                setEditingCliente(cliente);
                setShowForm(true);
              }}
              onDelete={() => setDeletingCliente(cliente)}
            />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? "Modifica Cliente" : "Nuovo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <ClienteForm
            cliente={editingCliente}
            onSuccess={() => {
              setShowForm(false);
              setEditingCliente(null);
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingCliente(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCliente} onOpenChange={() => setDeletingCliente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà permanentemente il cliente 
              <strong> {deletingCliente?.nome} {deletingCliente?.cognome}</strong> e tutti i dati associati.
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCliente && deleteMutation.mutate(deletingCliente.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
