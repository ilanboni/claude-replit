import OpenAI from "openai";
import type { Richiesta, Immobile } from "@shared/schema";

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
