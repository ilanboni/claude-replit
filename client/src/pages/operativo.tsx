import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Users, Building2, FileText, Search, ArrowUpRight } from "lucide-react";

type Tab = "clienti" | "acquisizioni" | "bozze";

type ClienteRow = {
  id: number;
  nome?: string;
  cognome?: string;
  telefono?: string;
  email?: string;
  tipo_cliente?: string;
  fonte_acquisizione?: string;
  rating_cliente?: number;
  attivo?: boolean;
  created_at?: string;
};

type AcquisizioneRow = {
  id: number;
  titolo?: string;
  indirizzo?: string;
  zona?: string;
  prezzo?: number;
  mq?: number;
  fonte?: string;
  stato_contatto?: string;
  created_at?: string;
};

type BozzaRow = {
  id: string;
  destinatario_nome?: string;
  destinatario_telefono?: string;
  tipo?: string;
  stato?: string;
  testo_proposto?: string;
  created_at?: string;
  inviato_at?: string;
  risposta_classificazione?: string;
};

function useListe(tab: Tab) {
  return useQuery<{ tab: Tab; items: any[] }>({
    queryKey: [`/api/cavour/liste?tab=${tab}&limit=200`],
    refetchInterval: 60_000,
  });
}

function filterRows<T extends Record<string, any>>(rows: T[], q: string): T[] {
  if (!q.trim()) return rows;
  const needle = q.toLowerCase();
  return rows.filter((r) =>
    Object.values(r).some((v) => v != null && String(v).toLowerCase().includes(needle))
  );
}

function formatPrezzo(n?: number | null): string {
  if (n == null) return "—";
  return `${Number(n).toLocaleString("it-IT")} €`;
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return iso.slice(0, 10);
  }
}

