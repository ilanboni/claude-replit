import OpenAI from "openai";
import type { Richiesta, Immobile, ImmobileEsterno } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface ParsedRequest {
  zona?: string;
  budgetMassimo?: number;
  mqMinimi?: number;
  camereMinime?: number;
  bagniMinimi?: number;
  terrazzo?: boolean;
  balcone?: boolean;
  ascensore?: boolean;
  box?: boolean;
  pianoUltimo?: boolean;
  statoNuovo?: boolean;
  statoRistrutturato?: boolean;
  statoBuono?: boolean;
  statoDaRistrutturare?: boolean;
}

export async function parseRequestWithAI(text: string): Promise<ParsedRequest> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un assistente immobiliare italiano. Analizza la richiesta del cliente ed estrai le informazioni strutturate.
          
Rispondi SOLO con un oggetto JSON valido contenente i campi trovati:
- zona: stringa con la zona/quartiere richiesto
- budgetMassimo: numero (solo il valore numerico, senza simboli)
- mqMinimi: numero minimo di metri quadri
- camereMinime: numero minimo di camere/stanze
- bagniMinimi: numero minimo di bagni
- terrazzo: true se richiesto
- balcone: true se richiesto
- ascensore: true se richiesto
- box: true se richiesto box/garage
- pianoUltimo: true se richiesto ultimo piano/attico
- statoNuovo: true se richiesto nuovo
- statoRistrutturato: true se richiesto ristrutturato
- statoBuono: true se accettato buono stato
- statoDaRistrutturare: true se accettato da ristrutturare

