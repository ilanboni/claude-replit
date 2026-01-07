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

// Regex patterns for Italian phone numbers - MOBILE FIRST (3xx is priority)
const ITALIAN_MOBILE_PATTERN = /(?:\+39[\s.-]?)?3[0-9]{2}[\s.-]?[0-9]{3}[\s.-]?[0-9]{4}/g;
const ITALIAN_MOBILE_COMPACT = /(?:\+39[\s.-]?)?3[0-9]{8,9}/g;

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Valid Italian landline prefixes (main cities and areas)
const VALID_LANDLINE_PREFIXES = [
  '02',   // Milano
  '06',   // Roma
  '010',  // Genova
  '011',  // Torino
  '015',  // Biella
  '019',  // Savona
  '030',  // Brescia
  '031',  // Como
  '035',  // Bergamo
  '039',  // Monza
  '040',  // Trieste
  '041',  // Venezia
  '045',  // Verona
  '049',  // Padova
  '050',  // Pisa
  '051',  // Bologna
  '055',  // Firenze
  '059',  // Modena
  '070',  // Cagliari
  '071',  // Ancona
  '075',  // Perugia
  '079',  // Sassari
  '080',  // Bari
  '081',  // Napoli
  '085',  // Pescara
  '089',  // Salerno
  '090',  // Messina
  '091',  // Palermo
  '095',  // Catania
  '099',  // Taranto
];

// Known advertising/service numbers to exclude (prefix patterns)
const EXCLUDED_PHONE_PATTERNS = [
  /^800/,   // Numeri verdi
  /^84[0-8]/, // Numeri a pagamento 840-848
  /^199/,   // Numeri a pagamento
  /^899/,   // Numeri a pagamento
  /^178/,   // Servizi
  /^166/,   // Servizi
  /^144/,   // Servizi
  /^0[0-9]*0{4,}/, // Numeri con 4+ zeri consecutivi (probabilmente codici)
];

// Known P. IVA numbers from real estate portals (NOT phone numbers!)
const KNOWN_PIVA_NUMBERS = [
  '08435221000', // Immobiliare.it P. IVA
  '05426150481', // Idealista Italia P. IVA
  '04645850960', // Casa.it P. IVA
];