function PanelClienti({ q }: { q: string }) {
  const { data, isLoading, isError } = useListe("clienti");
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) return <p className="text-sm text-muted-foreground p-4">Cavour-Meta non raggiungibile.</p>;
  const items = filterRows<ClienteRow>(data.items || [], q);
  if (items.length === 0) return <p className="text-sm text-muted-foreground p-4">Nessun cliente trovato.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-2">Nome</th>
            <th className="py-2 pr-2">Telefono</th>
            <th className="py-2 pr-2">Email</th>
            <th className="py-2 pr-2">Tipo</th>
            <th className="py-2 pr-2">Fonte</th>
            <th className="py-2 pr-2">Rating</th>
            <th className="py-2 pr-2">Dal</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-b hover-elevate" data-testid={`row-cliente-${c.id}`}>
              <td className="py-2 pr-2 font-medium">{`${c.nome || ""} ${c.cognome || ""}`.trim() || "—"}</td>
              <td className="py-2 pr-2 tabular-nums">{c.telefono || "—"}</td>
              <td className="py-2 pr-2 truncate max-w-[200px]">{c.email || "—"}</td>
              <td className="py-2 pr-2">{c.tipo_cliente && <Badge variant="outline">{c.tipo_cliente}</Badge>}</td>
              <td className="py-2 pr-2 text-xs text-muted-foreground">{c.fonte_acquisizione || "—"}</td>
              <td className="py-2 pr-2">{c.rating_cliente ? `${c.rating_cliente}/5` : "—"}</td>
              <td className="py-2 pr-2 text-xs text-muted-foreground">{formatDate(c.created_at)}</td>
              <td className="py-2">
                <Link href={`/clienti/${c.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                  apri <ArrowUpRight className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PanelAcquisizioni({ q }: { q: string }) {
  const { data, isLoading, isError } = useListe("acquisizioni");
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) return <p className="text-sm text-muted-foreground p-4">Cavour-Meta non raggiungibile.</p>;
  const items = filterRows<AcquisizioneRow>(data.items || [], q);
  if (items.length === 0) return <p className="text-sm text-muted-foreground p-4">Nessuna acquisizione trovata.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-2">Titolo / Indirizzo</th>
            <th className="py-2 pr-2">Zona</th>
            <th className="py-2 pr-2">Prezzo</th>
            <th className="py-2 pr-2">Mq</th>
            <th className="py-2 pr-2">Fonte</th>
            <th className="py-2 pr-2">Stato contatto</th>
            <th className="py-2 pr-2">Dal</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-b hover-elevate" data-testid={`row-acq-${a.id}`}>
              <td className="py-2 pr-2 font-medium">{a.titolo || a.indirizzo || "—"}</td>
              <td className="py-2 pr-2 text-xs text-muted-foreground">{a.zona || "—"}</td>
              <td className="py-2 pr-2 tabular-nums">{formatPrezzo(a.prezzo)}</td>
              <td className="py-2 pr-2 tabular-nums">{a.mq || "—"}</td>
              <td className="py-2 pr-2 text-xs">{a.fonte && <Badge variant="outline">{a.fonte}</Badge>}</td>
              <td className="py-2 pr-2">{a.stato_contatto && <Badge variant="secondary">{a.stato_contatto}</Badge>}</td>
              <td className="py-2 pr-2 text-xs text-muted-foreground">{formatDate(a.created_at)}</td>
              <td className="py-2">
                <Link href={`/acquisizione/${a.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                  apri <ArrowUpRight className="h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PanelBozze({ q }: { q: string }) {
  const { data, isLoading, isError } = useListe("bozze");
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) return <p className="text-sm text-muted-foreground p-4">Cavour-Meta non raggiungibile.</p>;
  const items = filterRows<BozzaRow>(data.items || [], q);
  if (items.length === 0) return <p className="text-sm text-muted-foreground p-4">Nessuna bozza trovata.</p>;

  const statoColor = (s?: string) => {
    if (s === "approvato" || s === "inviato") return "default" as const;
    if (s === "proposto") return "secondary" as const;
    if (s === "risposto") return "default" as const;
    if (s === "scartato" || s === "errore_invio") return "destructive" as const;
    return "outline" as const;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-2">Destinatario</th>
            <th className="py-2 pr-2">Telefono</th>
            <th className="py-2 pr-2">Canale</th>
            <th className="py-2 pr-2">Stato</th>
            <th className="py-2 pr-2">Risposta</th>
            <th className="py-2 pr-2">Preview testo</th>
            <th className="py-2 pr-2">Creata</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr key={b.id} className="border-b hover-elevate align-top" data-testid={`row-bozza-${b.id.slice(0,8)}`}>
              <td className="py-2 pr-2 font-medium whitespace-nowrap">{b.destinatario_nome || "—"}</td>
              <td className="py-2 pr-2 tabular-nums whitespace-nowrap">{b.destinatario_telefono || "—"}</td>
              <td className="py-2 pr-2 text-xs"><Badge variant="outline">{b.tipo}</Badge></td>
              <td className="py-2 pr-2"><Badge variant={statoColor(b.stato)}>{b.stato}</Badge></td>
              <td className="py-2 pr-2 text-xs">
                {b.risposta_classificazione && (
                  <Badge variant={b.risposta_classificazione === "positivo" ? "default" : b.risposta_classificazione === "negativo" ? "destructive" : "secondary"}>
                    {b.risposta_classificazione}
                  </Badge>
                )}
              </td>
              <td className="py-2 pr-2 max-w-[300px] text-xs text-muted-foreground truncate">{b.testo_proposto?.slice(0, 100)}…</td>
              <td className="py-2 pr-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(b.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OperativoPage() {
  const [tab, setTab] = useState<Tab>("clienti");
  const [q, setQ] = useState("");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" data-testid="text-operativo-title">Operativo Cavour</h1>
        <p className="text-muted-foreground">
          Dati live dal backend Cavour-Meta — clienti CRM, acquisizioni Casafari/portali, bozze outreach in pipeline
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Lista operativa</CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtra (nome, indirizzo, telefono...)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8"
                data-testid="input-filtra-operativo"
              />
            </div>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList>
              <TabsTrigger value="clienti" data-testid="tab-op-clienti">
                <Users className="h-3.5 w-3.5 mr-1.5" /> Clienti
              </TabsTrigger>
              <TabsTrigger value="acquisizioni" data-testid="tab-op-acquisizioni">
                <Building2 className="h-3.5 w-3.5 mr-1.5" /> Acquisizioni
              </TabsTrigger>
              <TabsTrigger value="bozze" data-testid="tab-op-bozze">
                <FileText className="h-3.5 w-3.5 mr-1.5" /> Bozze outreach
              </TabsTrigger>
            </TabsList>
            <TabsContent value="clienti" className="mt-4">
              <PanelClienti q={q} />
            </TabsContent>
            <TabsContent value="acquisizioni" className="mt-4">
              <PanelAcquisizioni q={q} />
            </TabsContent>
            <TabsContent value="bozze" className="mt-4">
              <PanelBozze q={q} />
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
}