Ometti i campi non menzionati. Non aggiungere spiegazioni.`
        },
        {
          role: "user",
          content: text
        }
      ],
      max_completion_tokens: 500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
    return {};
  } catch (error) {
    console.error("AI parse error:", error);
    return {};
  }
}

export function calculateMatchScore(richiesta: Richiesta, immobile: Immobile): number {
  let score = 0;
  let totalWeight = 0;

  // Budget check (weight: 25)
  if (richiesta.budgetMassimo && immobile.prezzo) {
    totalWeight += 25;
    const budget = Number(richiesta.budgetMassimo);
    const prezzo = Number(immobile.prezzo);
    if (prezzo <= budget) {
      score += 25;
    } else if (prezzo <= budget * 1.1) {
      score += 15; // Within 10% over budget
    } else if (prezzo <= budget * 1.2) {
      score += 5; // Within 20% over budget
    }
  }

  // Mq check (weight: 20)
  if (richiesta.mqMinimi && immobile.mq) {
    totalWeight += 20;
    if (immobile.mq >= richiesta.mqMinimi) {
      score += 20;
    } else if (immobile.mq >= richiesta.mqMinimi * 0.9) {
      score += 10; // Within 10% under
    }
  }

  // Zona check (weight: 15)
  if (richiesta.zona && immobile.zona) {
    totalWeight += 15;
    const zonaRichiesta = richiesta.zona.toLowerCase().trim();
    const zonaImmobile = immobile.zona.toLowerCase().trim();
    if (zonaImmobile.includes(zonaRichiesta) || zonaRichiesta.includes(zonaImmobile)) {
      score += 15;
    }
  }

  // Camere check (weight: 15)
  if (richiesta.camereMinime && immobile.camere) {
    totalWeight += 15;
    if (immobile.camere >= richiesta.camereMinime) {
      score += 15;
    } else if (immobile.camere === richiesta.camereMinime - 1) {
      score += 7;
    }
  }

  // Bagni check (weight: 10)
  if (richiesta.bagniMinimi && immobile.bagni) {
    totalWeight += 10;
    if (immobile.bagni >= richiesta.bagniMinimi) {
      score += 10;
    }
  }

  // Piano check (weight: 5)
  if (richiesta.pianoUltimo && immobile.piano !== null) {
    totalWeight += 5;
    // Assuming ultimo piano is typically >= 4
    if (immobile.piano >= 4 || richiesta.pianoTutti) {
      score += 5;
    }
  }

  // Features (weight: 2.5 each = 10 total)
  const features = [
    { req: richiesta.balcone, imm: immobile.balcone },
    { req: richiesta.terrazzo, imm: immobile.terrazzo },
    { req: richiesta.ascensore, imm: immobile.ascensore },
    { req: richiesta.box, imm: immobile.box },
  ];

  for (const feature of features) {
    if (feature.req) {
      totalWeight += 2.5;
      if (feature.imm) {
        score += 2.5;
      }
    }
  }

  // Stato check
  const statoMatch = (
    (richiesta.statoNuovo && immobile.statoNuovo) ||
    (richiesta.statoRistrutturato && immobile.statoRistrutturato) ||
    (richiesta.statoBuono && immobile.statoBuono) ||
    (richiesta.statoDaRistrutturare && immobile.statoDaRistrutturare)
  );

  if (richiesta.statoNuovo || richiesta.statoRistrutturato || richiesta.statoBuono || richiesta.statoDaRistrutturare) {
    totalWeight += 10;
    if (statoMatch) {
      score += 10;
    }
  }

  // Calculate percentage
  if (totalWeight === 0) return 50; // Default score if no criteria specified
  
  const percentage = Math.round((score / totalWeight) * 100);
  return Math.min(100, Math.max(0, percentage));
}

export async function generateAICoachMessage(stats: {
  appuntamentiOggi: number;
  clientiNuovi: number;
  richiesteAttive: number;
  matchingNuovi: number;
}): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un coach motivazionale per agenti immobiliari italiani. 
Genera un breve messaggio (max 2 frasi) motivante e pratico basato sulle statistiche del giorno.
Sii positivo, concreto e professionale. Usa il "tu" informale.`
        },
        {
          role: "user",
          content: `Statistiche di oggi:
- Appuntamenti oggi: ${stats.appuntamentiOggi}
- Nuovi clienti questa settimana: ${stats.clientiNuovi}
- Richieste attive: ${stats.richiesteAttive}
- Nuovi matching disponibili: ${stats.matchingNuovi}`
        }
      ],
      max_completion_tokens: 150,
    });

    return response.choices[0]?.message?.content || "Buona giornata di lavoro! Concentrati sui tuoi obiettivi.";
  } catch (error) {
    console.error("AI coach error:", error);
    return "Buona giornata di lavoro! Concentrati sui tuoi obiettivi.";
  }
}

// ========== ACQUISIZIONE - Property Listing Parser ==========

export interface ParsedPropertyListing {
  titolo?: string;
  descrizione?: string;
  indirizzo?: string;
  zona?: string;
  citta?: string;
  mq?: number;
  prezzo?: number;
  piano?: number;
  camere?: number;
  bagni?: number;
  contattoNome?: string;
  contattoTelefono?: string;
  contattoEmail?: string;
  fonte?: string;
  dataPubblicazione?: string;
  caratteristiche?: Record<string, any>;
}

export async function parsePropertyListingWithAI(text: string, url?: string): Promise<ParsedPropertyListing> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un assistente immobiliare italiano ESPERTO nell'estrazione dati da annunci immobiliari.
Analizza ATTENTAMENTE il testo dell'annuncio ed estrai TUTTE le informazioni, anche quelle implicite.

