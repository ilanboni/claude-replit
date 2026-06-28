import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

// ─── Categorie (ordine = priorita commerciale per Ilan) ───
type CatKey = "mio" | "privato" | "pluri" | "mono";

const CATEGORIE: {
  key: CatKey;
  label: string;
  azione: string;
  dot: string;
  badge: string;
}[] = [
  {
    key: "mio",
    label: "In portafoglio (Mio)",
    azione: "Proponi subito al cliente — margine pieno, controlli tu il processo",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700",
  },
  {
    key: "privato",
    label: "Da privato",
    azione: "Contatta il proprietario: punta al mandato e porti tu il compratore",
    dot: "bg-sky-500",
    badge: "bg-sky-500/10 text-sky-700",
  },
  {
    key: "pluri",
    label: "Pluricondiviso",
    azione: "Proprietario aperto: vai a prendere l'esclusiva (occhio: spesso sovrapprezzato)",
    dot: "bg-amber-500",
    badge: "bg-amber-500/10 text-amber-700",
  },
  {
    key: "mono",
    label: "Monocondiviso (1 agenzia)",
    azione: "Co-mediazione con l'agenzia che ha il mandato — margine diviso",
    dot: "bg-slate-400",
    badge: "bg-slate-500/10 text-slate-700",
  },
];

const CAT_BY_KEY = new Map(CATEGORIE.map((c) => [c.key, c]));

interface PropertyView {
  id: number;
  titolo: string;
  zona?: string | null;
  prezzo?: number | string | null;
  mq?: number | null;
  agenzia?: string | null;
  isEsterno: boolean;
}

function resolveProperty(
  match: Matching,
  immobiliMap: Map<number, Immobile>,
  esterniMap: Map<number, any>,
): PropertyView | undefined {
  if (match.immobileId && immobiliMap.get(match.immobileId)) {
    const i = immobiliMap.get(match.immobileId)!;
    return { id: i.id, titolo: i.titolo, zona: i.zona, prezzo: i.prezzo as any, mq: i.mq, isEsterno: false };
  }
  if (match.immobileEsternoId && esterniMap.get(match.immobileEsternoId)) {
    const e = esterniMap.get(match.immobileEsternoId)!;
    return {
      id: e.id,
      titolo: e.titolo || e.indirizzo || `Esterno #${e.id}`,
      zona: e.zona,
      prezzo: e.prezzo,
      mq: e.mq,
      agenzia: e.contattoNome,
      isEsterno: true,
    };
  }
  return undefined;
}

function classifyMatch(
  match: Matching,
  immobiliMap: Map<number, Immobile>,
  esterniMap: Map<number, any>,
): CatKey {
  // Immobile interno = portafoglio Cavour
  if (match.immobileId && immobiliMap.get(match.immobileId)) return "mio";
  if (match.immobileEsternoId) {
    const e = esterniMap.get(match.immobileEsternoId);
    if (e?.multiAgenzia) return "pluri";
    const fonte = `${e?.fonte || ""} ${e?.tipoFonte || ""}`.toLowerCase();
    const numAg = Number(e?.numAgenzie || 0);
    const senzaAgenzia = !e?.contattoNome && numAg <= 1;
    if (fonte.includes("privat") || senzaAgenzia) return "privato";
    return "mono"; // singola agenzia
  }
  if (match.immobileId) return "mio";
  return "mono";
}

