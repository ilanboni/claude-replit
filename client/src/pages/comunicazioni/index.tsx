import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Plus,
  Search,
  MessageSquare,
  Phone,
  Mail,
  Users,
  Building2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Comunicazione, Cliente, Immobile } from "@shared/schema";

function ComunicazioneItem({ 
  comunicazione, 
  cliente,
  immobile,
}: { 
  comunicazione: Comunicazione; 
  cliente?: Cliente;
  immobile?: Immobile;
}) {
  const getChannelIcon = () => {
    switch (comunicazione.canale) {
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'telefono':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getChannelColor = () => {
    switch (comunicazione.canale) {
      case 'whatsapp':
        return 'bg-green-500/10 text-green-600';
      case 'email':
        return 'bg-blue-500/10 text-blue-600';
      case 'telefono':
        return 'bg-amber-500/10 text-amber-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTipoColor = () => {
    switch (comunicazione.tipo) {
      case 'matching':
        return 'bg-purple-500/10 text-purple-600';
      case 'followup':
        return 'bg-orange-500/10 text-orange-600';
      case 'auguri':
        return 'bg-pink-500/10 text-pink-600';
      default:
        return '';
    }
  };

  return (
    <Card className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getChannelColor()}`}>
            {getChannelIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {cliente && (
                <Link href={`/clienti/${cliente.id}`}>
                  <span className="font-medium hover:underline cursor-pointer flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {cliente.nome} {cliente.cognome}
                  </span>
                </Link>
              )}
              <Badge variant="secondary" className={`text-xs capitalize ${getTipoColor()}`}>
                {comunicazione.tipo}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {comunicazione.canale}
              </Badge>
            </div>

            {immobile && (
              <Link href={`/immobili/${immobile.id}`}>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 hover:underline cursor-pointer">
                  <Building2 className="h-3 w-3" />
                  {immobile.titolo}
                </p>
              </Link>
            )}

            <p className="text-sm mt-2 whitespace-pre-wrap">{comunicazione.testo}</p>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>
                {new Date(comunicazione.dataOra).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <span className="capitalize">Da: {comunicazione.creatoDA}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewComunicazioneForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [clienteId, setClienteId] = useState<string>("");
  const [immobileId, setImmobileId] = useState<string>("");
  const [tipo, setTipo] = useState<string>("nota");
  const [canale, setCanale] = useState<string>("sistema");
  const [testo, setTesto] = useState<string>("");

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const { data: immobili = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const mutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/comunicazioni", {
        clienteId: clienteId ? parseInt(clienteId) : null,
        immobileId: immobileId ? parseInt(immobileId) : null,
        tipo,
        canale,
        testo,
        creatoDA: "agente",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comunicazioni"] });
      toast({ title: "Comunicazione aggiunta" });
      onSuccess();
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile aggiungere la comunicazione", 
        variant: "destructive" 
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Cliente</label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger data-testid="select-cliente">
              <SelectValue placeholder="Seleziona cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clienti.map((c) => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  {c.nome} {c.cognome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Immobile (opzionale)</label>
          <Select value={immobileId} onValueChange={setImmobileId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona immobile..." />
            </SelectTrigger>
            <SelectContent>
              {immobili.map((i) => (
                <SelectItem key={i.id} value={i.id.toString()}>
                  {i.titolo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Tipo</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger data-testid="select-tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nota">Nota interna</SelectItem>
              <SelectItem value="richiesta">Richiesta</SelectItem>
              <SelectItem value="risposta">Risposta</SelectItem>
              <SelectItem value="followup">Follow-up</SelectItem>
              <SelectItem value="matching">Matching</SelectItem>
              <SelectItem value="auguri">Auguri</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Canale</label>
          <Select value={canale} onValueChange={setCanale}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sistema">Sistema</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="telefono">Telefono</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Messaggio</label>
        <Textarea
          placeholder="Scrivi il messaggio..."
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          className="min-h-24"
          data-testid="textarea-testo"
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button 
          onClick={() => mutation.mutate()} 
          disabled={!testo.trim() || mutation.isPending}
          data-testid="button-send-communication"
        >
          {mutation.isPending ? (
            "Invio..."
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Invia
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function ComunicazioniPage() {
  const [search, setSearch] = useState("");
  const [filterCanale, setFilterCanale] = useState<string>("tutti");
  const [showForm, setShowForm] = useState(false);

  const { data: comunicazioni = [], isLoading } = useQuery<Comunicazione[]>({
    queryKey: ["/api/comunicazioni"],
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const { data: immobili = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const clientiMap = new Map(clienti.map(c => [c.id, c]));
  const immobiliMap = new Map(immobili.map(i => [i.id, i]));

  const filteredComunicazioni = comunicazioni.filter((com) => {
    const cliente = com.clienteId ? clientiMap.get(com.clienteId) : null;
    const matchSearch = 
      com.testo.toLowerCase().includes(search.toLowerCase()) ||
      cliente?.nome.toLowerCase().includes(search.toLowerCase()) ||
      cliente?.cognome.toLowerCase().includes(search.toLowerCase());
    
    const matchCanale = filterCanale === "tutti" || com.canale === filterCanale;
    
    return matchSearch && matchCanale;
  }).sort((a, b) => new Date(b.dataOra).getTime() - new Date(a.dataOra).getTime());

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-comunicazioni-title">Comunicazioni</h1>
          <p className="text-muted-foreground">Storico delle comunicazioni con i clienti</p>
        </div>
        <Button onClick={() => setShowForm(true)} data-testid="button-new-communication">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Comunicazione
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cerca per testo o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-communications"
          />
        </div>
        <Select value={filterCanale} onValueChange={setFilterCanale}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Canale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti i canali</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="telefono">Telefono</SelectItem>
            <SelectItem value="sistema">Sistema</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredComunicazioni.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nessuna comunicazione</h3>
            <p className="text-muted-foreground text-center mt-1">
              {search || filterCanale !== "tutti" 
                ? "Prova a modificare i filtri di ricerca"
                : "Le comunicazioni con i clienti appariranno qui"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredComunicazioni.map((com) => (
            <ComunicazioneItem
              key={com.id}
              comunicazione={com}
              cliente={com.clienteId ? clientiMap.get(com.clienteId) : undefined}
              immobile={com.immobileId ? immobiliMap.get(com.immobileId) : undefined}
            />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuova Comunicazione</DialogTitle>
          </DialogHeader>
          <NewComunicazioneForm onSuccess={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
