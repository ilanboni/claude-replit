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

// Regex patterns for Italian phone numbers
const ITALIAN_PHONE_PATTERNS = [
  /(?:\+39[\s.-]?)?3[0-9]{2}[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}/g, // Mobile: 3xx xxx xxxx
  /(?:\+39[\s.-]?)?3[0-9]{8,9}/g, // Mobile without spaces
  /(?:\+39[\s.-]?)?0[0-9]{1,3}[\s.-]?[0-9]{5,8}/g, // Landline: 0xx xxxxx
  /(?:\+39[\s.-]?)?[0-9]{2,4}[\s.-]?[0-9]{5,7}/g, // Generic Italian
];

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function extractPhoneFromText(text: string): string | undefined {
  for (const pattern of ITALIAN_PHONE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      // Return the first valid phone, cleaned up
      const phone = matches[0].replace(/[\s.-]/g, '');
      if (phone.length >= 9 && phone.length <= 13) {
        return phone;
      }
    }
  }
  return undefined;
}

function extractEmailFromText(text: string): string | undefined {
  const matches = text.match(EMAIL_PATTERN);
  return matches?.[0];
}

export async function parsePropertyImageWithAI(imageBase64: string, mimeType: string): Promise<ParsedPropertyListing> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un ESPERTO OCR italiano specializzato nell'estrazione dati da screenshot di annunci immobiliari.
La tua PRIORITÀ ASSOLUTA è estrarre il NUMERO DI TELEFONO - leggi OGNI singolo carattere nell'immagine.

ISTRUZIONI OCR TELEFONO:
1. Scansiona TUTTA l'immagine pixel per pixel cercando sequenze numeriche
2. Cerca in: header, footer, sidebar, bottoni, badge, overlay, watermark, angoli
3. Pattern italiani: 3XX XXX XXXX, +39 XXX, 02-XXXX, 06 XXXX, 335.123.4567
4. Anche numeri parzialmente oscurati: 3XX**XXXX → riportali comunque
5. Se vedi QUALSIASI sequenza di 9-12 cifre, è probabilmente un telefono

Rispondi con JSON contenente TUTTI i campi trovati:

{
  "titolo": "string - titolo annuncio",
  "descrizione": "string - descrizione",
  "indirizzo": "string - via e numero",
  "zona": "string - quartiere",
  "citta": "string - città",
  "mq": number,
  "prezzo": number,
  "piano": number,
  "camere": number,
  "bagni": number,
  "ascensore": boolean,
  "balcone": boolean,
  "terrazzo": boolean,
  "box": boolean,
  "cantina": boolean,
  "giardino": boolean,
  "arredato": boolean,
  "statoNuovo": boolean,
  "statoRistrutturato": boolean,
  "statoBuono": boolean,
  "statoDaRistrutturare": boolean,
  "classeEnergetica": "string A-G",
  "speseCondominiali": number,
  "riscaldamento": "string",
  "contattoNome": "string - OBBLIGATORIO: nome/agenzia/privato",
  "contattoTelefono": "string - OBBLIGATORIO SE VISIBILE: numero completo con tutte le cifre",
  "contattoEmail": "string - email se presente",
  "fonte": "string - immobiliare.it/idealista/subito",
  "riferimentoAnnuncio": "string - codice",
  "testoCompleto": "string - TRASCRIVI TUTTO IL TESTO VISIBILE NELL'IMMAGINE"
}