// Check if a number appears near "P. IVA" or similar markers in text
function isNumberNearPIVA(phone: string, text: string): boolean {
  const patterns = [
    /P\.\s*IVA\s*[\d\s.-]*/gi,
    /P\.IVA\s*[\d\s.-]*/gi,
    /Partita\s*IVA\s*[\d\s.-]*/gi,
    /VAT\s*[\d\s.-]*/gi,
    /C\.F\.\s*[\d\s.-]*/gi,
    /Codice\s*Fiscale\s*[\d\s.-]*/gi,
  ];
  
  const phoneDigits = phone.replace(/\D/g, '');
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        const matchDigits = match.replace(/\D/g, '');
        if (matchDigits === phoneDigits || matchDigits.includes(phoneDigits)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Check if number looks like a reference code (not a real phone)
function looksLikeReferenceCode(phone: string): boolean {
  // Known portal P. IVA numbers
  if (KNOWN_PIVA_NUMBERS.includes(phone)) return true;
  // Contains 4+ consecutive zeros
  if (/0{4,}/.test(phone)) return true;
  // Contains 4+ consecutive same digits
  if (/(\d)\1{3,}/.test(phone)) return true;
  // Starts with unusual patterns for Italian phones
  if (/^08[2-9]/.test(phone)) return true; // 082-089 are not common Italian prefixes
  // Too many digits (likely a reference code)
  if (phone.length > 12) return true;
  return false;
}

// Validate if a landline number has a real Italian prefix
function isValidLandlinePrefix(phone: string): boolean {
  for (const prefix of VALID_LANDLINE_PREFIXES) {
    if (phone.startsWith(prefix)) return true;
  }
  // Also accept 01XX, 02X, 03XX, 04XX, 05XX patterns that aren't in main list
  // but only if they follow Italian format (0XX followed by 6-8 digits)
  if (/^0[1-9][0-9]/.test(phone)) {
    const afterPrefix = phone.substring(3);
    // Real landlines have 6-8 digits after the prefix
    if (afterPrefix.length >= 6 && afterPrefix.length <= 8) {
      return true;
    }
  }
  return false;
}

function extractPhoneFromText(text: string): string | undefined {
  // Priority 1: Mobile numbers (3xx) - most likely to be the owner
  for (const pattern of [ITALIAN_MOBILE_PATTERN, ITALIAN_MOBILE_COMPACT]) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      for (const match of matches) {
        const phone = match.replace(/[\s.-]/g, '').replace(/^\+39/, '');
        if (phone.length >= 9 && phone.length <= 11 && phone.startsWith('3')) {
          // Extra validation: check for reference code patterns
          if (looksLikeReferenceCode(phone)) {
            console.log(`[AI] Skipping mobile-looking reference code: ${phone}`);
            continue;
          }
          console.log(`[AI] Found mobile phone: ${phone}`);
          return phone;
        }
      }
    }
  }
  
  // Priority 2: Landline numbers with STRICT validation
  // Look for numbers with separators (more likely to be real phones)
  const landlineWithSeparators = /(?:\+39[\s.-]?)?0[0-9]{1,2}[\s.-][0-9]{3,4}[\s.-]?[0-9]{3,4}/g;
  const landlineMatches = text.match(landlineWithSeparators);
  if (landlineMatches) {
    for (const match of landlineMatches) {
      const phone = match.replace(/[\s.-]/g, '').replace(/^\+39/, '');
      
      // Check against excluded patterns
      const isExcluded = EXCLUDED_PHONE_PATTERNS.some(pattern => pattern.test(phone));
      if (isExcluded) {
        console.log(`[AI] Skipping excluded pattern: ${phone}`);
        continue;
      }
      
      // Check if looks like reference code
      if (looksLikeReferenceCode(phone)) {
        console.log(`[AI] Skipping reference code: ${phone}`);
        continue;
      }
      
      // Validate prefix
      if (!isValidLandlinePrefix(phone)) {
        console.log(`[AI] Skipping invalid landline prefix: ${phone}`);
        continue;
      }
      
      if (phone.length >= 9 && phone.length <= 11) {
        console.log(`[AI] Found valid landline phone: ${phone}`);
        return phone;
      }
    }
  }
  
  // DO NOT fallback to compact landline patterns - too risky for false positives
  console.log(`[AI] No valid phone number found in text`);
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
  "contattoNome": "string - nome/agenzia/privato",
  "contattoTelefono": "string - SOLO numero telefono REALE del proprietario (3xx cellulare, 02/06 fisso). MAI partite IVA!",
  "contattoEmail": "string - email se presente",
  "fonte": "string - immobiliare.it/idealista/subito",
  "riferimentoAnnuncio": "string - codice",
  "testoCompleto": "string - TRASCRIVI TUTTO IL TESTO VISIBILE NELL'IMMAGINE"
}

REGOLE CRITICHE TELEFONO:
1. contattoTelefono deve essere SOLO il numero del proprietario/venditore (inizia con 3xx o 02/06)
2. NON sono telefoni: "P. IVA", "P.IVA", "Partita IVA", codici riferimento, numeri di servizio
3. La P.IVA di Immobiliare.it (08435221000) NON è un telefono - IGNORALA SEMPRE
4. Se l'annuncio dice "telefonare" ma il numero non è visibile, OMETTI contattoTelefono

