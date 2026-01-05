import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import {
  Sparkles,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  MapPin,
  Ruler,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Matching, Richiesta, Immobile, Cliente } from "@shared/schema";

function MatchCard({ 
  match, 
  richiesta,
  immobile,
  cliente,
  onPropose,
  onAccept,
  onReject,
}: { 
  match: Matching; 
  richiesta?: Richiesta;
  immobile?: Immobile;
  cliente?: Cliente;
  onPropose: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <Card className="hover-elevate overflow-hidden">
      <div className={`h-1 ${getScoreBg(match.punteggio)}`} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-full border-4 ${getScoreBg(match.punteggio)}/20 border-current ${getScoreColor(match.punteggio)}`}>
              <span className="text-lg font-bold">{match.punteggio}%</span>
            </div>
            <div>
              <h3 className="font-medium flex items-center gap-2">
                Match #{match.id}
                {match.proposto && (
                  <Badge variant="secondary">Proposto</Badge>
                )}
                {match.accettato === true && (
                  <Badge className="bg-green-500/10 text-green-600">Accettato</Badge>
                )}
                {match.accettato === false && (
                  <Badge className="bg-red-500/10 text-red-600">Rifiutato</Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                Creato il {new Date(match.createdAt).toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>

          {!match.proposto && (
            <Button onClick={onPropose} size="sm" data-testid={`button-propose-${match.id}`}>
              Proponi
            </Button>
          )}
          {match.proposto && match.accettato === null && (
            <div className="flex gap-2">
              <Button 
                onClick={onAccept} 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
                data-testid={`button-accept-${match.id}`}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Accetta
              </Button>
              <Button 
                onClick={onReject} 
                size="sm" 
                variant="destructive"
                data-testid={`button-reject-${match.id}`}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rifiuta
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mt-4">
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Richiesta
            </div>
            {richiesta && cliente ? (
              <div>
                <Link href={`/clienti/${cliente.id}`}>
                  <p className="font-medium hover:underline cursor-pointer">
                    {cliente.nome} {cliente.cognome}
                  </p>
                </Link>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  {richiesta.zona && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {richiesta.zona}
                    </span>
                  )}
                  {richiesta.budgetMassimo && (
                    <span>€{Number(richiesta.budgetMassimo).toLocaleString('it-IT')}</span>
                  )}
                  {richiesta.mqMinimi && (
                    <span>{richiesta.mqMinimi}+ mq</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Richiesta #{match.richiestaId}</p>
            )}
          </div>

          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Immobile
            </div>
            {immobile ? (
              <div>
                <Link href={`/immobili/${immobile.id}`}>
                  <p className="font-medium hover:underline cursor-pointer">
                    {immobile.titolo}
                  </p>
                </Link>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  {immobile.zona && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {immobile.zona}
                    </span>
                  )}
                  {immobile.prezzo && (
                    <span>€{Number(immobile.prezzo).toLocaleString('it-IT')}</span>
                  )}
                  {immobile.mq && (
                    <span>{immobile.mq} mq</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Immobile #{match.immobileId}</p>
            )}
          </div>
        </div>

        {match.note && (
          <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted rounded">
            {match.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function MatchingPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const richiestaIdParam = urlParams.get('richiestaId');
  
  const [filterStato, setFilterStato] = useState<string>("tutti");
  const [minScore, setMinScore] = useState<string>("0");

  const { data: matching = [], isLoading } = useQuery<Matching[]>({
    queryKey: ["/api/matching"],
  });

  const { data: richieste = [] } = useQuery<Richiesta[]>({
    queryKey: ["/api/richieste"],
  });

  const { data: immobili = [] } = useQuery<Immobile[]>({
    queryKey: ["/api/immobili"],
  });

  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const richiesteMap = new Map(richieste.map(r => [r.id, r]));
  const immobiliMap = new Map(immobili.map(i => [i.id, i]));
  const clientiMap = new Map(clienti.map(c => [c.id, c]));

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/matching/generate", {
        richiestaId: richiestaIdParam ? parseInt(richiestaIdParam) : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matching"] });
      toast({ title: "Matching generati con successo" });
    },
    onError: () => {
      toast({ 
        title: "Errore", 
        description: "Impossibile generare i matching", 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Matching> }) => {
      return apiRequest("PATCH", `/api/matching/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matching"] });
      toast({ title: "Match aggiornato" });
    },
  });

  const filteredMatching = matching.filter((m) => {
    if (richiestaIdParam && m.richiestaId !== parseInt(richiestaIdParam)) {
      return false;
    }
    
    if (m.punteggio < parseInt(minScore)) {
      return false;
    }
    
    if (filterStato === "da_proporre" && m.proposto) return false;
    if (filterStato === "proposti" && !m.proposto) return false;
    if (filterStato === "accettati" && m.accettato !== true) return false;
    if (filterStato === "rifiutati" && m.accettato !== false) return false;
    
    return true;
  }).sort((a, b) => b.punteggio - a.punteggio);

  const stats = {
    total: matching.length,
    highScore: matching.filter(m => m.punteggio >= 80).length,
    proposed: matching.filter(m => m.proposto).length,
    accepted: matching.filter(m => m.accettato === true).length,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2" data-testid="text-matching-title">
            <Sparkles className="h-6 w-6 text-primary" />
            Matching
          </h1>
          <p className="text-muted-foreground">
            {richiestaIdParam 
              ? `Matching per richiesta #${richiestaIdParam}` 
              : "Trova le corrispondenze perfette tra richieste e immobili"}
          </p>
        </div>
        <Button 
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          data-testid="button-generate-matching"
        >
          {generateMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generazione...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Genera Matching
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Totale Match</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Alta Compatibilità</p>
            <p className="text-2xl font-bold text-green-600">{stats.highScore}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Proposti</p>
            <p className="text-2xl font-bold text-blue-600">{stats.proposed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Accettati</p>
            <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Select value={filterStato} onValueChange={setFilterStato}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tutti">Tutti</SelectItem>
            <SelectItem value="da_proporre">Da proporre</SelectItem>
            <SelectItem value="proposti">Proposti</SelectItem>
            <SelectItem value="accettati">Accettati</SelectItem>
            <SelectItem value="rifiutati">Rifiutati</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minScore} onValueChange={setMinScore}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Punteggio minimo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">Tutti i punteggi</SelectItem>
            <SelectItem value="50">50%+</SelectItem>
            <SelectItem value="60">60%+</SelectItem>
            <SelectItem value="70">70%+</SelectItem>
            <SelectItem value="80">80%+</SelectItem>
            <SelectItem value="90">90%+</SelectItem>
          </SelectContent>
        </Select>
        {richiestaIdParam && (
          <Link href="/matching">
            <Button variant="outline">
              Mostra tutti i match
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredMatching.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nessun matching trovato</h3>
            <p className="text-muted-foreground text-center mt-1">
              {matching.length === 0 
                ? "Clicca 'Genera Matching' per creare nuove corrispondenze"
                : "Prova a modificare i filtri"}
            </p>
            {matching.length === 0 && (
              <Button 
                className="mt-4" 
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Genera Matching
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMatching.map((match) => {
            const richiesta = richiesteMap.get(match.richiestaId);
            const immobile = immobiliMap.get(match.immobileId);
            const cliente = richiesta ? clientiMap.get(richiesta.clienteId) : undefined;
            
            return (
              <MatchCard
                key={match.id}
                match={match}
                richiesta={richiesta}
                immobile={immobile}
                cliente={cliente}
                onPropose={() => updateMutation.mutate({ 
                  id: match.id, 
                  data: { proposto: true } 
                })}
                onAccept={() => updateMutation.mutate({ 
                  id: match.id, 
                  data: { accettato: true } 
                })}
                onReject={() => updateMutation.mutate({ 
                  id: match.id, 
                  data: { accettato: false } 
                })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
