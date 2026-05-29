import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Inbox, Check, X, Pencil, Phone, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface Bozza {
  id: string;
  tipo: string;
  stato: string;
  destinatario_nome: string | null;
  destinatario_telefono: string | null;
  destinatario_email: string | null;
  testo_proposto: string;
  scenario: number | null;
  created_at: string;
  indirizzo: string | null;
  civico: string | null;
  zona: string | null;
  mq: number | null;
  prezzo_corrente: number | null;
  url_casafari: string | null;
}

function tipoColor(tipo: string) {
  if (tipo.includes("whatsapp")) return "bg-green-500/15 text-green-700 dark:text-green-300";
  if (tipo.includes("email")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (tipo.includes("form_idealista")) return "bg-orange-500/15 text-orange-700 dark:text-orange-300";
  if (tipo.includes("form_immobiliare")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300";
  if (tipo.includes("proattivo")) return "bg-pink-500/15 text-pink-700 dark:text-pink-300";
  return "bg-muted text-muted-foreground";
}

function statoBadge(stato: string) {
  switch (stato) {
    case "proposto":
      return <Badge variant="secondary">In attesa</Badge>;
    case "approvato":
      return <Badge className="bg-emerald-600">Approvato</Badge>;
    case "attesa_invio":
      return <Badge className="bg-amber-600">In invio</Badge>;
    case "scartato":
      return <Badge variant="outline">Scartato</Badge>;
    case "inviato":
      return <Badge className="bg-blue-600">Inviato</Badge>;
    default:
      return <Badge variant="secondary">{stato}</Badge>;
  }
}

export default function BozzePage() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Bozza | null>(null);
  const [editText, setEditText] = useState("");

  const { data: bozze = [], isLoading } = useQuery<Bozza[]>({
    queryKey: ["/api/casafari-bozze"],
    refetchInterval: 30000,
  });

  const approvaMutation = useMutation({
    mutationFn: async ({ id, testo }: { id: string; testo?: string }) => {
      return apiRequest("POST", `/api/casafari-bozze/${id}/approva`, testo ? { testo } : {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/casafari-bozze"] });
      toast({ title: "Bozza approvata", description: "Il sender la invierà entro 5 min." });
      setEditing(null);
    },
    onError: (e: any) => {
      toast({ title: "Errore", description: e?.message || "Approva fallita", variant: "destructive" });
    },
  });

  const scartaMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/casafari-bozze/${id}/scarta`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/casafari-bozze"] });
      toast({ title: "Bozza scartata" });
    },
    onError: (e: any) => {
      toast({ title: "Errore", description: e?.message || "Scarta fallita", variant: "destructive" });
    },
  });

  const pendingCount = bozze.filter((b) => b.stato === "proposto").length;
  const approvateCount = bozze.filter((b) => b.stato === "approvato" || b.stato === "attesa_invio").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Inbox className="h-7 w-7" />
            Bozze in attesa
          </h1>
          <p className="text-muted-foreground mt-1">
            {pendingCount} da approvare · {approvateCount} in coda di invio
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      )}

      {!isLoading && bozze.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessuna bozza in coda.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {bozze.map((b) => {
          const indirizzoCompleto =
            [b.indirizzo, b.civico].filter(Boolean).join(" ") || b.destinatario_nome || "—";
          const isPending = b.stato === "proposto";
          return (
            <Card key={b.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                      <span className="truncate">{indirizzoCompleto}</span>
                      {b.zona && (
                        <span className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {b.zona}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs ${tipoColor(b.tipo)}`}>{b.tipo}</span>
                      {statoBadge(b.stato)}
                      {b.destinatario_telefono && (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {b.destinatario_telefono}
                        </span>
                      )}
                      {b.mq && <span className="text-muted-foreground">{b.mq} mq</span>}
                      {b.prezzo_corrente && (
                        <span className="text-muted-foreground">
                          €{Number(b.prezzo_corrente).toLocaleString("it-IT")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted/40 rounded-md p-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {b.testo_proposto}
                </div>
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {b.url_casafari && (
                    <a
                      href={b.url_casafari}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground underline mr-auto"
                    >
                      Vedi su Casafari
                    </a>
                  )}
                  {isPending && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(b);
                          setEditText(b.testo_proposto);
                        }}
                      >
                        <Pencil className="h-3 w-3 mr-1" /> Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => scartaMutation.mutate(b.id)}
                        disabled={scartaMutation.isPending}
                      >
                        <X className="h-3 w-3 mr-1" /> Scarta
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => approvaMutation.mutate({ id: b.id })}
                        disabled={approvaMutation.isPending}
                      >
                        {approvaMutation.isPending ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        Approva e invia
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modifica bozza</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={12}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="font-mono text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Annulla
            </Button>
            <Button
              onClick={() => editing && approvaMutation.mutate({ id: editing.id, testo: editText })}
              disabled={approvaMutation.isPending}
            >
              {approvaMutation.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Salva e approva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
