import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OpportunitaMercato } from "@shared/schema";
import { 
  Search, Plus, MapPin, Home, Euro, ExternalLink, Building2, 
  Users, Filter, Clock, CheckCircle2, XCircle, TrendingUp,
  Loader2, MoreHorizontal, Eye, Edit, Trash2, Ruler, Bath
} from "lucide-react";

type OpportunitaStato = "in_valutazione" | "iter_proprietario" | "acquisito" | "scartato";

const STATI_CONFIG: Record<OpportunitaStato, { label: string; color: string; icon: typeof Clock }> = {
  in_valutazione: { label: "In valutazione", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Clock },
  iter_proprietario: { label: "Iter proprietario", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: TrendingUp },
  acquisito: { label: "Acquisito", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  scartato: { label: "Scartato", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
};

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

function OpportunitaCard({ opportunita, onDelete }: { 
  opportunita: OpportunitaMercato;
  onDelete: () => void;
}) {
  const features: string[] = [];
  if (opportunita.balcone) features.push("Balcone");
  if (opportunita.terrazzo) features.push("Terrazzo");
  if (opportunita.ascensore) features.push("Ascensore");
  if (opportunita.box) features.push("Box");

  return (
    <Card className="hover-elevate overflow-hidden">
      <div className="aspect-video bg-muted flex items-center justify-center relative">
        <Building2 className="h-12 w-12 text-muted-foreground/30" />
        <div className="absolute top-2 left-2">
          <StatoBadge stato={(opportunita.stato as OpportunitaStato) || "in_valutazione"} />
        </div>
        {opportunita.matchCount && opportunita.matchCount > 0 && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
            <Users className="h-3 w-3 mr-1" />
            {opportunita.matchCount} match
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/mercato/${opportunita.id}`}>
              <h3 className="font-medium hover:underline cursor-pointer truncate" data-testid={`text-opportunita-title-${opportunita.id}`}>
                {opportunita.titolo || opportunita.indirizzo || "Opportunità senza titolo"}
              </h3>
            </Link>
            {opportunita.zona && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{opportunita.zona}{opportunita.citta ? `, ${opportunita.citta}` : ''}</span>
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-opportunita-menu-${opportunita.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/mercato/${opportunita.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Visualizza
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/mercato/${opportunita.id}?edit=true`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifica
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

        <div className="mt-3">
          <p className="text-2xl font-bold" data-testid={`text-opportunita-price-${opportunita.id}`}>
            {opportunita.prezzo 
              ? `€${Number(opportunita.prezzo).toLocaleString('it-IT')}` 
              : "Prezzo N/D"}
          </p>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
          {opportunita.mq && (
            <span className="flex items-center gap-1">
              <Ruler className="h-4 w-4" />
              {opportunita.mq} mq
            </span>
          )}
          {opportunita.camere && (
            <span className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              {opportunita.camere} cam.
            </span>
          )}
          {opportunita.bagni && (
            <span className="flex items-center gap-1">
              <Bath className="h-4 w-4" />
              {opportunita.bagni} bagni
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {opportunita.piano !== null && opportunita.piano !== undefined && (
            <Badge variant="outline">Piano {opportunita.piano}</Badge>
          )}
          {opportunita.classeEnergetica && (
            <Badge variant="outline">Classe {opportunita.classeEnergetica}</Badge>
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
          <Badge variant={opportunita.attivo ? "default" : "secondary"}>
            {opportunita.attivo ? "Attivo" : "Inattivo"}
          </Badge>
          <div className="flex items-center gap-2">
            {opportunita.urlAnnuncio && (
              <a 
                href={opportunita.urlAnnuncio} 
                target="_blank" 
                rel="noopener noreferrer"
                data-testid={`link-opportunita-external-${opportunita.id}`}
              >
                <Button size="sm" variant="outline">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Annuncio
                </Button>
              </a>
            )}
            <Link href={`/mercato/${opportunita.id}`}>
              <Button size="sm" variant="outline" data-testid={`button-view-opportunita-${opportunita.id}`}>
                Dettagli
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OpportunitaCardSkeleton() {
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

function NuovaOpportunitaDialog({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    titolo: "",
    zona: "",
    indirizzo: "",
    citta: "Milano",
    mq: "",
    prezzo: "",
    camere: "",
    bagni: "",
    piano: "",
    urlAnnuncio: "",
    note: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        titolo: data.titolo || null,
        zona: data.zona || null,
        indirizzo: data.indirizzo || null,
        citta: data.citta || "Milano",
        mq: data.mq ? Number(data.mq) : null,
        prezzo: data.prezzo || null,
        camere: data.camere ? Number(data.camere) : null,
        bagni: data.bagni ? Number(data.bagni) : null,
        piano: data.piano ? Number(data.piano) : null,
        urlAnnuncio: data.urlAnnuncio || null,
        note: data.note || null,
        stato: "in_valutazione",
      };
      const res = await apiRequest("POST", "/api/mercato", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Opportunità creata", description: "Puoi ora gestire il follow-up con il proprietario" });
      onSuccess();
      onOpenChange(false);
      setFormData({ titolo: "", zona: "", indirizzo: "", citta: "Milano", mq: "", prezzo: "", camere: "", bagni: "", piano: "", urlAnnuncio: "", note: "" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile creare l'opportunità", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuova opportunità di mercato</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Titolo</Label>
              <Input 
                placeholder="Es. Trilocale San Siro"
                value={formData.titolo}
                onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                data-testid="input-titolo"
              />
            </div>
            <div className="space-y-2">
              <Label>Zona</Label>
              <Input 
                placeholder="Es. San Siro"
                value={formData.zona}
                onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                data-testid="input-zona"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Indirizzo</Label>
            <Input 
              placeholder="Es. Via delle Rose 10"
              value={formData.indirizzo}
              onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
              data-testid="input-indirizzo"
            />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>MQ</Label>
              <Input 
                type="number"
                placeholder="80"
                value={formData.mq}
                onChange={(e) => setFormData({ ...formData, mq: e.target.value })}
                data-testid="input-mq"
              />
            </div>
            <div className="space-y-2">
              <Label>Prezzo</Label>
              <Input 
                placeholder="280000"
                value={formData.prezzo}
                onChange={(e) => setFormData({ ...formData, prezzo: e.target.value })}
                data-testid="input-prezzo"
              />
            </div>
            <div className="space-y-2">
              <Label>Camere</Label>
              <Input 
                type="number"
                placeholder="2"
                value={formData.camere}
                onChange={(e) => setFormData({ ...formData, camere: e.target.value })}
                data-testid="input-camere"
              />
            </div>
            <div className="space-y-2">
              <Label>Piano</Label>
              <Input 
                type="number"
                placeholder="3"
                value={formData.piano}
                onChange={(e) => setFormData({ ...formData, piano: e.target.value })}
                data-testid="input-piano"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>URL Annuncio (opzionale)</Label>
            <Input 
              placeholder="https://www.immobiliare.it/..."
              value={formData.urlAnnuncio}
              onChange={(e) => setFormData({ ...formData, urlAnnuncio: e.target.value })}
              data-testid="input-url"
            />
          </div>

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea 
              placeholder="Note sull'opportunità..."
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              data-testid="input-note"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
            Annulla
          </Button>
          <Button 
            onClick={() => createMutation.mutate(formData)}
            disabled={createMutation.isPending}
            data-testid="button-create"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crea opportunità
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MercatoPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statoFilter, setStatoFilter] = useState<string>("tutti");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [deletingOpportunita, setDeletingOpportunita] = useState<OpportunitaMercato | null>(null);

  const { data: opportunita, isLoading, refetch } = useQuery<OpportunitaMercato[]>({
    queryKey: ["/api/mercato", statoFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statoFilter && statoFilter !== "tutti") params.append("stato", statoFilter);
      const res = await fetch(`/api/mercato?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/mercato/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mercato"] });
      toast({ title: "Opportunità eliminata" });
      setDeletingOpportunita(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare", variant: "destructive" });
    },
  });

  const filteredOpportunita = (opportunita || []).filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.titolo?.toLowerCase().includes(q) ||
      o.zona?.toLowerCase().includes(q) ||
      o.indirizzo?.toLowerCase().includes(q) ||
      o.citta?.toLowerCase().includes(q)
    );
  });

  const stats = {
    totale: opportunita?.length || 0,
    inValutazione: opportunita?.filter(o => o.stato === "in_valutazione").length || 0,
    iterProprietario: opportunita?.filter(o => o.stato === "iter_proprietario").length || 0,
    acquisite: opportunita?.filter(o => o.stato === "acquisito").length || 0,
    scartate: opportunita?.filter(o => o.stato === "scartato").length || 0,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-mercato-title">Opportunità di Mercato</h1>
          <p className="text-muted-foreground">Gestisci immobili multi-agenzia e traccia il percorso di acquisizione</p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} data-testid="button-new-opportunita">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Opportunità
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("tutti")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Totale</span>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.totale}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("in_valutazione")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">In valutazione</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.inValutazione}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("iter_proprietario")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Iter proprietario</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.iterProprietario}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("acquisito")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Acquisiti</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.acquisite}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("scartato")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Scartati</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.scartate}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per titolo, zona o indirizzo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={statoFilter} onValueChange={setStatoFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-stato">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="in_valutazione">In valutazione</SelectItem>
            <SelectItem value="iter_proprietario">Iter proprietario</SelectItem>
            <SelectItem value="acquisito">Acquisito</SelectItem>
            <SelectItem value="scartato">Scartato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <OpportunitaCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredOpportunita.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nessuna opportunità trovata</h3>
            <p className="text-muted-foreground text-center mt-1">
              {searchQuery || statoFilter !== "tutti"
                ? "Prova a modificare i filtri di ricerca"
                : "Inizia aggiungendo una nuova opportunità di mercato"}
            </p>
            {!searchQuery && statoFilter === "tutti" && (
              <Button className="mt-4" onClick={() => setShowNewDialog(true)} data-testid="button-add-first">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Opportunità
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunita.map((opp) => (
            <OpportunitaCard 
              key={opp.id} 
              opportunita={opp} 
              onDelete={() => setDeletingOpportunita(opp)}
            />
          ))}
        </div>
      )}

      <NuovaOpportunitaDialog 
        open={showNewDialog} 
        onOpenChange={setShowNewDialog}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/mercato"] });
          refetch();
        }}
      />

      {deletingOpportunita && (
        <Dialog open={!!deletingOpportunita} onOpenChange={() => setDeletingOpportunita(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminare questa opportunità?</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Questa azione eliminerà permanentemente l'opportunità 
              <strong> {deletingOpportunita.titolo}</strong>.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingOpportunita(null)}>
                Annulla
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => deleteMutation.mutate(deletingOpportunita.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Elimina
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
