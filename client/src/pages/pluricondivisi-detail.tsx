import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Phone, Mail, MessageCircle, ExternalLink, Plus, Clock } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

type Att = {
  id: number; tipo: string; descrizione: string | null; esito: string | null;
  eseguita_at: string | null; eseguita_da: string | null; prossima_azione: string | null;
};
type Detail = {
  id: number; short_id: string; indirizzo: string; civico: string | null; zona: string | null;
  comune: string | null; mq: number | null; locali: number | null; camere: number | null;
  prezzo: string | number | null; num_agenzie: number | null; listing_urls: any; titolo: string | null;
  proprietario_nome: string | null; proprietario_cognome: string | null;
  proprietario_telefono: string | null; proprietario_email: string | null; proprietario_note: string | null;
  mandato_status: string; mandato_status_updated_at: string | null;
  cliente: { id: number; nome: string; cognome: string; telefono: string } | null;
  attivita: Att[]; stati_disponibili: string[]; tipi_attivita: string[];
};

const TIPO_LABEL: Record<string, string> = {
  visura_richiesta: "Visura richiesta", visura_eseguita: "Visura eseguita",
  ricerca_linkedin: "Ricerca LinkedIn", ricerca_paginebianche: "Ricerca Pagine Bianche",
  ricerca_google: "Ricerca Google", ricerca_facebook: "Ricerca Facebook",
  contatto_whatsapp: "Contatto WhatsApp", contatto_linkedin_dm: "DM LinkedIn",
  contatto_email: "Contatto email", contatto_citofono: "Citofono",
  chiamata_telefonica: "Chiamata", appuntamento_fissato: "Appuntamento fissato",
  nota_libera: "Nota", altro: "Altro",
};
const STATO_LABEL: Record<string, string> = {
  da_lavorare: "Da lavorare", visura_richiesta: "Visura richiesta", visura_fatta: "Visura fatta",
  ricerca_contatti: "Ricerca contatti", contatti_trovati: "Contatti trovati", contattato: "Contattato",
  risposta_ricevuta: "Risposta ricevuta", appuntamento_fissato: "Appuntamento fissato",
  mandato_acquisito: "Mandato acquisito", perso: "Perso", pausa: "In pausa", rifiuto_cortese: "Rifiuto cortese",
};

function fmtMoney(v: any): string {
  const n = Math.round(Number(v) || 0);
  return n >= 1000 ? "€" + Math.round(n / 1000) + "k" : (n ? "€" + n : "n/d");
}
function waDigits(t: any): string { return String(t || "").replace(/\D/g, ""); }