REGOLA CRITICA: Il campo "testoCompleto" deve contenere OGNI parola e numero che leggi nell'immagine, inclusi numeri di telefono, codici, date. Questo è fondamentale per il backup dell'estrazione.`
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
              text: "LEGGI ATTENTAMENTE: Estrai TUTTI i dati visibili, specialmente il NUMERO DI TELEFONO. Trascrivi anche tutto il testo che vedi nel campo testoCompleto."
            }
          ]
        }
      ],
      max_completion_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      
      // Filter invalid phone values
      const invalidPhoneValues = ['non disponibile', 'nascosto', 'privato', 'n/a', 'nd', '-', ''];
      const isValidPhone = (phone: string | undefined): boolean => {
        if (!phone) return false;
        const normalized = phone.toLowerCase().replace(/\s+/g, '');
        if (invalidPhoneValues.some(v => normalized === v.replace(/\s+/g, ''))) return false;
        // Must contain at least 8 digits
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 8;
      };
      
      // Post-processing: validate phone or extract from testoCompleto
      if (!isValidPhone(parsed.contattoTelefono)) {
        parsed.contattoTelefono = undefined; // Clear invalid value
        if (parsed.testoCompleto) {
          const extractedPhone = extractPhoneFromText(parsed.testoCompleto);
          if (extractedPhone) {
            console.log(`[AI] Phone extracted via regex fallback: ${extractedPhone}`);
            parsed.contattoTelefono = extractedPhone;
          }
        }
      }
      
      if (!parsed.contattoEmail && parsed.testoCompleto) {
        const extractedEmail = extractEmailFromText(parsed.testoCompleto);
        if (extractedEmail) {
          console.log(`[AI] Email extracted via regex fallback: ${extractedEmail}`);
          parsed.contattoEmail = extractedEmail;
        }
      }
      
      // Log when phone is missing for monitoring
      if (!parsed.contattoTelefono) {
        console.log(`[AI] WARNING: No valid phone extracted from image. testoCompleto: ${parsed.testoCompleto?.substring(0, 300)}`);
      }
      
      // Clean up internal field
      delete parsed.testoCompleto;
      
      return parsed;
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

CONTATTO (PRIORITÀ MASSIMA - CERCALI OVUNQUE):
- contattoNome: string - nome del venditore/agenzia/privato
- contattoTelefono: string - numero di telefono COMPLETO (OBBLIGATORIO se presente!)
- contattoEmail: string - email del contatto

META:
- fonte: string - portale (immobiliare.it, idealista, subito.it)
- dataPubblicazione: string - data pubblicazione (YYYY-MM-DD)
- riferimentoAnnuncio: string - codice riferimento annuncio

REGOLE CRITICHE:
1. TELEFONO È LA PRIORITÀ - cerca OVUNQUE nel testo: 3xx, 02x, 06x, +39, anche parzialmente mascherati
2. INDIRIZZO: Cerca "Via/Viale/Piazza/Corso + Nome + Numero"
3. MQ: Estrai il numero prima di "mq", "m²", "metri"
4. PIANO: "piano terra"=0, "primo piano"=1, "rialzato"=1
5. PREZZO: Converti "250k"=250000, "300.000"=300000
6. EMAIL: cerca pattern con @ nel testo
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
      const parsed = JSON.parse(content);
      
      // Filter invalid phone values
      const invalidPhoneValues = ['non disponibile', 'nascosto', 'privato', 'n/a', 'nd', '-', ''];
      const isValidPhone = (phone: string | undefined): boolean => {
        if (!phone) return false;
        const normalized = phone.toLowerCase().replace(/\s+/g, '');
        if (invalidPhoneValues.some(v => normalized === v.replace(/\s+/g, ''))) return false;
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 8;
      };
      
      // Post-processing: validate phone or extract from text
      if (!isValidPhone(parsed.contattoTelefono)) {
        parsed.contattoTelefono = undefined;
        const extractedPhone = extractPhoneFromText(text);
        if (extractedPhone) {
          console.log(`[AI] Phone extracted via regex fallback from text: ${extractedPhone}`);
          parsed.contattoTelefono = extractedPhone;
        }
      }
      
      if (!parsed.contattoEmail) {
        const extractedEmail = extractEmailFromText(text);
        if (extractedEmail) {
          console.log(`[AI] Email extracted via regex fallback from text: ${extractedEmail}`);
          parsed.contattoEmail = extractedEmail;
        }
      }
      
      return parsed;
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
