import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Pause, Play, Save, AlertCircle, Send, Users, Gift, Bell } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ConfigMap = Record<string, { value: string; updated_at: string }>;

export default function ImpostazioniPWA() {
  const { toast } = useToast();
  const { data: cfg = {} } = useQuery<ConfigMap>({
    queryKey: ["/api/config"],
  });

  const update = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const r = await apiRequest("POST", `/api/config/${key}`, { value });
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      toast({ title: "Impostazione salvata" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err?.message, variant: "destructive" });
    },
  });

  const pausaAttiva = cfg["paolo_pausa_until"]?.value
    && new Date(cfg["paolo_pausa_until"].value) > new Date();

  return (
    <div className="space-y-3 md:space-y-6 p-3 md:p-6 max-w-3xl mx-auto">
      <h1 className="text-xl md:text-2xl font-semibold">⚙️ Impostazioni</h1>

      {/* --- PAUSA PAOLO --- */}
      <Card className="p-4 space-y-3" data-testid="settings-pausa">
        <div className="flex items-start gap-2">
          {pausaAttiva ? <Pause className="w-5 h-5 text-amber-500 mt-0.5" /> : <Play className="w-5 h-5 text-green-500 mt-0.5" />}
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Pausa Paolo</h2>
            <p className="text-xs text-muted-foreground">
              Quando attiva, sender + drip + outreach sono silenziati. Inbound clienti continua a funzionare.
            </p>
          </div>
        </div>
        {pausaAttiva ? (
          <div className="bg-amber-500/10 p-3 rounded-md text-xs">
            ⏸ Pausa fino a <strong>{new Date(cfg["paolo_pausa_until"].value).toLocaleString("it-IT")}</strong>
            <Button
              size="sm"
              variant="outline"
              className="ml-2"
              onClick={() => update.mutate({ key: "paolo_pausa_until", value: "" })}
              data-testid="button-riprendi"
            >Riprendi adesso</Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "1h", ore: 1 },
              { label: "3h", ore: 3 },
              { label: "Fino a domani 9", ore: -1 },
            ].map(p => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  let until: Date;
                  if (p.ore < 0) {
                    until = new Date();
                    until.setDate(until.getDate() + 1);
                    until.setHours(9, 0, 0, 0);
                  } else {
                    until = new Date(Date.now() + p.ore * 3600_000);
                  }
                  update.mutate({ key: "paolo_pausa_until", value: until.toISOString() });
                }}
                data-testid={`button-pausa-${p.label}`}
              >{p.label}</Button>
            ))}
          </div>
        )}
      </Card>

      {/* --- OUTREACH SENDER --- */}
      <Card className="p-4 space-y-3" data-testid="settings-outreach">
        <div className="flex items-start gap-2">
          <Send className="w-5 h-5 text-blue-500 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Outreach Casafari</h2>
            <p className="text-xs text-muted-foreground">Sender automatico + cap giornaliero.</p>
          </div>
        </div>
        <ConfigField
          label="Fase sender"
          help="`attivo` = invia | `bozze` = solo genera, no invio"
          value={cfg["casafari_outreach_fase"]?.value || ""}
          onSave={(v) => update.mutate({ key: "casafari_outreach_fase", value: v })}
        />
        <ConfigField
          label="Max outreach al giorno"
          help="Limite invii Casafari per non spammare"
          value={cfg["casafari_max_outreach_giornalieri"]?.value || ""}
          onSave={(v) => update.mutate({ key: "casafari_max_outreach_giornalieri", value: v })}
          type="number"
        />
      </Card>

      {/* --- REFERRAL PROGRAM --- */}
      <Card className="p-4 space-y-3" data-testid="settings-referral">
        <div className="flex items-start gap-2">
          <Gift className="w-5 h-5 text-pink-500 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Referral program</h2>
            <p className="text-xs text-muted-foreground">Richiesta automatica 30gg post-rogito.</p>
          </div>
          <Switch
            checked={cfg["referral_abilitato"]?.value === "true"}
            onCheckedChange={(v) => update.mutate({ key: "referral_abilitato", value: v ? "true" : "false" })}
            data-testid="switch-referral"
          />
        </div>
        <ConfigField
          label="Giorni dopo rogito"
          value={cfg["referral_giorni_dopo_rogito"]?.value || "30"}
          onSave={(v) => update.mutate({ key: "referral_giorni_dopo_rogito", value: v })}
          type="number"
        />
        <ConfigField
          label="Incentivo offerto"
          help="Es: 'cena per due' / 'sconto valutazione' — appare nel messaggio"
          value={cfg["incentivo_referral"]?.value || ""}
          onSave={(v) => update.mutate({ key: "incentivo_referral", value: v })}
          multiline
        />
        <ConfigField
          label="Template messaggio referral"
          help="Placeholders: {nome} {immobile} {incentivo}"
          value={cfg["template_referral_richiesta"]?.value || ""}
          onSave={(v) => update.mutate({ key: "template_referral_richiesta", value: v })}
          multiline
          rows={8}
        />
      </Card>

      {/* --- IDENTITA CAVOUR --- */}
      <Card className="p-4 space-y-3" data-testid="settings-identita">
        <div className="flex items-start gap-2">
          <Users className="w-5 h-5 text-violet-500 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Identità Cavour</h2>
            <p className="text-xs text-muted-foreground">Numeri usati nei template e firma.</p>
          </div>
        </div>
        <ConfigField
          label="Telefono Paolo WhatsApp (firma messaggi)"
          value={cfg["cavour_telefono_paolo_whatsapp"]?.value || ""}
          onSave={(v) => update.mutate({ key: "cavour_telefono_paolo_whatsapp", value: v })}
        />
        <ConfigField
          label="Max mandati attivi"
          value={cfg["cavour_max_mandati"]?.value || ""}
          onSave={(v) => update.mutate({ key: "cavour_max_mandati", value: v })}
          type="number"
        />
      </Card>

      {/* --- NOTIFICHE PUSH --- */}
      <Card className="p-4 space-y-3" data-testid="settings-push">
        <div className="flex items-start gap-2">
          <Bell className="w-5 h-5 text-cyan-500 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Notifiche push</h2>
            <p className="text-xs text-muted-foreground">
              Ricevi notifiche native sul telefono quando un lead caldo risponde o c'è una nuova bozza CRM.
              Funziona solo se hai installato ImmoGest sulla home dell'iPhone (Aggiungi alla schermata Home da Safari).
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            if (!("Notification" in window)) {
              toast({ title: "Browser non supporta notifiche", variant: "destructive" });
              return;
            }
            const perm = await Notification.requestPermission();
            if (perm === "granted") {
              // Notifica di test immediata
              new Notification("ImmoGest", { body: "Notifiche attivate! Riceverai alert per lead caldi e bozze.", icon: "/favicon.png" });
              toast({ title: "Notifiche attivate" });
            } else {
              toast({ title: "Notifiche negate", description: "Vai in Impostazioni iOS > Safari > Notifiche", variant: "destructive" });
            }
          }}
        >
          Attiva notifiche
        </Button>
        <p className="text-[10px] text-muted-foreground">
          Stato attuale: {typeof Notification !== "undefined" ? Notification.permission : "non supportato"}
        </p>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center pt-4 pb-2">
        Tutti i comandi disponibili anche via Telegram: <code>pausa 2h</code> · <code>analisi X</code> · <code>lista promemoria</code>
      </p>
    </div>
  );
}

/* ─────────── Campo modificabile riusabile ─────────── */

function ConfigField({
  label, value, onSave, help, type = "text", multiline = false, rows = 3,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  help?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const [v, setV] = useState(value);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setV(value);
    setDirty(false);
  }, [value]);

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      {help && <p className="text-[10px] text-muted-foreground -mt-1 mb-1">{help}</p>}
      <div className="flex gap-2">
        {multiline ? (
          <Textarea
            value={v}
            onChange={(e) => { setV(e.target.value); setDirty(true); }}
            rows={rows}
            className="text-xs font-mono"
          />
        ) : (
          <Input
            type={type}
            value={v}
            onChange={(e) => { setV(e.target.value); setDirty(true); }}
            className="text-sm"
          />
        )}
      </div>
      {dirty && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onSave(v)}>
            <Save className="w-3 h-3 mr-1" />Salva
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setV(value); setDirty(false); }}>
            Annulla
          </Button>
        </div>
      )}
    </div>
  );
}
