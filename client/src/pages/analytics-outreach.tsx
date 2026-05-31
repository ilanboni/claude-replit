import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, MessageCircle, CheckCircle2, XCircle, AlertTriangle, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AnalyticsData {
  periodo_giorni: number;
  totali: { inviati: string; risposti: string; positivi: string; falliti: string; saltati_dup: string };
  mandati_firmati: number;
  per_canale: Array<{ canale: string; inviati: string; risposti: string; positivi: string; negativi: string; nulli: string }>;
  per_scenario: Array<{ scenario: string; inviati: string; risposti: string; positivi: string }>;
  per_variant: Array<{ variant: string; inviati: string; risposti: string; positivi: string }>;
  top_obiezioni: Array<{ tema: string; n: string; positivi: string; negativi: string; esempi: string[] | null }>;
}

function pct(num: number | string, den: number | string): string {
  const n = parseInt(String(num)) || 0;
  const d = parseInt(String(den)) || 0;
  if (d === 0) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

function KPI({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent?: string }) {
  return (
    <Card className="flex-1 min-w-[180px]">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold ${accent || ""}`}>{value}</p>
        </div>
        <Icon className="w-8 h-8 text-muted-foreground/30" />
      </CardContent>
    </Card>
  );
}

export default function AnalyticsOutreachPage() {
  const [days, setDays] = useState("60");
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: [`/api/analytics/outreach?days=${days}`],
    refetchInterval: 5 * 60 * 1000, // refresh ogni 5 min
  });

  if (isLoading || !data) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const t = data.totali;
  const totInviati = parseInt(t.inviati || "0");
  const totRisposti = parseInt(t.risposti || "0");
  const totPositivi = parseInt(t.positivi || "0");

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Analytics Outreach
        </h1>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Ultimi 7 giorni</SelectItem>
            <SelectItem value="30">Ultimi 30 giorni</SelectItem>
            <SelectItem value="60">Ultimi 60 giorni</SelectItem>
            <SelectItem value="365">Ultimo anno</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI header */}
      <div className="flex gap-3 flex-wrap">
        <KPI label={`Inviati (${days}gg)`} value={totInviati} icon={MessageCircle} />
        <KPI label="Risposti" value={`${totRisposti} (${pct(totRisposti, totInviati)})`} icon={MessageCircle} />
        <KPI label="Positivi" value={`${totPositivi} (${pct(totPositivi, totRisposti)} dei risposti)`} icon={CheckCircle2} accent="text-green-600 dark:text-green-400" />
        <KPI label="Mandati firmati" value={data.mandati_firmati} icon={TrendingUp} accent="text-emerald-600 dark:text-emerald-400" />
        <KPI label="Falliti" value={t.falliti || "0"} icon={XCircle} accent={parseInt(t.falliti || "0") > 0 ? "text-red-600" : ""} />
      </div>

      {/* Per canale */}
      <Card>
        <CardHeader><CardTitle className="text-base">Per canale</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Canale</TableHead>
                <TableHead className="text-right">Inviati</TableHead>
                <TableHead className="text-right">Risposti</TableHead>
                <TableHead className="text-right">Tasso risposta</TableHead>
                <TableHead className="text-right">Positivi</TableHead>
                <TableHead className="text-right">% positivi su risposti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.per_canale.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nessun dato</TableCell></TableRow>
              ) : data.per_canale.map((r) => (
                <TableRow key={r.canale}>
                  <TableCell className="font-medium">{r.canale}</TableCell>
                  <TableCell className="text-right">{r.inviati}</TableCell>
                  <TableCell className="text-right">{r.risposti}</TableCell>
                  <TableCell className="text-right">{pct(r.risposti, r.inviati)}</TableCell>
                  <TableCell className="text-right text-green-700 dark:text-green-300">{r.positivi}</TableCell>
                  <TableCell className="text-right">{pct(r.positivi, r.risposti)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Per variant template */}
      <Card>
        <CardHeader><CardTitle className="text-base">Per variante template</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variante</TableHead>
                <TableHead className="text-right">Inviati</TableHead>
                <TableHead className="text-right">Risposti</TableHead>
                <TableHead className="text-right">Tasso risposta</TableHead>
                <TableHead className="text-right">Positivi</TableHead>
                <TableHead className="text-right">% positivi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.per_variant.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nessun dato (variant_label da popolare)</TableCell></TableRow>
              ) : data.per_variant.map((r) => (
                <TableRow key={r.variant}>
                  <TableCell className="font-medium text-xs">{r.variant}</TableCell>
                  <TableCell className="text-right">{r.inviati}</TableCell>
                  <TableCell className="text-right">{r.risposti}</TableCell>
                  <TableCell className="text-right">{pct(r.risposti, r.inviati)}</TableCell>
                  <TableCell className="text-right text-green-700 dark:text-green-300">{r.positivi}</TableCell>
                  <TableCell className="text-right">{pct(r.positivi, r.risposti)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top obiezioni */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Top obiezioni dei privati
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.top_obiezioni.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nessuna risposta classificata ancora.<br/>Il classifier gira ogni mattina alle 09:00.</p>
          ) : data.top_obiezioni.map((o) => (
            <div key={o.tema} className="border-l-4 border-l-amber-400 pl-3 py-2">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold capitalize">{o.tema.replace(/_/g, " ")}</span>
                <Badge variant="secondary">{o.n} risposte · {o.positivi} positive · {o.negativi} negative</Badge>
              </div>
              {o.esempi && o.esempi.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                  {o.esempi.slice(0, 3).map((e, i) => (
                    <li key={i} className="italic">"{e}"</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Analisi obiezioni AI con suggerimenti tattici inviata su Telegram bot Paolo ogni lunedi alle 09:30.
      </p>
    </div>
  );
}
