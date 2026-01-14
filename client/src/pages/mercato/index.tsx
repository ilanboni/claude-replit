import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { OpportunitaMercato } from "@shared/schema";
import { 
  Search, Plus, MapPin, Home, Euro, ExternalLink, Building2, 
  Users, ChevronRight, Filter, ArrowUpRight, TrendingUp, Clock,
  CheckCircle2, XCircle, AlertCircle, Link2, Loader2, Eye
} from "lucide-react";

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

function MatchIndicator({ matchCount, matchAlti, matchMedi }: { matchCount?: number | null; matchAlti?: number | null; matchMedi?: number | null }) {
  const count = matchCount || 0;
  const alti = matchAlti || 0;
  const medi = matchMedi || 0;

  if (count === 0) {
    return (
      <span className="text-muted-foreground text-sm">Nessun match</span>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Users className="h-4 w-4 text-primary" />
      <span className="font-medium">{count}</span>
      {(alti > 0 || medi > 0) && (
        <span className="text-xs text-muted-foreground">
          ({alti > 0 && <span className="text-green-600 dark:text-green-400">{alti} alti</span>}
          {alti > 0 && medi > 0 && ", "}
          {medi > 0 && <span className="text-amber-600 dark:text-amber-400">{medi} medi</span>})
        </span>
      )}
    </div>
  );
}

function OpportunitaCard({ opportunita }: { opportunita: OpportunitaMercato }) {
  return (
    <Link href={`/mercato/${opportunita.id}`}>
      <Card className="hover-elevate cursor-pointer transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <StatoBadge stato={opportunita.stato as OpportunitaStato} />
                {opportunita.richiestaOrigineId && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Link2 className="h-3 w-3" />
                    Collegato
                  </Badge>
                )}
              </div>
              
              <h3 className="font-semibold truncate">
                {opportunita.titolo || "Opportunità senza titolo"}
              </h3>
              
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {opportunita.zona && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {opportunita.zona}
                  </span>
                )}
                {opportunita.mq && (
                  <span className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    {opportunita.mq} mq
                  </span>
                )}
                {opportunita.prezzo && (
                  <span className="flex items-center gap-1">
                    <Euro className="h-3.5 w-3.5" />
                    {Number(opportunita.prezzo).toLocaleString("it-IT")}
                  </span>
                )}
              </div>

              <div className="pt-1">
                <MatchIndicator 
                  matchCount={opportunita.matchCount} 
                  matchAlti={opportunita.matchAlti}
                  matchMedi={opportunita.matchMedi}
                />
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
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
  const [zonaFilter, setZonaFilter] = useState<string>("");
  const [showNewDialog, setShowNewDialog] = useState(false);

  const { data: opportunita, isLoading, refetch } = useQuery<OpportunitaMercato[]>({
    queryKey: ["/api/mercato", statoFilter, zonaFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statoFilter && statoFilter !== "tutti") params.append("stato", statoFilter);
      if (zonaFilter) params.append("zona", zonaFilter);
      const res = await fetch(`/api/mercato?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const filteredOpportunita = (opportunita || []).filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.titolo?.toLowerCase().includes(q) ||
      o.zona?.toLowerCase().includes(q) ||
      o.indirizzo?.toLowerCase().includes(q)
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Opportunità di Mercato</h1>
          <p className="text-muted-foreground">
            Gestisci immobili multi-agenzia e traccia il percorso di acquisizione
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} data-testid="button-new-opportunita">
          <Plus className="h-4 w-4 mr-2" />
          Nuova opportunità
        </Button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("tutti")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Totale</span>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{stats.totale}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("in_valutazione")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">In valutazione</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.inValutazione}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("iter_proprietario")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Iter proprietario</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.iterProprietario}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("acquisito")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Acquisiti</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.acquisite}</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate cursor-pointer" onClick={() => setStatoFilter("scartato")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Scartati</span>
              <XCircle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.scartate}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca per titolo, zona, indirizzo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        
        <Select value={statoFilter} onValueChange={setStatoFilter}>
          <SelectTrigger className="w-48" data-testid="select-stato">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti gli stati</SelectItem>
            <SelectItem value="in_valutazione">In valutazione</SelectItem>
            <SelectItem value="iter_proprietario">Iter proprietario</SelectItem>
            <SelectItem value="acquisito">Acquisito</SelectItem>
            <SelectItem value="scartato">Scartato</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filtra per zona..."
          value={zonaFilter}
          onChange={(e) => setZonaFilter(e.target.value)}
          className="w-40"
          data-testid="input-zona-filter"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredOpportunita.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nessuna opportunità trovata</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statoFilter !== "tutti" || zonaFilter
                ? "Prova a modificare i filtri di ricerca"
                : "Inizia aggiungendo una nuova opportunità di mercato"}
            </p>
            {!searchQuery && statoFilter === "tutti" && !zonaFilter && (
              <Button onClick={() => setShowNewDialog(true)} data-testid="button-add-first">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi prima opportunità
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOpportunita.map((opp) => (
            <OpportunitaCard key={opp.id} opportunita={opp} />
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
    </div>
  );
}