REGOLA TRASCRIZIONE: Il campo "testoCompleto" deve contenere OGNI parola e numero che leggi nell'immagine.`
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
      const testoCompleto = parsed.testoCompleto || '';
      
      const isValidPhoneFromImage = (phone: string | undefined): boolean => {
        if (!phone) return false;
        const normalized = phone.toLowerCase().replace(/\s+/g, '');
        if (invalidPhoneValues.some(v => normalized === v.replace(/\s+/g, ''))) return false;
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 8) return false;
        // Check if it's a known P.IVA
        if (KNOWN_PIVA_NUMBERS.includes(digits)) {
          console.log(`[AI] Rejecting known P.IVA as phone: ${digits}`);
          return false;
        }
        // Check if number appears near P.IVA marker
        if (isNumberNearPIVA(digits, testoCompleto)) {
          console.log(`[AI] Rejecting phone near P.IVA marker: ${digits}`);
          return false;
        }
        // Check for reference code patterns
        if (looksLikeReferenceCode(digits)) {
          console.log(`[AI] Rejecting reference code as phone: ${digits}`);
          return false;
        }
        return true;
      };
      
      // Post-processing: validate phone or extract from testoCompleto
      if (!isValidPhoneFromImage(parsed.contattoTelefono)) {
        parsed.contattoTelefono = undefined; // Clear invalid value
        if (testoCompleto) {
          const extractedPhone = extractPhoneFromText(testoCompleto);
          if (extractedPhone && !isNumberNearPIVA(extractedPhone, testoCompleto)) {
            console.log(`[AI] Phone extracted via regex fallback: ${extractedPhone}`);
            parsed.contattoTelefono = extractedPhone;
          }
        }
      }
      
      if (!parsed.contattoEmail && testoCompleto) {
        const extractedEmail = extractEmailFromText(testoCompleto);
        if (extractedEmail) {
          console.log(`[AI] Email extracted via regex fallback: ${extractedEmail}`);
          parsed.contattoEmail = extractedEmail;
        }
      }
      
      // Log when phone is missing for monitoring
      if (!parsed.contattoTelefono) {
        console.log(`[AI] No valid phone found - may be hidden by portal`);
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
- contattoTelefono: string - numero di telefono REALE del proprietario/venditore (NON partite IVA!)
- contattoEmail: string - email del contatto

META:
- fonte: string - portale (immobiliare.it, idealista, subito.it)
- dataPubblicazione: string - data pubblicazione (YYYY-MM-DD)
- riferimentoAnnuncio: string - codice riferimento annuncio

REGOLE CRITICHE TELEFONO:
1. TELEFONO: cerca numeri che iniziano con 3xx (cellulare) o 02/06 (fisso)
2. NON SONO TELEFONI: "P. IVA", "P.IVA", "Partita IVA", codici riferimento (es. EK-123456), VAT numbers
3. Se l'annuncio dice "telefonare" ma NON mostra il numero, contattoTelefono deve essere null/omesso
4. La P. IVA di Immobiliare.it (08435221000) NON è un telefono - IGNORALA

ALTRE REGOLE:
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
        if (digits.length < 8) return false;
        // Check if it's a known P.IVA
        if (KNOWN_PIVA_NUMBERS.includes(digits)) {
          console.log(`[AI] Rejecting known P.IVA as phone: ${digits}`);
          return false;
        }
        // Check if number appears near P.IVA marker in text
        if (isNumberNearPIVA(digits, text)) {
          console.log(`[AI] Rejecting phone near P.IVA marker: ${digits}`);
          return false;
        }
        // Check for reference code patterns
        if (looksLikeReferenceCode(digits)) {
          console.log(`[AI] Rejecting reference code as phone: ${digits}`);
          return false;
        }
        return true;
      };
      
      // Post-processing: validate phone or extract from text
      if (!isValidPhone(parsed.contattoTelefono)) {
        parsed.contattoTelefono = undefined;
        const extractedPhone = extractPhoneFromText(text);
        if (extractedPhone && !isNumberNearPIVA(extractedPhone, text)) {
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
      
      // Log when no phone found
      if (!parsed.contattoTelefono) {
        console.log(`[AI] No valid phone found - may be hidden by portal`);
      }
      
      return parsed;
    }
    return {};
  } catch (error) {
    console.error("AI parse property listing error:", error);
    return {};
  }
}

