// Simulazione conversazione WhatsApp Bot - Dott. Ilan Boni
import OpenAI from "openai";

const annuncio = {
  titolo: "Trilocale luminoso zona Navigli",
  indirizzo: "Via Corsico 15, Milano",
  prezzo: 320000,
  mq: 85,
  locali: 3,
  descrizione: "Bellissimo trilocale al terzo piano con ascensore, doppia esposizione, balcone vivibile. Ristrutturato nel 2020.",
  telefono: "+39 347 1234567",
  proprietario: "Mario Rossi"
};

const BOT_CONFIG = {
  "bot_name": "Assistente del Dott. Ilan Boni",
  "identity": {
    "presentation": "Buongiorno, sono l'assistente del Dott. Ilan Boni, agente immobiliare con oltre trent'anni di esperienza nella compravendita di immobili.",
    "background": "Il Dott. Boni opera a Milano da oltre tre decenni ed è specializzato in appartamenti e case unifamiliari.",
    "positioning": "Non siamo la classica agenzia immobiliare. Il Dott. Boni preferisce lavorare con pochi immobili, seguendoli personalmente dall'inizio alla fine."
  }
};

async function simulateConversation() {
  console.log("=".repeat(60));
  console.log("SIMULAZIONE CONVERSAZIONE WHATSAPP BOT");
  console.log("=".repeat(60));
  console.log("\nANNUNCIO:");
  console.log("   " + annuncio.titolo);
  console.log("   " + annuncio.indirizzo + " - " + annuncio.mq + "mq - EUR " + annuncio.prezzo.toLocaleString());
  console.log("   Proprietario: " + annuncio.proprietario + " (" + annuncio.telefono + ")");
  console.log("\n" + "-".repeat(60));

  const openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  });

  const conversationHistory: Array<{role: "assistant" | "user", content: string}> = [];

  const systemPrompt = `Sei l'Assistente del Dott. Ilan Boni, agente immobiliare con oltre 30 anni di esperienza a Milano.

CONTESTO IMMOBILE:
- Titolo: ${annuncio.titolo}
- Indirizzo: ${annuncio.indirizzo}
- Prezzo: EUR ${annuncio.prezzo.toLocaleString()}
- Superficie: ${annuncio.mq} mq
- Proprietario: Sig. ${annuncio.proprietario}

REGOLE COMUNICAZIONE:
1. Dai SEMPRE del Lei
2. Frasi BREVI (max 3-4 frasi, stile WhatsApp)
3. Tono: calmo, empatico, professionale
4. EVITA: linguaggio aggressivo, promesse, termini tecnici complessi
5. Rispondi SOLO in italiano

OBIETTIVO PRINCIPALE:
Fissare un appuntamento breve (10-15 minuti) per permettere al Dott. Boni di vedere l'immobile.

GESTIONE OBIEZIONI:
- Se dice "non mi fido delle agenzie": riconosci il sentimento, spiega che il Dott. Boni lavora in modo diverso, con pochi immobili seguiti personalmente.
- Se chiede "quanto prendete?": spiega che se ne parla solo dopo aver visto l'immobile, nessun impegno vincolante.
- Se dice "ci penso": proponi un incontro breve senza impegno per avere un quadro chiaro.

STRUTTURA RISPOSTA:
1. Empatia (riconosci il punto di vista)
2. Ricalco (mostra comprensione)
3. Valore dell'incontro (perche conviene vedersi)
4. Proposta appuntamento (concreta ma non insistente)`;

  // Messaggio iniziale del bot
  const messaggioIniziale = "Buongiorno Sig. " + annuncio.proprietario.split(" ")[1] + ", sono l'assistente del Dott. Ilan Boni. Ho visto il Suo annuncio per il trilocale in zona Navigli. L'immobile sembra interessante. Posso chiederLe se sta gia lavorando con un'agenzia o sta gestendo la vendita da privato?";
  
  console.log("\n[BOT] DOTT. BONI (messaggio iniziale):");
  console.log("   \"" + messaggioIniziale + "\"");
  conversationHistory.push({ role: "assistant", content: messaggioIniziale });

  // Simuliamo diverse risposte del proprietario
  const risposteProprietario = [
    "Sto vendendo da privato, non mi fido delle agenzie",
    "Perche dovrei affidarmi a voi? Le agenzie chiedono troppo",
    "Quanto prendete di commissione?",
    "Va bene, potremmo parlarne. Quando potrebbe passare?"
  ];

  for (const risposta of risposteProprietario) {
    console.log("\n[PROPRIETARIO]:");
    console.log("   \"" + risposta + "\"");
    
    conversationHistory.push({ role: "user", content: risposta });

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory
    ];

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 200
      });

      const botMessage = completion.choices[0]?.message?.content?.trim() 
        || "Grazie per il messaggio. La ricontattero a breve.";

      console.log("\n[BOT] DOTT. BONI:");
      console.log("   \"" + botMessage + "\"");

      conversationHistory.push({ role: "assistant", content: botMessage });
    } catch (error) {
      console.error("Errore:", error);
    }
    
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("\n" + "=".repeat(60));
  console.log("FINE SIMULAZIONE");
  console.log("=".repeat(60));
}

simulateConversation().catch(console.error);