Rispondi SOLO con un oggetto JSON valido contenente:
- titolo: titolo dell'annuncio (crea uno se manca, es. "Trilocale in Via Roma 15")
- descrizione: descrizione completa dell'immobile
- indirizzo: via e numero civico (es. "Via Roma 15" - cerca parole come "via", "viale", "piazza", "corso" seguite da nome e numero)
- zona: quartiere o zona della città (es. "Porta Romana", "Centro", "Navigli")
- citta: nome della città (es. "Milano", "Roma")
- mq: metri quadri (solo numero intero, cerca "mq", "m²", "metri quadri", "superficie")
- prezzo: prezzo richiesto (solo numero intero, senza € o punti)
- piano: numero del piano (0=terra, 1=primo, ecc. - cerca "piano terra", "1° piano", "secondo piano")
- camere: numero di camere/locali (cerca "trilocale"=3, "bilocale"=2, "quadrilocale"=4, o "N locali/camere")
- bagni: numero di bagni
- contattoNome: nome del venditore/agenzia/inserzionista
- contattoTelefono: numero di telefono COMPLETO (cerca numeri con 10+ cifre, prefissi 02, 06, 3xx, +39)
- contattoEmail: email del contatto
- fonte: portale (immobiliare.it, idealista, subito.it, casa.it, bakeca, privato)
- dataPubblicazione: data di pubblicazione (formato YYYY-MM-DD)
- caratteristiche: {riscaldamento, classe_energetica, garage, cantina, giardino, ascensore, balcone, terrazzo, arredato, ecc.}

REGOLE CRITICHE:
1. TELEFONO: Cerca SEMPRE numeri con pattern 3xx-xxx-xxxx, 02-xxxx-xxxx, +39-xxx. Rimuovi spazi/trattini. Se trovi "cell." o "tel." estrai il numero che segue.
2. INDIRIZZO: Cerca "Via/Viale/Piazza/Corso + Nome + Numero". Se l'annuncio dice "zona Citylife" senza via specifica, metti zona="Citylife".
3. MQ: Estrai il numero prima di "mq", "m²" o "metri". Se dice "100 mq" → mq: 100
4. PIANO: "piano terra"=0, "primo piano"=1, "rialzato"=1, "ultimo piano" cerca il numero totale piani.
5. PREZZO: Converti "250k"=250000, "300.000"=300000, "1.200.000"=1200000
6. Non inventare dati che non esistono nel testo.`
        },
        {
          role: "user",
          content: url ? `URL: ${url}\n\nTesto annuncio:\n${text}` : text
        }
      ],
      max_completion_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
    return {};
  } catch (error) {
    console.error("AI parse property listing error:", error);
    return {};
  }
}

export async function generateAcquisitionMessage(
  immobile: ImmobileEsterno,
  template?: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un agente immobiliare italiano esperto in acquisizioni. Genera un messaggio professionale e persuasivo per contattare un privato che ha messo in vendita un immobile.

Il messaggio deve:
1. Essere cordiale ma professionale
2. Fare riferimento specifico all'immobile (indirizzo, prezzo, caratteristiche)
3. Spiegare brevemente il vantaggio di collaborare con un'agenzia
4. Proporre un incontro/chiamata senza essere troppo insistente
5. Essere breve (max 150 parole)
6. Usare il "Lei" formale

${template ? `Segui questo template/stile:\n${template}` : ''}`
        },
        {
          role: "user",
          content: `Genera un messaggio per contattare il proprietario di questo immobile:

Titolo: ${immobile.titolo || 'Non specificato'}
Zona: ${immobile.zona || 'Non specificata'}
Indirizzo: ${immobile.indirizzo || 'Non specificato'}
Prezzo: ${immobile.prezzo ? `€${Number(immobile.prezzo).toLocaleString('it-IT')}` : 'Non specificato'}
Metri quadri: ${immobile.mq || 'Non specificato'}
Camere: ${immobile.camere || 'Non specificate'}
Contatto: ${immobile.contattoNome || 'Proprietario'}
Fonte annuncio: ${immobile.fonte || 'portale immobiliare'}`
        }
      ],
      max_completion_tokens: 300,
    });

    return response.choices[0]?.message?.content || "Gentile proprietario, ho notato il Suo annuncio e sarei interessato a discutere di una possibile collaborazione per la vendita del Suo immobile.";
  } catch (error) {
    console.error("AI acquisition message error:", error);
    return "Gentile proprietario, ho notato il Suo annuncio e sarei interessato a discutere di una possibile collaborazione per la vendita del Suo immobile.";
  }
}