// Default acquisition message template for private sellers
const DEFAULT_ACQUISITION_TEMPLATE = `Gentile Proprietario,
sono l'assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent'anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un'opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in {{via}}.
Caratteristiche come {{caratteristiche}} sono oggi molto richieste da chi cerca immobili con potenzialità immediate, sia in termini di rendimento sia di stabilità del valore nel tempo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l'immobile: una decina di minuti per ascoltare la sua situazione, vedere l'appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni`;

export async function generateAcquisitionMessage(
  immobile: ImmobileEsterno,
  template?: string,
  mirroringText?: string
): Promise<string> {
  try {
    // Use mirroring text if provided, otherwise build from characteristics
    let caratteristicheStr: string;
    
    if (mirroringText && mirroringText.trim()) {
      // Use the AI-generated mirroring phrases
      caratteristicheStr = mirroringText;
    } else {
      // Fallback: Build characteristics string from immobile data
      const caratteristiche: string[] = [];
      if (immobile.mq) caratteristiche.push(`${immobile.mq} mq`);
      if (immobile.camere) caratteristiche.push(`${immobile.camere} locali`);
      if (immobile.piano) caratteristiche.push(`piano ${immobile.piano}`);
      if (immobile.ascensore) caratteristiche.push("con ascensore");
      if (immobile.balcone) caratteristiche.push("con balcone");
      if (immobile.terrazzo) caratteristiche.push("con terrazzo");
      if (immobile.box) caratteristiche.push("con box");
      if (immobile.arredato) caratteristiche.push("arredato");
      if (immobile.statoRistrutturato) caratteristiche.push("ristrutturato");
      if (immobile.classeEnergetica) caratteristiche.push(`classe energetica ${immobile.classeEnergetica}`);
      
      caratteristicheStr = caratteristiche.length > 0 
        ? caratteristiche.join(", ") 
        : "le sue caratteristiche";
    }
    
    const via = immobile.indirizzo || immobile.zona || "zona";
    
    // Use provided template or default
    const baseTemplate = template || DEFAULT_ACQUISITION_TEMPLATE;
    
    // Replace placeholders
    let message = baseTemplate
      .replace(/\{\{via\}\}/g, via)
      .replace(/\{\{caratteristiche\}\}/g, caratteristicheStr);
    
    return message;
  } catch (error) {
    console.error("Acquisition message generation error:", error);
    return DEFAULT_ACQUISITION_TEMPLATE
      .replace(/\{\{via\}\}/g, immobile.indirizzo || "zona")
      .replace(/\{\{caratteristiche\}\}/g, "le sue caratteristiche");
  }
}

export interface MirroringInput {
  testoAnnuncio: string;
  tipoUnita?: string | null;
  zonaOVia?: string | null;
}

export interface MirroringOutput {
  mirroring: string;
}

