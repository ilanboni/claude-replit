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

export async function parsePropertyImageWithAI(imageBase64: string, mimeType: string): Promise<ParsedPropertyListing> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un assistente immobiliare italiano ESPERTO nell'estrazione dati da screenshot di annunci immobiliari.
Analizza ATTENTAMENTE l'immagine ed estrai TUTTE le informazioni visibili.

Rispondi SOLO con un oggetto JSON valido contenente TUTTI questi campi (ometti solo se non visibili):

DATI PRINCIPALI:
- titolo: string - titolo dell'annuncio
- descrizione: string - descrizione completa
- indirizzo: string - via e numero civico
- zona: string - quartiere o zona
- citta: string - nome della città
- mq: number - metri quadri
- prezzo: number - prezzo (solo numero)
- piano: number - numero del piano (0=terra)
- pianiEdificio: number - piani totali edificio
- camere: number - numero locali/camere
- bagni: number - numero bagni

CARATTERISTICHE (booleani):
- ascensore: boolean
- balcone: boolean
- terrazzo: boolean
- box: boolean - garage/posto auto
- cantina: boolean
- giardino: boolean
- arredato: boolean

STATO IMMOBILE:
- statoNuovo: boolean
- statoRistrutturato: boolean
- statoBuono: boolean
- statoDaRistrutturare: boolean

INFO AGGIUNTIVE:
- classeEnergetica: string - A, B, C, D, E, F, G
- prestazioneEnergetica: string - es. "76 kWh/m² anno"
- speseCondominiali: number - euro/mese
- riscaldamento: string - autonomo/centralizzato
- esposizione: string

CONTATTO:
- contattoNome: string
- contattoTelefono: string - numero COMPLETO
- contattoEmail: string

META:
- fonte: string - portale (immobiliare.it, idealista, etc.)
- riferimentoAnnuncio: string - codice annuncio

REGOLE:
1. LEGGI tutti i testi visibili
2. Cerca telefoni formato italiano (3xx, 02, +39)
3. Estrai prezzo, mq, camere dai badge
4. Identifica fonte dal logo
5. Non inventare dati non visibili`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high"
              }
            },
            {
              type: "text",
              text: "Analizza questo screenshot di un annuncio immobiliare ed estrai tutti i dati in formato JSON."
            }
          ]
        }
      ],
      max_completion_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
    return {};
  } catch (error) {
    console.error("AI parse image error:", error);
    return {};
  }
}

export interface ParsedPropertyListing {
  titolo?: string;
  descrizione?: string;
  indirizzo?: string;
  zona?: string;
  citta?: string;
  mq?: number;
  prezzo?: number;
  piano?: number;
  pianiEdificio?: number;
  camere?: number;
  bagni?: number;
  // Caratteristiche booleane
  ascensore?: boolean;
  balcone?: boolean;
  terrazzo?: boolean;
  box?: boolean;
  cantina?: boolean;
  giardino?: boolean;
  arredato?: boolean;
  // Stato immobile
  statoNuovo?: boolean;
  statoRistrutturato?: boolean;
  statoBuono?: boolean;
  statoDaRistrutturare?: boolean;
  // Informazioni aggiuntive
  classeEnergetica?: string;
  prestazioneEnergetica?: string;
  speseCondominiali?: number;
  riscaldamento?: string;
  esposizione?: string;
  annoCostruzione?: number;
  // Contatto
  contattoNome?: string;
  contattoTelefono?: string;
  contattoEmail?: string;
  // Meta
  fonte?: string;
  dataPubblicazione?: string;
  riferimentoAnnuncio?: string;
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

Rispondi SOLO con un oggetto JSON valido contenente TUTTI questi campi (ometti solo se non trovati):

DATI PRINCIPALI:
- titolo: string - titolo dell'annuncio (crea uno se manca, es. "Trilocale in Via Roma 15")
- descrizione: string - descrizione completa dell'immobile
- indirizzo: string - via e numero civico
- zona: string - quartiere o zona della città
- citta: string - nome della città
- mq: number - metri quadri (solo numero intero)
- prezzo: number - prezzo richiesto (solo numero intero)
- piano: number - numero del piano (0=terra, 1=primo)
- pianiEdificio: number - piani totali dell'edificio
- camere: number - numero di locali/camere (bilocale=2, trilocale=3)
- bagni: number - numero di bagni

CARATTERISTICHE (booleani true/false):
- ascensore: boolean - se presente ascensore
- balcone: boolean - se presente balcone
- terrazzo: boolean - se presente terrazzo
- box: boolean - se presente box/garage/posto auto
- cantina: boolean - se presente cantina/solaio
- giardino: boolean - se presente giardino
- arredato: boolean - se arredato

STATO IMMOBILE (booleani true/false):
- statoNuovo: boolean - immobile nuovo/di nuova costruzione
- statoRistrutturato: boolean - immobile ristrutturato
- statoBuono: boolean - in buono stato/buone condizioni
- statoDaRistrutturare: boolean - da ristrutturare

INFORMAZIONI AGGIUNTIVE:
- classeEnergetica: string - classe energetica (A, B, C, D, E, F, G)
- prestazioneEnergetica: string - es. "76 kWh/m² anno"
- speseCondominiali: number - spese condominiali mensili in euro
- riscaldamento: string - tipo riscaldamento (autonomo, centralizzato)
- esposizione: string - esposizione (sud, nord, est, ovest, interna)
- annoCostruzione: number - anno di costruzione

CONTATTO:
- contattoNome: string - nome del venditore/agenzia
- contattoTelefono: string - numero di telefono COMPLETO
- contattoEmail: string - email del contatto

META:
- fonte: string - portale (immobiliare.it, idealista, subito.it)
- dataPubblicazione: string - data pubblicazione (YYYY-MM-DD)
- riferimentoAnnuncio: string - codice riferimento annuncio

REGOLE CRITICHE:
1. TELEFONO: Cerca numeri con pattern 3xx-xxx-xxxx, 02-xxxx-xxxx, +39. Rimuovi spazi.
2. INDIRIZZO: Cerca "Via/Viale/Piazza/Corso + Nome + Numero"
3. MQ: Estrai il numero prima di "mq", "m²", "metri"
4. PIANO: "piano terra"=0, "primo piano"=1, "rialzato"=1
5. PREZZO: Converti "250k"=250000, "300.000"=300000
6. STATO: "ristrutturato" → statoRistrutturato=true, "buono stato" → statoBuono=true
7. CARATTERISTICHE: "con ascensore" → ascensore=true, "no ascensore" → ascensore=false
8. SPESE: "€150/mese" o "150€ mensili" → speseCondominiali=150
9. Non inventare dati non presenti nel testo.`
        },
        {
          role: "user",
          content: url ? `URL: ${url}\n\nTesto annuncio:\n${text}` : text
        }
      ],
      max_completion_tokens: 2000,
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
