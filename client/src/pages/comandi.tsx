import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SEZIONI = [
  {
    icona: "🔥",
    titolo: "Bozze CRM",
    items: [
      { cmd: "ok TAxx", desc: "approva e invia" },
      { cmd: "manda TAxx", desc: "alias di ok" },
      { cmd: "togli <frase> TAxx", desc: "rimuove frase poi manda" },
      { cmd: "modifica TAxx <testo>", desc: "sostituisce interamente" },
      { cmd: "scarta TAxx", desc: "annulla" },
    ],
  },
  {
    icona: "⏸",
    titolo: "Pausa Paolo",
    items: [
      { cmd: "pausa 2h", desc: "stop outbound 2 ore" },
      { cmd: "pausa 30m", desc: "stop 30 minuti" },
      { cmd: "pausa 3g", desc: "stop 3 giorni" },
      { cmd: "pausa fino 14:30", desc: "stop fino orario" },
      { cmd: "pausa fino lunedi", desc: "stop fino weekday" },
      { cmd: "riprendi", desc: "annulla pausa attiva" },
      { cmd: "stato pausa", desc: "info pausa corrente" },
    ],
  },
  {
    icona: "📋",
    titolo: "Promemoria (tasks_ilan)",
    items: [
      { cmd: "lista promemoria", desc: "tutti gli attivi" },
      { cmd: "fatto TAxx", desc: "chiudi promemoria" },
      { cmd: "scarta TAxx", desc: "ignora promemoria" },
      { cmd: "rinvia TAxx 3g", desc: "sposta +3 giorni" },
      { cmd: "rinvia TAxx lunedi 14", desc: "sposta a lun 14:00" },
      { cmd: "promemoria +393… 5g <desc>", desc: "crea manuale" },
    ],
  },
  {
    icona: "🎯",
    titolo: "Pluricondivisi multi-agenzia",
    items: [
      { cmd: "lista pluricondivisi", desc: "vedi aperti" },
      { cmd: "info PLxxxx", desc: "dettagli immobile" },
      { cmd: "proprietario PLxxxx Nome Cognome +393…", desc: "dopo visura" },
      { cmd: "bozza PLxxxx", desc: "genera messaggio WhatsApp" },
      { cmd: "scarta PLxxxx", desc: "fuori pipeline" },
    ],
  },
  {
    icona: "📊",
    titolo: "Analisi strategica",
    items: [
      { cmd: "analisi <domanda>", desc: "risposta data-driven (Anthropic + metriche)" },
      { cmd: "es: analisi vale Meta Ads?", desc: "" },
      { cmd: "es: analisi zona più redditizia", desc: "" },
    ],
  },
  {
    icona: "📨",
    titolo: "Newsletter mensile",
    items: [
      { cmd: "manda newsletter NLxxxx", desc: "invia a tutti i clienti rating ≥3" },
      { cmd: "modifica newsletter NLxxxx <testo>", desc: "riscrivi" },
      { cmd: "scarta newsletter NLxxxx", desc: "non mandare" },
    ],
  },
  {
    icona: "🤖",
    titolo: "Bozze outreach (approvazione)",
    items: [
      { cmd: "approva <UUID>", desc: "manda all'orario successivo" },
      { cmd: "modifica <UUID> <testo>", desc: "riscrivi" },
      { cmd: "scarta <UUID>", desc: "non mandare" },
    ],
  },
  {
    icona: "💬",
    titolo: "Drip post-appuntamento",
    items: [
      { cmd: "manda <id>", desc: "autorizza singolo drip" },
      { cmd: "scarta <id>", desc: "cancella" },
    ],
  },
  {
    icona: "❓",
    titolo: "Help",
    items: [
      { cmd: "help / aiuto / comandi", desc: "lista comandi su Telegram" },
    ],
  },
];

export default function Comandi() {
  return (
    <div className="space-y-3 md:space-y-6 p-3 md:p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-semibold">❓ Comandi Paolo</h1>
        <p className="text-sm text-muted-foreground">Tutti i comandi disponibili via Telegram bot Paolo.</p>
      </div>

      {SEZIONI.map(s => (
        <Card key={s.titolo} className="p-4">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <span className="text-lg">{s.icona}</span>{s.titolo}
            <Badge variant="secondary" className="ml-auto">{s.items.length}</Badge>
          </h2>
          <ul className="space-y-1.5">
            {s.items.map((it, i) => (
              <li key={i} className="flex flex-col gap-0.5 py-1 border-b border-muted-foreground/10 last:border-0">
                <code className="text-xs bg-muted/40 px-2 py-1 rounded font-mono w-fit">{it.cmd}</code>
                {it.desc && <span className="text-xs text-muted-foreground pl-1">{it.desc}</span>}
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <p className="text-xs text-muted-foreground text-center py-4">
        Bot Telegram: <strong>Paolo Salvemini Cavour</strong> · Per problemi → <code>help</code>
      </p>
    </div>
  );
}