export async function generateMirroring(input: MirroringInput): Promise<MirroringOutput> {
  try {
    const systemPrompt = `Leggi l'annuncio immobiliare fornito e genera 1–3 frasi che descrivono l'immobile in modo sobrio, professionale e neutro. Questo testo verra inserito subito dopo la frase "Ha notato il suo immobile in ...".

REGOLE DI POSIZIONAMENTO TESTO:
- NON ripetere l'indirizzo.
- NON usare saluti, presentazioni o chiusure.
- NON nominare Ilan Boni, Sara, agenzia o clienti.
- Il testo deve essere autonomo e completo grammaticalmente.

OBBLIGHI ASSOLUTI:
- NON inventare informazioni non presenti nell'annuncio.
- NON usare tono promozionale o di vendita.
- NON usare espressioni vaghe come "queste caratteristiche", "un immobile di questo tipo", "ottima soluzione".
- NON iniziare frasi con "Si tratta di", "L'immobile presenta", "Da notare".
- Ogni frase deve essere INDIPENDENTE, grammaticalmente corretta e avere senso compiuto da sola.
- Usa solo FATTI verificabili presenti nel testo.

TONO:
Sobrio, neutro, descrittivo. Nessun tono di vendita.

Puoi menzionare: tipologia (bilocale, trilocale...), metratura, piano, esposizione, caratteristiche distintive (terrazzo, doppi servizi, cantina, box...), stato dell'immobile, luminosita, posizione rispetto a servizi o mezzi, anno di costruzione se citato.
Se l'annuncio e molto scarno, limita il mirroring a una sola frase.

Rispondi SOLO con un oggetto JSON nel formato: {"mirroring": "testo"}`;

    const userMessage = `Testo annuncio: ${input.testoAnnuncio}
${input.tipoUnita ? `Tipo unita: ${input.tipoUnita}` : ''}
${input.zonaOVia ? `Zona/via: ${input.zonaOVia}` : ''}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_completion_tokens: 300,
      temperature: 0.18,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return { mirroring: parsed.mirroring || "" };
    }
    return { mirroring: "" };
  } catch (error) {
    console.error("Mirroring generation error:", error);
    return { mirroring: "" };
  }
}

// Extracted property facts interface
export interface ExtractedPropertyFacts {
  tipo_unita: string | null;
  ristrutturato: boolean;
  anno_ristrutturazione: number | null;
  numero_camere: number | null;
  numero_bagni: number | null;
  doppia_esposizione: boolean;
  balconi: number | null;
  terrazzo: boolean;
  piano: string | null;
  ultimo_piano: boolean;
  ascensore: boolean;
  portineria: boolean;
  classe_energetica: string | null;
  arredato: boolean;
  cantina: boolean;
  posto_auto_o_bici: boolean;
  zona_testuale: string | null;
  metro_o_trasporti: string | null;
}

export async function extractPropertyFacts(testoAnnuncio: string): Promise<ExtractedPropertyFacts> {
  const defaultResult: ExtractedPropertyFacts = {
    tipo_unita: null,
    ristrutturato: false,
    anno_ristrutturazione: null,
    numero_camere: null,
    numero_bagni: null,
    doppia_esposizione: false,
    balconi: null,
    terrazzo: false,
    piano: null,
    ultimo_piano: false,
    ascensore: false,
    portineria: false,
    classe_energetica: null,
    arredato: false,
    cantina: false,
    posto_auto_o_bici: false,
    zona_testuale: null,
    metro_o_trasporti: null
  };

  try {
    const systemPrompt = `Il tuo compito è SOLO estrarre informazioni oggettive dall'annuncio immobiliare.

REGOLE OBBLIGATORIE:
- Non generare frasi o testi descrittivi.
- Non usare linguaggio di marketing.
- Non interpretare o indovinare.
- Se un'informazione non è chiaramente presente, imposta null (per stringhe/numero) o false (per booleani).
- Non aggiungere campi non previsti.

Obiettivo: restituire esclusivamente i dati richiesti nel JSON in modo affidabile e pulito.

Rispondi con un oggetto JSON contenente questi campi:
{
  "tipo_unita": string o null (es. "bilocale", "trilocale", "appartamento", "attico"),
  "ristrutturato": boolean,
  "anno_ristrutturazione": integer o null,
  "numero_camere": integer o null,
  "numero_bagni": integer o null,
  "doppia_esposizione": boolean,
  "balconi": integer o null,
  "terrazzo": boolean,
  "piano": string o null (es. "3", "terra", "rialzato"),
  "ultimo_piano": boolean,
  "ascensore": boolean,
  "portineria": boolean,
  "classe_energetica": string o null (es. "A", "B", "C", "D", "E", "F", "G"),
  "arredato": boolean,
  "cantina": boolean,
  "posto_auto_o_bici": boolean,
  "zona_testuale": string o null (es. "Navigli", "Porta Romana"),
  "metro_o_trasporti": string o null (es. "M2 Porta Genova", "tram 9")
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: testoAnnuncio }
      ],
      max_completion_tokens: 500,
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return { ...defaultResult, ...parsed };
    }
    return defaultResult;
  } catch (error) {
    console.error("Extract property facts error:", error);
    return defaultResult;
  }
}
