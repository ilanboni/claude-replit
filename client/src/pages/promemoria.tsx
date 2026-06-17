import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Phone, MessageCircle, Search, Check, X, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Task = {
  short_id: string;
  tipo: string;
  descrizione: string;
  nome_riferimento: string | null;
  telefono: string | null;
  scheduled_at: string;
  priorita: number;
  origine: string;
  origine_dettaglio: string | null;
  stato: string;
  fatto_at: string | null;
};

const STATI = ["attivo", "fatto", "scartato", "scaduto"];

export default function Promemoria() {
  const [stato, setStato] = useState("attivo");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks-ilan", { stato }],
    queryFn: async () => {
      const r = await fetch(`/api/tasks-ilan?stato=${stato}`);
      return r.json();
    },
  });

  const filtered = data.filter(t =>
    !search.trim() || (t.descrizione || "").toLowerCase().includes(search.toLowerCase())
                  || (t.nome_riferimento || "").toLowerCase().includes(search.toLowerCase())
                  || (t.telefono || "").includes(search)
  );

  const action = async (short_id: string, body: any, msg: string) => {
    try {
      await apiRequest("POST", `/api/decisione/task/${short_id}`, body);
      toast({ title: msg });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks-ilan"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/oggi"] });
    } catch (e: any) {
      toast({ title: "Errore", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3 md:space-y-6 p-3 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-semibold">📋 Promemoria</h1>
        <Badge variant="secondary" className="text-base px-3 py-1">{filtered.length}</Badge>
      </div>

      <div className="sticky top-12 md:top-14 z-20 bg-background/95 backdrop-blur py-2 -mx-3 px-3 md:-mx-6 md:px-6 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Cerca…" value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
          {STATI.map(s => (
            <button key={s} onClick={() => setStato(s)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition ${
                stato === s ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30"
              }`}>{s}</button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-center text-sm text-muted-foreground py-8">Carico…</div>}
      {!isLoading && filtered.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">Nessun promemoria.</Card>
      )}

      <div className="space-y-2">
        {filtered.map(t => (
          <Card key={t.short_id} className="p-3" data-testid={`task-${t.short_id}`}>
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0">{t.priorita <= 2 ? "🔴" : "🟡"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">{t.short_id}</span>
                  <Badge variant="outline" className="text-[10px]">{t.tipo}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(t.scheduled_at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <div className="text-sm mt-1">{t.descrizione}</div>
                {t.origine_dettaglio && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">↳ {t.origine_dettaglio}</div>
                )}
                {stato === "attivo" && (
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {t.telefono && (
                      <a href={`tel:${t.telefono}`} className="inline-flex items-center gap-1 text-xs bg-primary/10 active:bg-primary/20 rounded-md px-2 py-1">
                        <Phone className="w-3 h-3" />{t.telefono}
                      </a>
                    )}
                    {t.telefono && (
                      <a href={`https://wa.me/${t.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs bg-green-500/10 active:bg-green-500/20 rounded-md px-2 py-1">
                        <MessageCircle className="w-3 h-3" />WA
                      </a>
                    )}
                    <button onClick={() => action(t.short_id, { action: "fatto" }, "Fatto ✓")}
                      className="inline-flex items-center gap-1 text-xs bg-emerald-500/15 active:bg-emerald-500/25 rounded-md px-2 py-1">
                      <Check className="w-3 h-3" />Fatto
                    </button>
                    <button onClick={() => action(t.short_id, { action: "rinvia", rinvia_giorni: 3 }, "Rinviato +3gg")}
                      className="inline-flex items-center gap-1 text-xs bg-amber-500/15 active:bg-amber-500/25 rounded-md px-2 py-1">
                      <CalendarPlus className="w-3 h-3" />+3gg
                    </button>
                    <button onClick={() => action(t.short_id, { action: "scarta" }, "Scartato")}
                      className="inline-flex items-center gap-1 text-xs bg-red-500/15 active:bg-red-500/25 rounded-md px-2 py-1">
                      <X className="w-3 h-3" />Scarta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