function MatchCard({
  match,
  richiesta,
  property,
  categoria,
  cliente,
  onPropose,
  onAccept,
  onReject,
}: {
  match: Matching;
  richiesta?: Richiesta;
  property?: PropertyView;
  categoria: CatKey;
  cliente?: Cliente;
  onPropose: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };
  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };
  const cat = CAT_BY_KEY.get(categoria)!;
  const propertyHref = property
    ? property.isEsterno
      ? `/acquisizione/${property.id}`
      : `/immobili/${property.id}`
    : "#";

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
              <h3 className="font-medium flex items-center gap-2 flex-wrap">
                Match #{match.id}
                <Badge className={cat.badge}>{cat.label}</Badge>
                {match.proposto && <Badge variant="secondary">Proposto</Badge>}
                {match.accettato === true && (
                  <Badge className="bg-green-500/10 text-green-600">Accettato</Badge>
                )}
                {match.accettato === false && (
                  <Badge className="bg-red-500/10 text-red-600">Rifiutato</Badge>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                Creato il {new Date(match.createdAt).toLocaleDateString("it-IT")}
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
              <Button onClick={onAccept} size="sm" className="bg-green-600 hover:bg-green-700" data-testid={`button-accept-${match.id}`}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Accetta
              </Button>
              <Button onClick={onReject} size="sm" variant="destructive" data-testid={`button-reject-${match.id}`}>
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
                    <span>€{Number(richiesta.budgetMassimo).toLocaleString("it-IT")}</span>
                  )}
                  {richiesta.mqMinimi && <span>{richiesta.mqMinimi}+ mq</span>}
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
            {property ? (
              <div>
                <Link href={propertyHref}>
                  <p className="font-medium hover:underline cursor-pointer">{property.titolo}</p>
                </Link>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                  {property.zona && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {property.zona}
                    </span>
                  )}
                  {property.prezzo && (
                    <span>€{Number(property.prezzo).toLocaleString("it-IT")}</span>
                  )}
                  {property.mq && <span>{property.mq} mq</span>}
                </div>
                {property.isEsterno && property.agenzia && (
                  <p className="text-xs text-muted-foreground mt-1">Agenzia: {property.agenzia}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Immobile non collegato</p>
            )}
          </div>
        </div>

        {match.note && (
          <p className="text-sm text-muted-foreground mt-3 p-2 bg-muted rounded">{match.note}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function MatchingPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const richiestaIdParam = urlParams.get("richiestaId");

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
  const { data: immobiliEsterni = [] } = useQuery<any[]>({
    queryKey: ["/api/immobili-esterni"],
  });
  const { data: clienti = [] } = useQuery<Cliente[]>({
    queryKey: ["/api/clienti"],
  });

  const richiesteMap = new Map(richieste.map((r) => [r.id, r]));
  const immobiliMap = new Map(immobili.map((i) => [i.id, i]));
  const esterniMap = new Map(immobiliEsterni.map((e: any) => [e.id, e]));
  const clientiMap = new Map(clienti.map((c) => [c.id, c]));

  const generateMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/matching/generate", {
        richiestaId: richiestaIdParam ? parseInt(richiestaIdParam) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matching"] });
      toast({ title: "Matching generati con successo" });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile generare i matching", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Matching> }) =>
      apiRequest("PATCH", `/api/matching/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matching"] });
      toast({ title: "Match aggiornato" });
    },
  });

  const filteredMatching = matching
    .filter((m) => {
      if (richiestaIdParam && m.richiestaId !== parseInt(richiestaIdParam)) return false;
      if (m.punteggio < parseInt(minScore)) return false;
      if (filterStato === "da_proporre" && m.proposto) return false;
      if (filterStato === "proposti" && !m.proposto) return false;
      if (filterStato === "accettati" && m.accettato !== true) return false;
      if (filterStato === "rifiutati" && m.accettato !== false) return false;
      return true;
    })
    .sort((a, b) => b.punteggio - a.punteggio);

  const stats = {
    total: matching.length,
    highScore: matching.filter((m) => m.punteggio >= 80).length,
    proposed: matching.filter((m) => m.proposto).length,
    accepted: matching.filter((m) => m.accettato === true).length,
  };

  const renderCard = (match: Matching) => {
    const richiesta = richiesteMap.get(match.richiestaId);
    const property = resolveProperty(match, immobiliMap, esterniMap);
    const categoria = classifyMatch(match, immobiliMap, esterniMap);
    const cliente = richiesta ? clientiMap.get(richiesta.clienteId) : undefined;
    return (
      <MatchCard
        key={match.id}
        match={match}
        richiesta={richiesta}
        property={property}
        categoria={categoria}
        cliente={cliente}
        onPropose={() => updateMutation.mutate({ id: match.id, data: { proposto: true } })}
        onAccept={() => updateMutation.mutate({ id: match.id, data: { accettato: true } })}
        onReject={() => updateMutation.mutate({ id: match.id, data: { accettato: false } })}
      />
    );
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
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} data-testid="button-generate-matching">
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
            <Button variant="outline">Mostra tutti i match</Button>
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
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {CATEGORIE.map((cat) => {
            const items = filteredMatching.filter(
              (m) => classifyMatch(m, immobiliMap, esterniMap) === cat.key,
            );
            if (items.length === 0) return null;
            return (
              <section key={cat.key} className="space-y-3">
                <div className="flex items-center gap-3 border-b pb-2">
                  <span className={`h-3 w-3 rounded-full ${cat.dot}`} />
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      {cat.label}
                      <Badge variant="secondary">{items.length}</Badge>
                    </h2>
                    <p className="text-sm text-muted-foreground">→ {cat.azione}</p>
                  </div>
                </div>
                <div className="space-y-4">{items.map(renderCard)}</div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