export default function PluricondivisoDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const key = `/api/pluricondivisi/${id}/scheda`;
  const { data, isLoading } = useQuery<Detail>({ queryKey: [key] });
  const { data: interessati } = useQuery<{ clienti: any[] }>({
    queryKey: [`/api/pluricondivisi/${id}/clienti-interessati`],
  });
  const [tipo, setTipo] = useState("");
  const [descr, setDescr] = useState("");

  const addAtt = useMutation({
    mutationFn: async () => { await apiRequest("POST", `/api/pluricondivisi/${id}/attivita`, { tipo, descrizione: descr }); },
    onSuccess: () => { toast({ title: "Attività registrata" }); setTipo(""); setDescr(""); queryClient.invalidateQueries({ queryKey: [key] }); },
    onError: (e: any) => toast({ title: "Errore", description: e?.message, variant: "destructive" }),
  });
  const setStato = useMutation({
    mutationFn: async (s: string) => { await apiRequest("POST", `/api/pluricondivisi/${id}/stato`, { stato: s }); },
    onSuccess: () => { toast({ title: "Stato aggiornato" }); queryClient.invalidateQueries({ queryKey: [key] }); },
    onError: (e: any) => toast({ title: "Errore", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Carico…</div>;
  if (!data) return <div className="p-4 text-sm">Non trovato. <Link href="/pluricondivisi" className="text-primary underline">Torna alla lista</Link></div>;

  const titolo = [data.indirizzo, data.civico].filter(Boolean).join(" ");
  const urls = Array.isArray(data.listing_urls) ? data.listing_urls : [];
  const propNome = [data.proprietario_nome, data.proprietario_cognome].filter(Boolean).join(" ");

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      <Link href="/pluricondivisi" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" />Pluricondivisi
      </Link>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">{titolo || data.titolo || "Immobile"}</div>
            <div className="text-sm text-muted-foreground">{[data.zona, data.comune].filter(Boolean).join(" · ")}</div>
          </div>
          <Badge>{STATO_LABEL[data.mandato_status] || data.mandato_status}</Badge>
        </div>
        <div className="mt-2 text-sm flex flex-wrap gap-x-4 gap-y-1">
          <span className="font-medium">{fmtMoney(data.prezzo)}</span>
          <span>{data.mq || "?"} mq</span>
          {data.locali ? <span>{data.locali} locali</span> : null}
          <span className="text-red-600 font-medium">{data.num_agenzie || "?"} agenzie</span>
        </div>
        {urls.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {urls.map((u: string, i: number) => (
              <a key={i} href={u} target="_blank" rel="noopener" className="text-xs text-primary inline-flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />Annuncio {i + 1}
              </a>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-1">Proprietario</div>
        {(propNome || data.proprietario_telefono || data.proprietario_email) ? (
          <div className="space-y-1 text-sm">
            {propNome && <div className="font-medium">{propNome}</div>}
            <div className="flex flex-wrap gap-2">
              {data.proprietario_telefono && (
                <a href={`tel:${data.proprietario_telefono}`} className="inline-flex items-center gap-1 bg-primary/10 rounded-md px-2 py-1 text-xs">
                  <Phone className="w-3 h-3" />{data.proprietario_telefono}
                </a>
              )}
              {data.proprietario_telefono && (
                <a href={`https://wa.me/${waDigits(data.proprietario_telefono)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 bg-green-500/10 rounded-md px-2 py-1 text-xs">
                  <MessageCircle className="w-3 h-3" />WA
                </a>
              )}
              {data.proprietario_email && (
                <a href={`mailto:${data.proprietario_email}`} className="inline-flex items-center gap-1 bg-primary/10 rounded-md px-2 py-1 text-xs">
                  <Mail className="w-3 h-3" />email
                </a>
              )}
            </div>
            {data.proprietario_note && <div className="text-xs text-muted-foreground">{data.proprietario_note}</div>}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Proprietario da trovare — fai la visura, poi registra qui i contatti.</div>
        )}
        {data.cliente && (
          <div className="text-xs text-muted-foreground mt-2">
            Cliente interessato: <Link href={`/clienti/${data.cliente.id}`} className="text-primary underline">{data.cliente.nome} {data.cliente.cognome}</Link>
          </div>
        )}
      </Card>

      {interessati && interessati.clienti && interessati.clienti.length > 0 && (
        <Card className="p-4 border-primary/40">
          <div className="text-sm font-semibold mb-1">🎯 Potrebbe interessare a…</div>
          <div className="text-xs text-muted-foreground mb-2">Clienti con ricerca attiva che combacia. La tua leva per il mandato: «ho già chi lo comprerebbe».</div>
          <div className="space-y-2">
            {interessati.clienti.map((c: any) => {
              const wa = waDigits(c.telefono);
              return (
                <div key={c.cliente_id} className="flex items-center justify-between gap-2 border-b border-muted-foreground/10 pb-2 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/clienti/${c.cliente_id}`} className="text-sm font-medium text-primary hover:underline">{c.nome} {c.cognome}</Link>
                    <div className="text-[11px] text-muted-foreground">
                      {c.budget_massimo ? `budget ${fmtMoney(c.budget_massimo)}` : ""}
                      {c.richiesta_zona ? ` · ${c.richiesta_zona}` : ""}
                      {c.mq_minimi ? ` · ${c.mq_minimi}mq+` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[10px]">match {c.score}</Badge>
                    {wa && (
                      <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 bg-green-500/10 rounded-md px-2 py-1 text-xs">
                        <MessageCircle className="w-3 h-3" />WA
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Stato lavorazione</div>
        <Select value={data.mandato_status} onValueChange={(v) => setStato.mutate(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {data.stati_disponibili.map((s) => <SelectItem key={s} value={s}>{STATO_LABEL[s] || s}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Registra attività</div>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue placeholder="Tipo attività…" /></SelectTrigger>
          <SelectContent>
            {data.tipi_attivita.map((t) => <SelectItem key={t} value={t}>{TIPO_LABEL[t] || t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Textarea className="mt-2" placeholder="Dettagli (es. trovato proprietario su PagineBianche, +39…)" value={descr} onChange={(e) => setDescr(e.target.value)} />
        <Button className="mt-2 w-full" disabled={!tipo || addAtt.isPending} onClick={() => addAtt.mutate()}>
          <Plus className="w-4 h-4 mr-1" />{addAtt.isPending ? "Salvo…" : "Aggiungi attività"}
        </Button>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2">Storico attività</div>
        {data.attivita.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nessuna attività ancora. Inizia dalla visura.</div>
        ) : (
          <div className="space-y-2">
            {data.attivita.map((a) => (
              <div key={a.id} className="border-l-2 border-primary/30 pl-3">
                <div className="text-sm font-medium">{TIPO_LABEL[a.tipo] || a.tipo}</div>
                {a.descrizione && <div className="text-sm text-muted-foreground">{a.descrizione}</div>}
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {a.eseguita_at ? format(new Date(a.eseguita_at), "d MMM HH:mm", { locale: it }) : ""}
                  {a.eseguita_da ? ` · ${a.eseguita_da}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
