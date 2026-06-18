import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { pool } from "./db";
import { 
  insertClienteSchema, insertRichiestaSchema, insertImmobileSchema,
  insertComunicazioneSchema, insertAppuntamentoSchema, insertMatchingSchema,
  insertImmobileEsternoSchema, insertWhatsappCampaignSchema, insertCampaignMessageSchema,
  insertAttivitaClienteSchema, sendCommunicationSchema
} from "@shared/schema";
import { parseRequestWithAI, calculateMatchScore, calculateMatchScoreMercato, generateAICoachMessage, parsePropertyListingWithAI, parsePropertyImageWithAI, generateAcquisitionMessage, generateMirroring, extractPropertyFacts, generateFormContactMessage, extractPhoneFromImage, generateChatCompletion, analyzeClientPersonality } from "./ai-service";
import { whatsappWS } from "./websocket";
import { sendWhatsAppMessage, isUltraMsgConfigured, normalizeItalianPhone } from "./ultramsg";
import { getUnreadEmails, searchPortalEmails, parsePortalEmail, markAsRead, EmailMessage, sendEmail, isGmailConfigured, getEmailsByQuery } from "./gmail-service";
import { processChatbotMessage } from "./services/chatbotService";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { importIdealistaConversations, previewIdealistaConversations, isIdealistaConfigured } from "./idealista-conversations";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
const execAsync = promisify(exec);

// Minimum matching score threshold (30%)
const MIN_MATCHING_SCORE = 30;

// Helper function to generate matching for a single richiesta against all immobili and mercato opportunities
async function generateMatchingForRichiesta(richiestaId: number): Promise<{immobiliMatches: number, mercatoMatches: number}> {
  const richiesta = await storage.getRichiesta(richiestaId);
  if (!richiesta || !richiesta.attiva) return { immobiliMatches: 0, mercatoMatches: 0 };
  
  const [allImmobili, allOpportunita, existingMatches, existingMercatoMatches] = await Promise.all([
    storage.getImmobili(),
    storage.getOpportunitaMercato(),
    storage.getMatching(richiestaId),
    storage.getMatchingOpportunitaByRichiesta(richiestaId),
  ]);
  
  const activeImmobili = allImmobili.filter(i => i.attivo);
  const activeOpportunita = allOpportunita.filter(o => o.stato !== "scartato");
  
  // Track existing matches to avoid duplicates
  const existingImmobiliIds = new Set(existingMatches.map(m => m.immobileId));
  const existingOpportunitaIds = new Set(existingMercatoMatches.map(m => m.opportunitaId));
  
  let immobiliMatches = 0;
  let mercatoMatches = 0;
  
  // Match against immobili
  for (const immobile of activeImmobili) {
    if (existingImmobiliIds.has(immobile.id)) continue;
    const score = calculateMatchScore(richiesta, immobile);
    if (score >= MIN_MATCHING_SCORE) {
      await storage.createMatching({
        richiestaId: richiesta.id,
        immobileId: immobile.id,
        punteggio: score,
      });
      immobiliMatches++;
    }
  }
  
  // Match against mercato opportunities
  for (const opp of activeOpportunita) {
    if (existingOpportunitaIds.has(opp.id)) continue;
    const score = calculateMatchScoreMercato(richiesta, opp);
    if (score >= MIN_MATCHING_SCORE) {
      await storage.createMatchingOpportunita({
        opportunitaId: opp.id,
        richiestaId: richiesta.id,
        punteggio: score,
      });
      mercatoMatches++;
    }
  }
  
  console.log(`[Auto-Matching] Richiesta ${richiestaId}: ${immobiliMatches} immobili, ${mercatoMatches} mercato`);
  return { immobiliMatches, mercatoMatches };
}

// Helper function to generate matching for a new immobile against all richieste
async function generateMatchingForImmobile(immobileId: number): Promise<number> {
  const immobile = await storage.getImmobile(immobileId);
  if (!immobile || !immobile.attivo) return 0;
  
  const [allRichieste, existingMatches] = await Promise.all([
    storage.getRichieste(),
    storage.getMatching(),
  ]);
  
  const activeRichieste = allRichieste.filter(r => r.attiva);
  const existingRichiestaIds = new Set(
    existingMatches.filter(m => m.immobileId === immobileId).map(m => m.richiestaId)
  );
  
  let matchCount = 0;
  
  for (const richiesta of activeRichieste) {
    if (existingRichiestaIds.has(richiesta.id)) continue;
    const score = calculateMatchScore(richiesta, immobile);
    if (score >= MIN_MATCHING_SCORE) {
      await storage.createMatching({
        richiestaId: richiesta.id,
        immobileId: immobile.id,
        punteggio: score,
      });
      matchCount++;
    }
  }
  
  console.log(`[Auto-Matching] Immobile ${immobileId}: ${matchCount} richieste interessate`);
  return matchCount;
}

// Helper function to generate matching for a new mercato opportunity against all richieste
async function generateMatchingForOpportunita(opportunitaId: number): Promise<number> {
  const opportunita = await storage.getOpportunitaMercatoById(opportunitaId);
  if (!opportunita || opportunita.stato === "scartato") return 0;
  
  const [allRichieste, existingMatches] = await Promise.all([
    storage.getRichieste(),
    storage.getMatchingOpportunita(opportunitaId),
  ]);
  
  const activeRichieste = allRichieste.filter(r => r.attiva);
  const existingRichiestaIds = new Set(existingMatches.map(m => m.richiestaId));
  
  let matchCount = 0;
  
  for (const richiesta of activeRichieste) {
    if (existingRichiestaIds.has(richiesta.id)) continue;
    const score = calculateMatchScoreMercato(richiesta, opportunita);
    if (score >= MIN_MATCHING_SCORE) {
      await storage.createMatchingOpportunita({
        opportunitaId: opportunita.id,
        richiestaId: richiesta.id,
        punteggio: score,
      });
      matchCount++;
    }
  }
  
  console.log(`[Auto-Matching] Opportunità ${opportunitaId}: ${matchCount} richieste interessate`);
  return matchCount;
}

// Normalizza numeri di telefono italiani in formato internazionale: 3xx → +393xx
function normalizeItalianPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-]/g, '');
  
  // Rimuovi + se presente per processare
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  
  // Rimuovi eventuale prefisso 0039
  if (cleaned.startsWith('0039')) {
    cleaned = cleaned.slice(4);
  }
  // Rimuovi eventuale prefisso 39 iniziale
  else if (cleaned.startsWith('39') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  }
  
  // Se è un numero italiano (10 cifre che inizia con 3), aggiungi +39
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    return '+39' + cleaned;
  }
  
  // Se già ha 12 cifre con 39, aggiungi solo +
  if (cleaned.length === 12 && cleaned.startsWith('39')) {
    return '+' + cleaned;
  }
  
  return phone.substring(0, 50);
}

// Calcola orario di invio rispettando orari lavorativi (8:30-19:00, lun-ven, fuso orario Italia)
function calculateWorkingHoursSchedule(): Date {
  const minDelayMs = 4 * 60 * 1000;  // 4 minuti
  const maxDelayMs = 25 * 60 * 1000; // 25 minuti
  const delayMs = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
  
  // Orario attuale in Italia (Europe/Rome)
  const now = new Date();
  const italyOffset = getItalyTimezoneOffset(now);
  const italyTime = new Date(now.getTime() + italyOffset);
  
  const hours = italyTime.getUTCHours();
  const minutes = italyTime.getUTCMinutes();
  const dayOfWeek = italyTime.getUTCDay(); // 0=dom, 1=lun, ..., 6=sab
  
  // Orari lavorativi: 8:30 - 19:00
  const workStartHour = 8;
  const workStartMinute = 30;
  const workEndHour = 19;
  const workEndMinute = 0;
  
  const currentTimeMinutes = hours * 60 + minutes;
  const workStartMinutes = workStartHour * 60 + workStartMinute; // 8:30 = 510
  const workEndMinutes = workEndHour * 60 + workEndMinute; // 19:00 = 1140
  
  // Calcola scheduledAt con delay
  let scheduledAt = new Date(now.getTime() + delayMs);
  const scheduledItalyTime = new Date(scheduledAt.getTime() + italyOffset);
  const scheduledHours = scheduledItalyTime.getUTCHours();
  const scheduledMinutes = scheduledItalyTime.getUTCMinutes();
  const scheduledTimeMinutes = scheduledHours * 60 + scheduledMinutes;
  const scheduledDayOfWeek = scheduledItalyTime.getUTCDay();
  
  // Verifica se l'orario schedulato è dentro gli orari lavorativi
  const isWorkingDay = scheduledDayOfWeek >= 1 && scheduledDayOfWeek <= 5; // lun-ven
  const isWorkingHours = scheduledTimeMinutes >= workStartMinutes && scheduledTimeMinutes < workEndMinutes;
  
  if (isWorkingDay && isWorkingHours) {
    // Orario OK, usa scheduledAt calcolato
    console.log(`[Bot IA] Scheduled time ${scheduledHours}:${String(scheduledMinutes).padStart(2, '0')} is within working hours`);
    return scheduledAt;
  }
  
  // Fuori orario: schedula per la prossima mattina lavorativa alle 8:30 + delay random
  console.log(`[Bot IA] Time ${scheduledHours}:${String(scheduledMinutes).padStart(2, '0')} is outside working hours (8:30-19:00)`);
  
  // Calcola quanti giorni aggiungere per arrivare al prossimo giorno lavorativo
  let daysToAdd = 1;
  let nextDay = (scheduledDayOfWeek + 1) % 7;
  
  // Se è dopo le 19 di venerdì, sabato o domenica, vai a lunedì
  while (nextDay === 0 || nextDay === 6) {
    daysToAdd++;
    nextDay = (nextDay + 1) % 7;
  }
  
  // Se siamo prima delle 8:30 di un giorno lavorativo, schedula per oggi alle 8:30
  if (isWorkingDay && currentTimeMinutes < workStartMinutes) {
    daysToAdd = 0;
  }
  
  // Crea data per la prossima mattina lavorativa
  const nextWorkingDay = new Date(italyTime);
  nextWorkingDay.setUTCDate(nextWorkingDay.getUTCDate() + daysToAdd);
  nextWorkingDay.setUTCHours(workStartHour, workStartMinute, 0, 0);
  
  // Aggiungi delay random (4-25 minuti)
  const morningDelayMs = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
  const finalScheduledItalyTime = new Date(nextWorkingDay.getTime() + morningDelayMs);
  
  // Converti da ora Italia a UTC
  const finalScheduledAt = new Date(finalScheduledItalyTime.getTime() - italyOffset);
  
  console.log(`[Bot IA] Rescheduled to next working day: ${finalScheduledAt.toISOString()}`);
  return finalScheduledAt;
}

// Ottieni offset fuso orario Italia (gestisce ora legale/solare)
function getItalyTimezoneOffset(date: Date): number {
  // Crea una data in formato Italia per determinare se è ora legale
  const year = date.getFullYear();
  
  // Ultima domenica di marzo (inizio ora legale)
  const marchLast = new Date(Date.UTC(year, 2, 31));
  while (marchLast.getUTCDay() !== 0) marchLast.setUTCDate(marchLast.getUTCDate() - 1);
  marchLast.setUTCHours(1, 0, 0, 0); // 01:00 UTC = 02:00 CET
  
  // Ultima domenica di ottobre (fine ora legale)
  const octoberLast = new Date(Date.UTC(year, 9, 31));
  while (octoberLast.getUTCDay() !== 0) octoberLast.setUTCDate(octoberLast.getUTCDate() - 1);
  octoberLast.setUTCHours(1, 0, 0, 0); // 01:00 UTC = 03:00 CEST
  
  // Se siamo in periodo di ora legale (CEST), offset = +2 ore
  // Altrimenti ora solare (CET), offset = +1 ora
  if (date >= marchLast && date < octoberLast) {
    return 2 * 60 * 60 * 1000; // +2 ore in ms
  }
  return 1 * 60 * 60 * 1000; // +1 ora in ms
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // ==================== OBJECT STORAGE ROUTES ====================
  registerObjectStorageRoutes(app);

  // ==================== GENERA + INVIA BOZZA WHATSAPP per immobile esterno (workflow estensione) ====================
  app.post("/api/acquisizione/:id/genera-bozza-whatsapp", async (req, res) => {
    try {
      // CORS — necessario perché l'endpoint viene chiamato anche dall'estensione Chrome
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ error: "ID non valido" });
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) return res.status(404).json({ error: "Immobile non trovato" });

      // Costruisco prompt context COMPLETO per mirroring vero
      const dettagli: string[] = [];
      if (immobile.indirizzo) dettagli.push(`Indirizzo: ${immobile.indirizzo}`);
      if (immobile.zona) dettagli.push(`Zona: ${immobile.zona}`);
      if (immobile.mq) dettagli.push(`Superficie: ${immobile.mq} mq`);
      if (immobile.camere) dettagli.push(`Locali: ${immobile.camere}`);
      if (immobile.bagni) dettagli.push(`Bagni: ${immobile.bagni}`);
      if (immobile.piano != null) dettagli.push(`Piano: ${immobile.piano}`);
      if (immobile.pianiEdificio) dettagli.push(`Piani edificio: ${immobile.pianiEdificio}`);
      if (immobile.prezzo) dettagli.push(`Prezzo richiesto: ${Number(immobile.prezzo).toLocaleString("it-IT")} €`);
      if (immobile.classeEnergetica) dettagli.push(`Classe energetica: ${immobile.classeEnergetica}`);
      if (immobile.annoCostruzione) dettagli.push(`Anno costruzione: ${immobile.annoCostruzione}`);
      const dotazioni: string[] = [];
      if (immobile.ascensore) dotazioni.push("ascensore");
      if (immobile.balcone) dotazioni.push("balcone");
      if (immobile.terrazzo) dotazioni.push("terrazzo");
      if (immobile.box) dotazioni.push("box auto");
      if (immobile.cantina) dotazioni.push("cantina");
      if (immobile.giardino) dotazioni.push("giardino");
      if (immobile.arredato) dotazioni.push("arredato");
      if (dotazioni.length) dettagli.push(`Dotazioni: ${dotazioni.join(", ")}`);
      const stati: string[] = [];
      if (immobile.statoNuovo) stati.push("nuovo");
      if (immobile.statoRistrutturato) stati.push("ristrutturato");
      if (immobile.statoBuono) stati.push("buono stato");
      if (immobile.statoDaRistrutturare) stati.push("da ristrutturare");
      if (stati.length) dettagli.push(`Stato: ${stati.join(", ")}`);

      const dettagliBlock = dettagli.join("\n");
      const testoOriginale = (immobile.testoOriginale || immobile.descrizione || "").slice(0, 3000);

      const system = `Sei Paolo Salvemini, collaboratore senior del Dott. Ilan Boni di Cavour Immobiliare, agenzia boutique di Milano. NON dichiarare mai di essere un'AI.

COMPITO: scrivi UN messaggio WhatsApp di primo contatto a un proprietario PRIVATO che ha messo in vendita il suo immobile su un portale. Obiettivo: ottenere un appuntamento in immobile con il Dott. Boni.

DATI ESATTI DELL'IMMOBILE:
${dettagliBlock}

DESCRIZIONE ORIGINALE DELL'ANNUNCIO:
"""
${testoOriginale}
"""

NUMERI DI BUSINESS CAVOUR (dati reali, usali letteralmente, NON inventarne altri):
- 16 appartamenti chiusi nel 2025
- 9 appartamenti chiusi nei primi cinque mesi del 2026
- Oltre la metà venduti al prezzo di richiesta
- Gli altri con trattativa massima del 5%, alcuni addirittura sopra la richiesta iniziale
- Riusciamo a tenere questi numeri grazie a un metodo di vendita di origine americana, ancora poco diffuso in Italia
- Selettività: accettiamo un incarico solo quando immobile e venditore permettono di chiudere a prezzo. Non prendiamo tutto, per scelta.

STRUTTURA OBBLIGATORIA (prosa naturale, niente markdown, niente header, niente bullet):

PARAGRAFO 1 — saluto + presentazione.
- Se nel testo dell'annuncio compare un nome proprio del proprietario (es. "Paolo", "Marco", "Anna"), usa "Buongiorno Nome,". Altrimenti "Buongiorno,".
- Subito dopo: "sono Paolo Salvemini di Cavour Immobiliare, agenzia boutique di Milano."

PARAGRAFO 2 — acknowledgment "astenersi agenzie". SOLO se nel testo dell'annuncio compaiono frasi come "astenersi agenzie", "no agenzie", "vendita da privato", "solo privati" o simili: scrivi "Ho visto 'astenersi agenzie' e la rispetto. Proprio per questo le scrivo in modo diretto." Se NON ci sono frasi di esclusione delle agenzie: SALTA completamente questo paragrafo.

PARAGRAFO 3 — numeri + metodo + selettività. Esponi nell'ordine: i numeri Cavour (16 nel 2025, 9 nei primi cinque mesi 2026, oltre metà a prezzo, max -5% o sopra). Poi spiega che riuscite a tenerli grazie a "un metodo di vendita di origine americana, ancora poco diffuso in Italia". Concludi con la selettività in questi termini: "Funziona però solo a condizioni specifiche, e per questo siamo selettivi: accettiamo un incarico solo quando l'immobile e la situazione del venditore ci permettono di chiudere a prezzo. Non prendiamo tutto, per scelta."

PARAGRAFO 4 — mirroring + candidatura. Cita 3-4 dettagli SPECIFICI dell'immobile tratti dai dati e dalla descrizione originale (es. indirizzo + mq + stato + caratteristica distintiva come "arredo nuovo mai utilizzato" o "palazzo signorile fine Ottocento" o "doppia esposizione"). Chiudi con: "è un profilo che, sulla carta, potrebbe rientrare in quel criterio. Vorrei valutarlo seriamente prima di dirle se ha senso fare un passo insieme."

PARAGRAFO 5 — close.
"Le propongo un appuntamento in immobile con il Dott. Boni: trenta minuti, senza impegno. Boni vede di persona se le condizioni ci sono e le spiega come funziona il metodo. Mi dica un paio di disponibilità nei prossimi giorni."

FIRMA — due righe esatte:
Paolo Salvemini
Cavour Immobiliare

REGOLE DURE:

1. VIETATE queste frasi e qualunque loro variante (cliché di acquisizione che generano diffidenza):
   - "abbiamo clienti che cercano"
   - "famiglie che seguiamo"
   - "i nostri acquirenti"
   - "la nostra rete di compratori"
   - "acquirenti già qualificati pronti a visitare"
   - "stiamo cercando proprio un immobile come il suo"
   - "abbiamo un cliente interessato"
   - "ho/abbiamo in mente qualcuno"
   - "valutazione gratuita"
   - "analisi senza impegno"

2. NESSUN claim di expertise su zona/quartiere ("conosciamo bene la zona", "operiamo molto in zona X") se non verificabile. Di default OMETTI.

3. NESSUN claim economico vago ("possiamo ottenere di più", "valorizziamo al massimo"). I numeri parlano da soli.

4. NON nominare mai il nome del metodo (es. "open house", "doppia asta"). Resta curiosity gap che il proprietario scopre SOLO in visita con Boni. Riferirsi al metodo solo come "metodo di vendita di origine americana".

5. NESSUNA emoji. NESSUN markdown (no asterischi, no grassetto, no header, no bullet). Solo prosa naturale.

6. NON menzionare commissioni, sconti, esclusiva o termini contrattuali.

7. Lunghezza target: 150-200 parole.

8. Tono: rispettoso, professionale, asciutto. Mai servile, mai gergale, mai cinico.

Scrivi ORA il messaggio finito, solo il testo, senza preamboli né commenti.`;

      // Check storico contatti per evitare duplicati (cerca cliente associato al telefono)
      let ultimoContatto: any = null;
      try {
        const tel9 = (immobile.contattoTelefono || "").replace(/\D/g, "").slice(-9);
        const r = await pool.query(
          `SELECT c.data_ora, c.canale, c.tipo, c.creato_da, LEFT(c.testo, 200) AS testo,
                  cl.id AS cliente_id, cl.nome, cl.cognome
           FROM comunicazioni c
           LEFT JOIN clienti cl ON cl.id = c.cliente_id
           WHERE c.data_ora IS NOT NULL
             AND (
               c.immobile_esterno_id = $1
               OR (cl.telefono IS NOT NULL AND $2 != '' AND regexp_replace(cl.telefono, '\\D', '', 'g') ILIKE '%' || $2 || '%')
             )
           ORDER BY c.data_ora DESC
           LIMIT 3`,
          [immobile.id, tel9],
        );
        if (r.rowCount && r.rowCount > 0) {
          ultimoContatto = r.rows[0];
        }
      } catch (e) {
        console.warn("[Bozza] check storico fallito:", e);
      }

      // Uso il client Anthropic già configurato
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurata" });
      const client = new Anthropic({ apiKey });
      const completion = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: "Genera ora il messaggio." }],
      });
      const block = completion.content[0];
      const testo = block && block.type === "text" ? block.text.trim() : "";
      if (!testo) return res.status(500).json({ error: "Generazione AI vuota" });
      res.json({
        ok: true,
        testo,
        telefono: immobile.contattoTelefono || null,
        email: immobile.contattoEmail || null,
        ultimoContatto,
      });
    } catch (error: any) {
      console.error("Genera bozza error:", error);
      res.status(500).json({ error: "Errore generazione bozza", detail: error?.message });
    }
  });

  // CORS preflight per genera-bozza-whatsapp (estensione Chrome)
  app.options("/api/acquisizione/:id/genera-bozza-whatsapp", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(204);
  });

  app.post("/api/acquisizione/:id/invia-whatsapp", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!id) return res.status(400).json({ error: "ID non valido" });
      const { testo, telefono: telefonoBody } = req.body || {};
      if (!testo || typeof testo !== "string" || testo.trim().length < 10) {
        return res.status(400).json({ error: "Testo mancante o troppo breve" });
      }
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) return res.status(404).json({ error: "Immobile non trovato" });
      const telefonoRaw = (telefonoBody || immobile.contattoTelefono || "").toString();
      const telefono = normalizeItalianPhone(telefonoRaw);
      if (!telefono) return res.status(400).json({ error: "Numero di telefono non disponibile" });

      // Anti-duplicato: blocca se c'è stato un contatto negli ultimi 30 giorni
      // (override possibile passando { force: true } nel body)
      const forceOverride = !!(req.body && req.body.force);
      if (!forceOverride) {
        try {
          const tel9 = telefono.replace(/\D/g, "").slice(-9);
          const dup = await pool.query(
            `SELECT c.data_ora, c.canale, c.tipo, LEFT(c.testo, 200) AS testo, cl.nome, cl.cognome
             FROM comunicazioni c
             LEFT JOIN clienti cl ON cl.id = c.cliente_id
             WHERE c.data_ora IS NOT NULL
               AND c.data_ora > NOW() - INTERVAL '30 days'
               AND (
                 c.immobile_esterno_id = $1
                 OR (cl.telefono IS NOT NULL AND $2 != '' AND regexp_replace(cl.telefono, '\\D', '', 'g') ILIKE '%' || $2 || '%')
               )
             ORDER BY c.data_ora DESC LIMIT 1`,
            [id, tel9],
          );
          if (dup.rowCount && dup.rowCount > 0) {
            const c = dup.rows[0];
            return res.status(409).json({
              error: "Contatto recente già presente",
              ultimoContatto: c,
              hint: "Per inviare comunque, riprova con { force: true }",
            });
          }
        } catch (e) {
          console.warn("[Invio] check duplicato fallito, proseguo:", e);
        }
      }

      // Invio diretto via UltraMsg
      const sent = await sendWhatsAppMessage(`+${telefono.replace(/^\+/, "")}`, testo);
      if (!sent || !sent.ok) {
        return res.status(500).json({ error: "Invio WhatsApp fallito", detail: sent });
      }

      // Marca immobile come contattato
      try {
        await pool.query(
          `UPDATE immobili_esterni
           SET stato_contatto = 'inviato',
               data_contatto = NOW(),
               messaggio_inviato = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [testo.slice(0, 4000), id],
        );
      } catch {}

      // SYNC: registra l'invio in casafari_outreach cosi' appare nel Kanban Pipeline.
      try {
        let casafariTargetId: string | null = null;
        const addr = (immobile.indirizzo || immobile.titolo || "").toLowerCase().trim();
        if (addr.length >= 6) {
          const cf = await pool.query(
            `SELECT id::text AS id FROM casafari_target_immobili
             WHERE LOWER(COALESCE(indirizzo, '')) LIKE '%' || $1 || '%'
                OR $1 LIKE '%' || LOWER(COALESCE(indirizzo, '')) || '%'
             ORDER BY created_at DESC LIMIT 1`,
            [addr.slice(0, 60)],
          );
          casafariTargetId = cf.rows[0]?.id || null;
        }
        await pool.query(
          `INSERT INTO casafari_outreach
            (target_immobile_id, immobile_esterno_id, scenario, tipo,
             destinatario_telefono, destinatario_nome, destinatario_email,
             testo_proposto, testo_inviato, stato, inviato_at)
           VALUES ($1, $2, NULL, 'whatsapp_acquisizione', $3, $4, $5, $6, $6, 'inviato', NOW())`,
          [
            casafariTargetId,
            id,
            telefono,
            immobile.contattoNome || null,
            immobile.contattoEmail || null,
            testo.slice(0, 4000),
          ],
        );
      } catch (syncErr) {
        console.warn("[Invio] Sync casafari_outreach fallito (non bloccante):", syncErr);
      }

      res.json({ ok: true, telefono, message_id: sent?.id || null });
    } catch (error: any) {
      console.error("Invio WhatsApp acquisizione error:", error);
      res.status(500).json({ error: "Errore invio", detail: error?.message });
    }
  });

  // ==================== BOZZE CASAFARI OUTREACH (raw SQL: tabella gestita da Cavour-Meta) ====================
  app.get("/api/casafari-bozze", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          o.id::text AS id,
          o.tipo,
          o.stato,
          o.destinatario_nome,
          o.destinatario_telefono,
          o.destinatario_email,
          o.testo_proposto,
          o.scenario,
          o.created_at,
          t.indirizzo,
          t.civico,
          t.zona,
          t.mq,
          t.prezzo_corrente,
          t.url_casafari
        FROM casafari_outreach o
        LEFT JOIN casafari_target_immobili t ON t.id = o.target_immobile_id
        WHERE o.stato IN ('proposto', 'approvato', 'attesa_invio')
        ORDER BY o.created_at DESC
        LIMIT 200
      `);
      res.json(result.rows);
    } catch (error: any) {
      console.error("Get casafari-bozze error:", error);
      res.status(500).json({ error: "Errore nel recupero delle bozze", detail: error.message });
    }
  });

  app.post("/api/casafari-bozze/:id/approva", async (req, res) => {
    try {
      const { id } = req.params;
      const { testo, force } = req.body || {};

      // ANTI-DUP: blocca se telefono gia contattato negli ultimi 30gg. Override con { force: true }.
      if (!force) {
        try {
          const bRes = await pool.query(
            `SELECT destinatario_telefono FROM casafari_outreach WHERE id::text = $1`,
            [id],
          );
          const tel = bRes.rows[0]?.destinatario_telefono || "";
          const tel9 = tel.replace(/\D/g, "").slice(-9);
          if (tel9) {
            const dup1 = await pool.query(
              `SELECT id, destinatario_nome, inviato_at
               FROM casafari_outreach
               WHERE id::text != $1
                 AND stato = 'inviato'
                 AND inviato_at > NOW() - INTERVAL '30 days'
                 AND regexp_replace(COALESCE(destinatario_telefono,''), '\\D', '', 'g') ILIKE '%' || $2 || '%'
               ORDER BY inviato_at DESC LIMIT 1`,
              [id, tel9],
            );
            if (dup1.rowCount && dup1.rowCount > 0) {
              const d = dup1.rows[0];
              return res.status(409).json({
                error: "Telefono gia contattato di recente (Casafari)",
                ultimoContatto: { tipo: "casafari_outreach", data: d.inviato_at, nome: d.destinatario_nome },
                hint: "Per mandare lo stesso, riprova con { force: true }",
              });
            }
            const dup2 = await pool.query(
              `SELECT c.data_ora, c.canale, c.tipo, cl.nome, cl.cognome
               FROM comunicazioni c
               JOIN clienti cl ON cl.id = c.cliente_id
               WHERE c.data_ora > NOW() - INTERVAL '30 days'
                 AND regexp_replace(COALESCE(cl.telefono,''), '\\D', '', 'g') ILIKE '%' || $1 || '%'
               ORDER BY c.data_ora DESC LIMIT 1`,
              [tel9],
            );
            if (dup2.rowCount && dup2.rowCount > 0) {
              const d = dup2.rows[0];
              return res.status(409).json({
                error: "Telefono gia contattato di recente (comunicazione diretta)",
                ultimoContatto: { tipo: "comunicazione", data: d.data_ora, canale: d.canale, nome: `${d.nome||''} ${d.cognome||''}`.trim() },
                hint: "Per mandare lo stesso, riprova con { force: true }",
              });
            }
          }
        } catch (dupErr) {
          console.warn("[Approva] anti-dup check fallito (proseguo):", dupErr);
        }
      }

      const fields = testo
        ? [`stato = 'approvato'`, `testo_proposto = $2`]
        : [`stato = 'approvato'`];
      const params: any[] = [id];
      if (testo) params.push(String(testo));
      const r = await pool.query(
        `UPDATE casafari_outreach SET ${fields.join(", ")} WHERE id::text = $1 RETURNING id, stato`,
        params,
      );
      if (r.rowCount === 0) return res.status(404).json({ error: "Bozza non trovata" });
      res.json({ ok: true, id: r.rows[0].id, stato: r.rows[0].stato });
    } catch (error: any) {
      console.error("Approva bozza error:", error);
      res.status(500).json({ error: "Errore approva bozza", detail: error.message });
    }
  });

  app.post("/api/casafari-bozze/:id/scarta", async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body || {};
      const r = await pool.query(
        `UPDATE casafari_outreach SET stato = 'scartato' WHERE id::text = $1 RETURNING id`,
        [id],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: "Bozza non trovata" });
      res.json({ ok: true, id: r.rows[0].id, stato: "scartato", motivo: motivo || null });
    } catch (error: any) {
      console.error("Scarta bozza error:", error);
      res.status(500).json({ error: "Errore scarta bozza", detail: error.message });
    }
  });

  // ==================== RICERCA GLOBALE ====================
  app.get("/api/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.json({ clienti: [], immobili: [], richieste: [] });
      }

      const [clienti, immobili, richieste] = await Promise.all([
        storage.getClienti(),
        storage.getImmobili(),
        storage.getRichieste(),
      ]);

      const clientiResults = clienti
        .filter(c => 
          c.nome.toLowerCase().includes(query) ||
          c.cognome.toLowerCase().includes(query) ||
          (c.email && c.email.toLowerCase().includes(query)) ||
          (c.telefono && c.telefono.includes(query))
        )
        .slice(0, 5)
        .map(c => ({ id: c.id, type: 'cliente' as const, label: `${c.nome} ${c.cognome}`, sublabel: c.email || c.telefono }));

      const immobiliResults = immobili
        .filter(i => 
          i.titolo.toLowerCase().includes(query) ||
          (i.zona && i.zona.toLowerCase().includes(query)) ||
          (i.indirizzo && i.indirizzo.toLowerCase().includes(query))
        )
        .slice(0, 5)
        .map(i => ({ id: i.id, type: 'immobile' as const, label: i.titolo, sublabel: i.zona || i.indirizzo }));

      const richiesteResults = richieste
        .filter(r => 
          (r.zona && r.zona.toLowerCase().includes(query)) ||
          (r.descrizioneLibera && r.descrizioneLibera.toLowerCase().includes(query))
        )
        .slice(0, 5)
        .map(r => ({ id: r.id, type: 'richiesta' as const, label: `Richiesta #${r.id}`, sublabel: r.zona || 'Zona non specificata' }));

      res.json({ clienti: clientiResults, immobili: immobiliResults, richieste: richiesteResults });
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Errore nella ricerca" });
    }
  });

  // ==================== NOTIFICHE ====================
  app.get("/api/notifiche", async (req, res) => {
    try {
      const [clienti, appuntamenti, notificheDB] = await Promise.all([
        storage.getClienti(),
        storage.getAppuntamenti(),
        storage.getNotifiche(false),
      ]);

      const oggi = new Date();
      const domani = new Date(oggi);
      domani.setDate(domani.getDate() + 1);
      const traUnSettimana = new Date(oggi);
      traUnSettimana.setDate(traUnSettimana.getDate() + 7);

      // Appuntamenti prossimi 24 ore
      const appuntamentiImminenti = appuntamenti
        .filter(a => {
          const d = new Date(a.dataOra);
          return d >= oggi && d <= domani && !a.completato;
        })
        .map(a => ({
          tipo: 'appuntamento' as const,
          id: a.id,
          messaggio: `Appuntamento ${a.confermato ? 'confermato' : 'da confermare'}`,
          dettaglio: a.luogo || 'Luogo da definire',
          data: a.dataOra,
          letta: false,
        }));

      // Compleanni prossimi 7 giorni
      const compleanni = clienti
        .filter(c => c.compleanno && c.attivo)
        .filter(c => {
          const compleanno = new Date(c.compleanno!);
          const questAnno = new Date(oggi.getFullYear(), compleanno.getMonth(), compleanno.getDate());
          if (questAnno < oggi) {
            questAnno.setFullYear(questAnno.getFullYear() + 1);
          }
          return questAnno >= oggi && questAnno <= traUnSettimana;
        })
        .map(c => {
          const compleanno = new Date(c.compleanno!);
          const questAnno = new Date(oggi.getFullYear(), compleanno.getMonth(), compleanno.getDate());
          if (questAnno < oggi) questAnno.setFullYear(questAnno.getFullYear() + 1);
          return {
            tipo: 'compleanno' as const,
            id: c.id,
            messaggio: `Compleanno di ${c.nome} ${c.cognome}`,
            dettaglio: questAnno.toDateString() === oggi.toDateString() ? 'Oggi!' : questAnno.toLocaleDateString('it-IT'),
            data: questAnno.toISOString(),
            letta: false,
          };
        });

      // Notifiche persistenti dal database (richieste visita, etc)
      const notifichePersistenti = notificheDB.map(n => ({
        tipo: n.tipo as string,
        id: n.id,
        messaggio: n.titolo,
        dettaglio: n.messaggio || '',
        data: n.createdAt.toISOString(),
        letta: n.letta,
        clienteId: n.clienteId,
        immobileId: n.immobileId,
        priorita: n.priorita,
      }));

      res.json([...notifichePersistenti, ...appuntamentiImminenti, ...compleanni].sort((a, b) => 
        new Date(b.data).getTime() - new Date(a.data).getTime()
      ));
    } catch (error) {
      console.error("Notifiche error:", error);
      res.status(500).json({ error: "Errore nel recupero delle notifiche" });
    }
  });

  app.get("/api/notifiche/non-lette", async (req, res) => {
    try {
      const notifiche = await storage.getNotificheNonLette();
      res.json(notifiche);
    } catch (error) {
      console.error("Notifiche non lette error:", error);
      res.status(500).json({ error: "Errore nel recupero delle notifiche" });
    }
  });

  // Debug endpoint per testare query Gmail
  app.get("/api/gmail/debug-query", async (req, res) => {
    try {
      const query = req.query.q as string || 'is:unread newer_than:3d';
      const maxResults = parseInt(req.query.max as string) || 20;
      const emails = await getEmailsByQuery(query, maxResults);
      res.json({
        query,
        count: emails.length,
        emails: emails.map(e => ({
          id: e.id,
          from: e.from,
          subject: e.subject,
          date: e.date,
          snippet: e.snippet?.slice(0, 150)
        }))
      });
    } catch (error) {
      console.error("Gmail debug error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  app.patch("/api/notifiche/:id/letta", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notifica = await storage.updateNotifica(id, { letta: true });
      res.json(notifica);
    } catch (error) {
      console.error("Marca notifica letta error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento della notifica" });
    }
  });

  app.patch("/api/notifiche/:id/archivia", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notifica = await storage.updateNotifica(id, { archiviata: true });
      res.json(notifica);
    } catch (error) {
      console.error("Archivia notifica error:", error);
      res.status(500).json({ error: "Errore nell'archiviazione della notifica" });
    }
  });

  app.delete("/api/notifiche/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNotifica(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Elimina notifica error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione della notifica" });
    }
  });

  // ============ TASKS (Promemoria con sync Calendar) ============
  app.get("/api/tasks", async (req, res) => {
    try {
      const stato = req.query.stato as string | undefined;
      const tasks = await storage.getTasks(stato);
      res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Errore nel recupero dei task" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ error: "Task non trovato" });
      }
      res.json(task);
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({ error: "Errore nel recupero del task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const { syncCalendar, ...taskData } = req.body;
      
      // Converti scadenza da stringa ISO a Date se presente
      if (taskData.scadenza && typeof taskData.scadenza === 'string') {
        taskData.scadenza = new Date(taskData.scadenza);
      }
      
      const task = await storage.createTask(taskData);
      
      // Se syncCalendar è true e c'è una scadenza, crea evento calendario
      if (syncCalendar && task.scadenza) {
        try {
          const { createCalendarEvent, getOAuthClient } = await import("./calendar-service");
          const oauthClient = await getOAuthClient();
          
          if (oauthClient) {
            const endDate = new Date(task.scadenza);
            endDate.setHours(endDate.getHours() + 1);
            
            const calendarEvent = await createCalendarEvent(oauthClient, {
              summary: `[Task] ${task.titolo}`,
              description: task.descrizione || "",
              start: { dateTime: new Date(task.scadenza).toISOString() },
              end: { dateTime: endDate.toISOString() },
            });
            
            if (calendarEvent?.id) {
              await storage.updateTask(task.id, {
                calendarEventId: calendarEvent.id,
                calendarSyncStatus: "synced"
              });
              task.calendarEventId = calendarEvent.id;
              task.calendarSyncStatus = "synced";
            }
          }
        } catch (calendarError) {
          console.error("Calendar sync error:", calendarError);
          await storage.updateTask(task.id, { calendarSyncStatus: "failed" });
        }
      }
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Errore nella creazione del task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { syncCalendar, ...updateData } = req.body;
      
      // Converti scadenza da stringa ISO a Date se presente
      if (updateData.scadenza && typeof updateData.scadenza === 'string') {
        updateData.scadenza = new Date(updateData.scadenza);
      }
      
      // Se il task viene completato, aggiungi completatoAt
      if (updateData.stato === "completato") {
        updateData.completatoAt = new Date();
      }
      
      const task = await storage.updateTask(id, updateData);
      res.json(task);
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento del task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTask(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione del task" });
    }
  });

  // Endpoint per ottenere messaggi recenti (WhatsApp + Email) per dashboard
  app.get("/api/dashboard/messaggi-recenti", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Ottieni le ultime comunicazioni (email e whatsapp)
      const comunicazioni = await storage.getComunicazioni();
      const recentComunicazioni = comunicazioni
        .filter(c => c.tipo === "email" || c.tipo === "whatsapp")
        .slice(0, limit);
      
      // Arricchisci con dati cliente
      const messaggiArricchiti = await Promise.all(
        recentComunicazioni.map(async (com) => {
          let clienteNome = null;
          if (com.clienteId) {
            const cliente = await storage.getCliente(com.clienteId);
            clienteNome = cliente ? `${cliente.nome || ""} ${cliente.cognome || ""}`.trim() : null;
          }
          return {
            ...com,
            clienteNome
          };
        })
      );
      
      res.json(messaggiArricchiti);
    } catch (error) {
      console.error("Get messaggi recenti error:", error);
      res.status(500).json({ error: "Errore nel recupero dei messaggi recenti" });
    }
  });

  app.post("/api/notifiche/import-email", async (req, res) => {
    try {
      const { manualImportEmails } = await import("./email-import-worker");
      const result = await manualImportEmails();
      res.json(result);
    } catch (error) {
      console.error("Import email error:", error);
      res.status(500).json({ error: "Errore nell'importazione delle email" });
    }
  });

  // ==================== APPROVAZIONI MOBILE DIRETTE ====================
  // Permettono di chiudere le decisioni dalla Home PWA senza aprire Telegram.
  // Riusano la logica dei comandi gia' presente in Cavour-Meta via webhook simulato.

  // Bozza CRM: ok/scarta/modifica/togli
  app.post("/api/decisione/bozza-crm/:short_id", async (req, res) => {
    try {
      const { action, payload } = req.body as { action: string; payload?: string };
      const { short_id } = req.params;
      // Leggo bozze pending
      const r = await pool.query(
        `SELECT value FROM system_config WHERE key='paolo_bozze_pending' LIMIT 1`
      );
      let bozze: any[] = [];
      try { bozze = JSON.parse(r.rows[0]?.value || "[]"); } catch {}
      const idx = bozze.findIndex((b: any) => (b.id || "").toUpperCase() === short_id.toUpperCase());
      if (idx < 0) return res.status(404).json({ error: "Bozza non trovata" });
      const bozza = bozze[idx];
      let testoFinale = bozza.bozza;
      if (action === "togli" && payload) {
        testoFinale = (testoFinale || "").replace(new RegExp(payload.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "gi"), "").replace(/\s+/g, " ").trim();
      } else if (action === "modifica" && payload) {
        testoFinale = payload;
      } else if (action === "scarta") {
        bozza.stato = "scartato";
        bozze[idx] = bozza;
        await pool.query(
          `UPDATE system_config SET value=$1, updated_at=NOW() WHERE key='paolo_bozze_pending'`,
          [JSON.stringify(bozze)]
        );
        return res.json({ ok: true, action: "scartato" });
      } else if (action !== "ok") {
        return res.status(400).json({ error: "action non valida" });
      }

      // Accoda invio: aggiungo a paolo_azioni_programmate
      const ra = await pool.query(
        `SELECT value FROM system_config WHERE key='paolo_azioni_programmate' LIMIT 1`
      );
      let azioni: any[] = [];
      try { azioni = JSON.parse(ra.rows[0]?.value || "[]"); } catch {}
      azioni.push({
        id: Math.random().toString(36).slice(2, 8),
        tipo: "risposta_paolo_inbound",
        telefono: (bozza.telefono || "").replace(/^\+/, ""),
        nome_lead: bozza.nome,
        messaggio: testoFinale,
        scheduled_at: new Date().toISOString(),
        stato: "in_attesa",
        origine: `crm_bozza_${action}_${short_id}`,
        creato_at: new Date().toISOString(),
      });
      await pool.query(
        `INSERT INTO system_config(key,value,updated_at) VALUES('paolo_azioni_programmate',$1,NOW())
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
        [JSON.stringify(azioni)]
      );
      bozza.stato = "approvato";
      bozza.testo_finale = testoFinale;
      bozze[idx] = bozza;
      await pool.query(
        `UPDATE system_config SET value=$1, updated_at=NOW() WHERE key='paolo_bozze_pending'`,
        [JSON.stringify(bozze)]
      );
      res.json({ ok: true, action: "accodato_invio", testo: testoFinale });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Tasks_ilan: fatto/scarta/rinvia
  app.post("/api/decisione/task/:short_id", async (req, res) => {
    try {
      const { action, rinvia_giorni } = req.body as { action: string; rinvia_giorni?: number };
      const { short_id } = req.params;
      if (action === "fatto") {
        await pool.query(
          `UPDATE tasks_ilan SET stato='fatto', fatto_at=NOW() WHERE short_id=$1 AND stato='attivo'`,
          [short_id.toUpperCase()]
        );
      } else if (action === "scarta") {
        await pool.query(
          `UPDATE tasks_ilan SET stato='scartato', motivo_chiusura='scartato_da_ui' WHERE short_id=$1`,
          [short_id.toUpperCase()]
        );
      } else if (action === "rinvia") {
        const days = Math.max(1, Math.min(60, rinvia_giorni || 3));
        const target = new Date(Date.now() + days * 86400_000);
        await pool.query(
          `UPDATE tasks_ilan SET scheduled_at=$1, stato='attivo' WHERE short_id=$2`,
          [target.toISOString(), short_id.toUpperCase()]
        );
      } else {
        return res.status(400).json({ error: "action non valida" });
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Outreach approvazione: approva/scarta
  app.post("/api/decisione/outreach/:uuid", async (req, res) => {
    try {
      const { action, motivo } = req.body as { action: string; motivo?: string };
      const { uuid } = req.params;
      if (action === "approva") {
        await pool.query(
          `UPDATE casafari_outreach
           SET stato='approvato', motivo_approvazione=COALESCE(motivo_approvazione,$2)
           WHERE id=$1`,
          [uuid, motivo || "approvato_da_ui_mobile"]
        );
      } else if (action === "scarta") {
        await pool.query(`UPDATE casafari_outreach SET stato='scartato' WHERE id=$1`, [uuid]);
      } else {
        return res.status(400).json({ error: "action non valida" });
      }
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Drip: manda/scarta
  app.post("/api/decisione/drip/:drip_id", async (req, res) => {
    try {
      const { action } = req.body as { action: string };
      const { drip_id } = req.params;
      const r = await pool.query(
        `SELECT value FROM system_config WHERE key='paolo_azioni_programmate' LIMIT 1`
      );
      let azioni: any[] = [];
      try { azioni = JSON.parse(r.rows[0]?.value || "[]"); } catch {}
      const idx = azioni.findIndex((a: any) => a.id === drip_id);
      if (idx < 0) return res.status(404).json({ error: "Drip non trovato" });
      if (action === "manda") {
        azioni[idx].stato = "in_attesa";
        azioni[idx].scheduled_at = new Date().toISOString();
      } else if (action === "scarta") {
        azioni[idx].stato = "scartato";
      } else {
        return res.status(400).json({ error: "action non valida" });
      }
      await pool.query(
        `UPDATE system_config SET value=$1, updated_at=NOW() WHERE key='paolo_azioni_programmate'`,
        [JSON.stringify(azioni)]
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== PLURICONDIVISI ====================
  app.get("/api/pluricondivisi", async (req, res) => {
    try {
      const stato = (req.query.stato as string) || "all"; // all | proposto | proprietario_trovato | bozza_pronta | contattato | chiuso | scartato
      let q = `SELECT id, short_id, indirizzo, zona, mq, locali, prezzo, num_agenzie,
                      lista_agenzie, score_priorita, giorni_sul_mercato, stato,
                      proprietario_nome, proprietario_cognome, proprietario_telefono,
                      contattato_at, esito_finale, primo_visto, briefing_inviato_at
               FROM immobili_pluricondivisi
               WHERE attivo = true`;
      const params: any[] = [];
      if (stato !== "all" && stato !== "aperti") {
        params.push(stato);
        q += ` AND stato = $${params.length}`;
      } else if (stato === "aperti") {
        q += ` AND stato NOT IN ('chiuso','scartato')`;
      }
      q += ` ORDER BY score_priorita DESC, primo_visto DESC LIMIT 200`;
      const r = await pool.query(q, params);
      res.json(r.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/pluricondivisi/:short_id", async (req, res) => {
    try {
      const r = await pool.query(
        `SELECT * FROM immobili_pluricondivisi WHERE short_id = $1 LIMIT 1`,
        [req.params.short_id.toUpperCase()]
      );
      if (!r.rows[0]) return res.status(404).json({ error: "not found" });
      res.json(r.rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== TASKS_ILAN (promemoria) ====================
  app.get("/api/tasks-ilan", async (req, res) => {
    try {
      const stato = (req.query.stato as string) || "attivo";
      const r = await pool.query(
        `SELECT short_id, tipo, descrizione, nome_riferimento, telefono,
                scheduled_at, priorita, origine, origine_dettaglio, stato, fatto_at
         FROM tasks_ilan WHERE stato = $1
         ORDER BY priorita ASC, scheduled_at ASC LIMIT 100`,
        [stato]
      );
      res.json(r.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== SYSTEM CONFIG (settings reali) ====================
  app.get("/api/config", async (_req, res) => {
    try {
      const r = await pool.query(
        `SELECT key, value, updated_at FROM system_config
         WHERE key IN (
           'paolo_pausa_until','casafari_outreach_fase','casafari_drafter_enabled',
           'casafari_max_outreach_giornalieri','cavour_max_mandati',
           'cavour_telefono_paolo_whatsapp','cavour_vendite_anno_corrente',
           'cavour_vendite_anno_precedente','cavour_giorni_medi_vendita',
           'referral_abilitato','referral_giorni_dopo_rogito',
           'incentivo_referral','template_referral_richiesta',
           'paolo_risponde_sempre'
         )`
      );
      const map: Record<string, any> = {};
      for (const row of r.rows) {
        map[row.key] = { value: row.value, updated_at: row.updated_at };
      }
      res.json(map);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/config/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const allowedKeys = [
        "paolo_pausa_until", "casafari_outreach_fase", "casafari_drafter_enabled",
        "casafari_max_outreach_giornalieri", "cavour_max_mandati",
        "referral_abilitato", "referral_giorni_dopo_rogito",
        "incentivo_referral", "template_referral_richiesta",
        "paolo_risponde_sempre"
      ];
      if (!allowedKeys.includes(key)) {
        return res.status(400).json({ error: "key non modificabile da UI" });
      }
      await pool.query(
        `INSERT INTO system_config (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, String(value ?? "")]
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== HOME OGGI (PWA mobile-first) ====================
  // Endpoint unico per la nuova homepage. Aggrega in una chiamata tutto cio'
  // che serve per le 4 sezioni: Decisioni / Opportunita / Oggi / Recap.
  app.get("/api/home/oggi", async (_req, res) => {
    try {
      const now = new Date();
      const inizioOggi = new Date(now); inizioOggi.setHours(0, 0, 0, 0);
      const fineOggi = new Date(now); fineOggi.setHours(23, 59, 59, 999);
      const inizioIeri = new Date(inizioOggi); inizioIeri.setDate(inizioIeri.getDate() - 1);
      const ventiquattroreFa = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        bozzeCrmPending,
        dripPending,
        outreachApproval,
        pluricondivisi,
        matchClienti,
        leadCaldi,
        appuntamentiOggi,
        tasksIlan,
        recapIeri,
      ] = await Promise.all([
        // 1) Bozze CRM pending (system_config.paolo_bozze_pending)
        pool.query(
          `SELECT value FROM system_config WHERE key='paolo_bozze_pending' LIMIT 1`
        ).then(r => {
          try {
            const arr = JSON.parse(r.rows[0]?.value || "[]");
            return arr.filter((b: any) => b.stato === "in_attesa_ilan").slice(0, 5);
          } catch { return []; }
        }).catch(() => []),

        // 2) Drip post-appuntamento in attesa ok
        pool.query(
          `SELECT value FROM system_config WHERE key='paolo_azioni_programmate' LIMIT 1`
        ).then(r => {
          try {
            const arr = JSON.parse(r.rows[0]?.value || "[]");
            return arr.filter((a: any) => a.stato === "in_attesa_ilan").slice(0, 5);
          } catch { return []; }
        }).catch(() => []),

        // 3) Outreach approvazione esplicita
        pool.query(
          `SELECT o.id, o.destinatario_nome, o.destinatario_telefono, o.tipo,
                  o.motivo_approvazione, o.created_at, o.testo_proposto,
                  COALESCE(t.indirizzo, e.indirizzo)        AS indirizzo,
                  COALESCE(t.zona, e.zona)                  AS zona,
                  COALESCE(t.url_casafari, e.url_annuncio)  AS listing_url
           FROM casafari_outreach o
           LEFT JOIN casafari_target_immobili t ON t.id = o.target_immobile_id
           LEFT JOIN immobili_esterni e        ON e.id = o.immobile_esterno_id
           WHERE o.stato='proposto' AND o.richiede_approvazione=true
           ORDER BY o.created_at ASC LIMIT 8`
        ).then(r => r.rows).catch(() => []),

        // 4) Pluricondivisi TOP 3 nuovi
        pool.query(
          `SELECT short_id, indirizzo, zona, mq, prezzo, num_agenzie, score_priorita,
                  giorni_sul_mercato, lista_agenzie
           FROM immobili_pluricondivisi
           WHERE attivo=true AND stato='proposto'
           ORDER BY score_priorita DESC LIMIT 3`
        ).then(r => r.rows).catch(() => []),

        // 5) Match mercato clienti ultime 24h
        pool.query(
          `SELECT cliente_id, indirizzo, prezzo, mq, advertiser, telefono, zona, listing_url, alerted_at
           FROM match_mercato_log
           WHERE alerted_at >= $1
           ORDER BY alerted_at DESC LIMIT 10`,
          [ventiquattroreFa.toISOString()]
        ).then(r => r.rows).catch(() => []),

        // 6) Lead caldi 24h
        pool.query(
          `SELECT id, nome, cognome, telefono, stato, score, info_chiave, ultimo_inbound
           FROM leads
           WHERE stato IN ('qualificato','caldo')
             AND ultimo_inbound >= $1
           ORDER BY ultimo_inbound DESC LIMIT 5`,
          [ventiquattroreFa.toISOString()]
        ).then(r => r.rows).catch(() => []),

        // 7) Appuntamenti oggi
        pool.query(
          `SELECT id, data_ora, luogo, tipo, note, cliente_id, lead_id, completato, confermato
           FROM appuntamenti
           WHERE data_ora >= $1 AND data_ora <= $2
           ORDER BY data_ora ASC`,
          [inizioOggi.toISOString(), fineOggi.toISOString()]
        ).then(r => r.rows).catch(() => []),

        // 8) Tasks_ilan attivi dovuti oggi (entro 12h)
        pool.query(
          `SELECT short_id, tipo, descrizione, nome_riferimento, telefono,
                  scheduled_at, priorita, origine
           FROM tasks_ilan
           WHERE stato='attivo' AND scheduled_at <= $1
           ORDER BY priorita ASC, scheduled_at ASC LIMIT 10`,
          [new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()]
        ).then(r => r.rows).catch(() => []),

        // 9) Recap ieri
        Promise.all([
          pool.query(
            `SELECT COUNT(*)::int AS n FROM casafari_outreach
             WHERE stato='inviato' AND inviato_at >= $1 AND inviato_at < $2`,
            [inizioIeri.toISOString(), inizioOggi.toISOString()]
          ).then(r => r.rows[0]?.n || 0).catch(() => 0),
          pool.query(
            `SELECT COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE risposta_classificazione LIKE 'positiv%')::int AS pos
             FROM casafari_outreach
             WHERE risposta_ricevuta_at >= $1 AND risposta_ricevuta_at < $2`,
            [inizioIeri.toISOString(), inizioOggi.toISOString()]
          ).then(r => ({ n: r.rows[0]?.n || 0, pos: r.rows[0]?.pos || 0 })).catch(() => ({ n: 0, pos: 0 })),
          pool.query(
            `SELECT COUNT(*)::int AS n FROM leads
             WHERE created_at >= $1 AND created_at < $2`,
            [inizioIeri.toISOString(), inizioOggi.toISOString()]
          ).then(r => r.rows[0]?.n || 0).catch(() => 0),
        ]).then(([inviati, risposte, leadNuovi]) => ({
          outreach_ieri: inviati,
          risposte_ieri: risposte.n,
          risposte_positive_ieri: risposte.pos,
          lead_ieri: leadNuovi,
        })),
      ]);

      // Check pausa Paolo
      let pausaUntil: string | null = null;
      try {
        const pr = await pool.query(
          `SELECT value FROM system_config WHERE key='paolo_pausa_until' LIMIT 1`
        );
        const v = pr.rows[0]?.value;
        if (v && new Date(v) > now) pausaUntil = v;
      } catch {}

      res.json({
        ora: now.toISOString(),
        pausa_until: pausaUntil,
        decisioni: {
          bozze_crm: bozzeCrmPending,
          drip: dripPending,
          outreach_approval: outreachApproval,
          tasks_ilan: tasksIlan,
        },
        opportunita: {
          pluricondivisi,
          match_clienti: matchClienti,
          lead_caldi: leadCaldi,
        },
        oggi: {
          appuntamenti: appuntamentiOggi,
        },
        recap: recapIeri,
      });
    } catch (err: any) {
      console.error("[home/oggi] error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== DASHBOARD ====================
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const [clienti, richieste, immobili, appuntamenti, matching] = await Promise.all([
        storage.getClienti(),
        storage.getRichieste(),
        storage.getImmobili(),
        storage.getAppuntamenti(),
        storage.getMatching(),
      ]);

      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      const unaSettimanaFa = new Date(oggi);
      unaSettimanaFa.setDate(unaSettimanaFa.getDate() - 7);

      const clientiNuovi = clienti.filter(c => new Date(c.createdAt) >= unaSettimanaFa).length;
      const immobiliNuovi = immobili.filter(i => new Date(i.createdAt) >= unaSettimanaFa).length;
      const richiesteNuove = richieste.filter(r => new Date(r.createdAt) >= unaSettimanaFa).length;
      const appuntamentiOggi = appuntamenti.filter(a => {
        const d = new Date(a.dataOra);
        return d.toDateString() === oggi.toDateString();
      }).length;
      const matchingSuggeriti = matching.filter(m => !m.proposto && m.punteggio >= 60).length;

      res.json({
        clientiTotali: clienti.length,
        clientiNuovi,
        immobiliTotali: immobili.filter(i => i.attivo).length,
        immobiliNuovi,
        richiesteTotali: richieste.filter(r => r.attiva).length,
        richiesteNuove,
        appuntamentiOggi,
        matchingSuggeriti,
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Errore nel recupero delle statistiche" });
    }
  });

  app.get("/api/dashboard/trends", async (req, res) => {
    try {
      const [clienti, richieste, immobili, appuntamenti] = await Promise.all([
        storage.getClienti(),
        storage.getRichieste(),
        storage.getImmobili(),
        storage.getAppuntamenti(),
      ]);

      const oggi = new Date();
      oggi.setHours(23, 59, 59, 999);
      const giorni = [];
      const giorniNomi = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

      for (let i = 6; i >= 0; i--) {
        const giorno = new Date(oggi);
        giorno.setDate(giorno.getDate() - i);
        const inizioGiorno = new Date(giorno);
        inizioGiorno.setHours(0, 0, 0, 0);
        const fineGiorno = new Date(giorno);
        fineGiorno.setHours(23, 59, 59, 999);

        giorni.push({
          nome: giorniNomi[giorno.getDay()],
          data: giorno.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
          clienti: clienti.filter(c => {
            if (!c.createdAt) return false;
            const d = new Date(c.createdAt);
            return !isNaN(d.getTime()) && d >= inizioGiorno && d <= fineGiorno;
          }).length,
          richieste: richieste.filter(r => {
            if (!r.createdAt) return false;
            const d = new Date(r.createdAt);
            return !isNaN(d.getTime()) && d >= inizioGiorno && d <= fineGiorno;
          }).length,
          immobili: immobili.filter(i => {
            if (!i.createdAt) return false;
            const d = new Date(i.createdAt);
            return !isNaN(d.getTime()) && d >= inizioGiorno && d <= fineGiorno;
          }).length,
          appuntamenti: appuntamenti.filter(a => {
            if (!a.dataOra) return false;
            const d = new Date(a.dataOra);
            return !isNaN(d.getTime()) && d >= inizioGiorno && d <= fineGiorno;
          }).length,
        });
      }

      res.json(giorni);
    } catch (error) {
      console.error("Dashboard trends error:", error);
      res.status(500).json({ error: "Errore nel recupero dei trends" });
    }
  });

  // ==================== CLIENTI ====================
  app.get("/api/clienti", async (req, res) => {
    try {
      const clienti = await storage.getClienti();
      res.json(clienti);
    } catch (error) {
      console.error("Get clienti error:", error);
      res.status(500).json({ error: "Errore nel recupero dei clienti" });
    }
  });

  app.get("/api/clienti/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const cliente = await storage.getCliente(id);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      res.json(cliente);
    } catch (error) {
      console.error("Get cliente error:", error);
      res.status(500).json({ error: "Errore nel recupero del cliente" });
    }
  });

  app.post("/api/clienti", async (req, res) => {
    try {
      const parsed = insertClienteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const cliente = await storage.createCliente(parsed.data);
      res.status(201).json(cliente);
    } catch (error) {
      console.error("Create cliente error:", error);
      res.status(500).json({ error: "Errore nella creazione del cliente" });
    }
  });

  app.patch("/api/clienti/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertClienteSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const cliente = await storage.updateCliente(id, parsed.data);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      res.json(cliente);
    } catch (error) {
      console.error("Update cliente error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento del cliente" });
    }
  });

  app.delete("/api/clienti/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCliente(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete cliente error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione del cliente" });
    }
  });

  // Unisci due clienti: trasferisce tutti i dati dal cliente "daUnire" al cliente "mantenere"
  app.post("/api/clienti/:id/unisci", async (req, res) => {
    try {
      const clienteMantenereid = parseInt(req.params.id);
      const { clienteDaUnireId } = req.body;
      
      if (!clienteDaUnireId || isNaN(clienteDaUnireId)) {
        return res.status(400).json({ error: "ID del cliente da unire non valido" });
      }
      
      if (clienteMantenereid === clienteDaUnireId) {
        return res.status(400).json({ error: "Non puoi unire un cliente con se stesso" });
      }
      
      const clienteMantenere = await storage.getCliente(clienteMantenereid);
      const clienteDaUnire = await storage.getCliente(clienteDaUnireId);
      
      if (!clienteMantenere) {
        return res.status(404).json({ error: "Cliente da mantenere non trovato" });
      }
      if (!clienteDaUnire) {
        return res.status(404).json({ error: "Cliente da unire non trovato" });
      }
      
      // Trasferisci comunicazioni
      const comunicazioni = await storage.getComunicazioni(clienteDaUnireId);
      for (const com of comunicazioni) {
        await storage.updateComunicazione(com.id, { clienteId: clienteMantenereid });
      }
      
      // Trasferisci richieste
      const richieste = await storage.getRichieste();
      const richiesteCliente = richieste.filter(r => r.clienteId === clienteDaUnireId);
      for (const richiesta of richiesteCliente) {
        await storage.updateRichiesta(richiesta.id, { clienteId: clienteMantenereid });
      }
      
      // Trasferisci appuntamenti
      const appuntamenti = await storage.getAppuntamenti();
      const appuntamentiCliente = appuntamenti.filter(a => a.clienteId === clienteDaUnireId);
      for (const appuntamento of appuntamentiCliente) {
        await storage.updateAppuntamento(appuntamento.id, { clienteId: clienteMantenereid });
      }
      
      // Trasferisci conversazioni WhatsApp
      const conversations = await storage.getWhatsappConversations();
      const conversazioniCliente = conversations.filter(c => c.clienteId === clienteDaUnireId);
      for (const conv of conversazioniCliente) {
        await storage.updateWhatsappConversation(conv.id, { clienteId: clienteMantenereid });
      }
      
      // Trasferisci immobili esterni collegati
      const immobiliEsterni = await storage.getImmobiliEsterni();
      const immobiliCliente = immobiliEsterni.filter(ie => ie.clienteId === clienteDaUnireId);
      for (const immobile of immobiliCliente) {
        await storage.updateImmobileEsterno(immobile.id, { clienteId: clienteMantenereid });
      }
      
      // Trasferisci tasks
      const tasks = await storage.getTasks();
      const tasksCliente = tasks.filter(t => t.clienteId === clienteDaUnireId);
      for (const task of tasksCliente) {
        await storage.updateTask(task.id, { clienteId: clienteMantenereid });
      }
      
      // Trasferisci notifiche
      const notifiche = await storage.getNotifiche();
      const notificheCliente = notifiche.filter(n => n.clienteId === clienteDaUnireId);
      for (const notifica of notificheCliente) {
        await storage.updateNotifica(notifica.id, { clienteId: clienteMantenereid });
      }
      
      // Trasferisci attività cliente
      const attivita = await storage.getAttivitaCliente(clienteDaUnireId);
      for (const att of attivita) {
        await storage.updateAttivitaCliente(att.id, { clienteId: clienteMantenereid });
      }
      
      // Aggiorna note del cliente mantenuto con riferimento all'unione
      const noteUnione = `\n[Unito con cliente: ${clienteDaUnire.nome || ""} ${clienteDaUnire.cognome || ""} (ID: ${clienteDaUnireId}) il ${new Date().toLocaleDateString('it-IT')}]`;
      const noteAttuali = clienteMantenere.note || "";
      
      // Trasferisci info mancanti (telefono, email, etc.)
      const updateData: any = {
        note: noteAttuali + noteUnione
      };
      
      if (!clienteMantenere.telefono && clienteDaUnire.telefono) {
        updateData.telefono = clienteDaUnire.telefono;
      }
      if (!clienteMantenere.email && clienteDaUnire.email) {
        updateData.email = clienteDaUnire.email;
      }
      
      await storage.updateCliente(clienteMantenereid, updateData);
      
      // Archivia (disattiva) il cliente duplicato invece di eliminarlo
      await storage.updateCliente(clienteDaUnireId, { 
        attivo: false,
        note: (clienteDaUnire.note || "") + `\n[ARCHIVIATO - Unito con cliente ID: ${clienteMantenereid} il ${new Date().toLocaleDateString('it-IT')}]`
      });
      
      console.log(`[ClientiMerge] Merged client ${clienteDaUnireId} into ${clienteMantenereid}`);
      
      const clienteAggiornato = await storage.getCliente(clienteMantenereid);
      res.json({
        success: true,
        message: `Cliente "${clienteDaUnire.nome || ""} ${clienteDaUnire.cognome || ""}" unito con successo`,
        cliente: clienteAggiornato
      });
    } catch (error) {
      console.error("Merge clienti error:", error);
      res.status(500).json({ error: "Errore nell'unione dei clienti" });
    }
  });

  // Analyze client personality based on WhatsApp and Email conversations
  app.post("/api/clienti/:id/analizza-personalita", async (req, res) => {
    try {
      const clienteId = parseInt(req.params.id);
      const cliente = await storage.getCliente(clienteId);
      
      if (!cliente) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      const allMessages: Array<{ role: string; content: string; timestamp?: Date; source: string }> = [];
      
      // Get WhatsApp messages
      const conversation = await storage.getWhatsappConversationByClienteId(clienteId);
      if (conversation) {
        const whatsappMessages = await storage.getWhatsappMessages(conversation.id);
        whatsappMessages.forEach(m => {
          allMessages.push({
            role: m.direction === 'incoming' ? 'cliente' : 'agente',
            content: m.content,
            timestamp: m.timestamp || m.createdAt,
            source: 'WhatsApp'
          });
        });
      }
      
      // Get Email communications
      const comunicazioni = await storage.getComunicazioni(clienteId);
      const emailMessages = comunicazioni.filter(c => c.canale === 'email');
      emailMessages.forEach(c => {
        allMessages.push({
          role: c.tipo === 'richiesta' ? 'cliente' : 'agente',
          content: c.testo || '',
          timestamp: c.dataOra,
          source: 'Email'
        });
      });
      
      if (allMessages.length === 0) {
        return res.status(400).json({ 
          error: "Nessuna conversazione trovata. Avvia una conversazione WhatsApp o email per analizzare la personalità." 
        });
      }
      
      // Sort messages by timestamp
      allMessages.sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateA - dateB;
      });
      
      // Format messages for AI analysis (include source info)
      const formattedMessages = allMessages.map(m => ({
        role: m.role,
        content: `[${m.source}] ${m.content}`,
        timestamp: m.timestamp
      }));
      
      const clientName = [cliente.nome, cliente.cognome].filter(Boolean).join(' ') || 'Cliente';
      
      // Analyze personality with AI
      const analysis = await analyzeClientPersonality(clientName, formattedMessages);
      
      // Count sources for the header
      const whatsappCount = allMessages.filter(m => m.source === 'WhatsApp').length;
      const emailCount = allMessages.filter(m => m.source === 'Email').length;
      const sourceSummary = [
        whatsappCount > 0 ? `${whatsappCount} WhatsApp` : null,
        emailCount > 0 ? `${emailCount} Email` : null
      ].filter(Boolean).join(', ');
      
      // Format the personality text for storage
      const personalityText = `📊 PROFILO PERSONALITÀ
(Basato su ${allMessages.length} messaggi: ${sourceSummary})

${analysis.personalita}

💬 COME COMUNICARE
${analysis.suggerimentiComunicazione}

✅ LEVE MOTIVAZIONALI
${analysis.puntiForza.length > 0 ? analysis.puntiForza.map(p => `• ${p}`).join('\n') : '• Nessuna identificata'}

⚠️ AREE SENSIBILI
${analysis.areeSensibili.length > 0 ? analysis.areeSensibili.map(a => `• ${a}`).join('\n') : '• Nessuna identificata'}`;
      
      // Update client with personality analysis
      const updatedCliente = await storage.updateCliente(clienteId, {
        personalitaAi: personalityText,
        personalitaAiUpdatedAt: new Date()
      });
      
      res.json({
        success: true,
        cliente: updatedCliente,
        analysis
      });
    } catch (error) {
      console.error("Personality analysis error:", error);
      res.status(500).json({ error: "Errore nell'analisi della personalità" });
    }
  });

  // Invio comunicazione (WhatsApp/Email) da scheda cliente
  app.post("/api/clienti/:id/comunicazioni/invia", async (req, res) => {
    try {
      const clienteId = parseInt(req.params.id);
      const parsed = sendCommunicationSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      
      const { canale, messaggio, immobileId, tipo, attivitaClienteId } = parsed.data;
      
      // Recupera cliente
      const cliente = await storage.getCliente(clienteId);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente non trovato" });
      }
      
      let sendResult: { success: boolean; messageId?: string; error?: string };
      
      if (canale === "whatsapp") {
        if (!isUltraMsgConfigured()) {
          return res.status(400).json({ error: "WhatsApp non configurato" });
        }
        if (!cliente.telefono) {
          return res.status(400).json({ error: "Il cliente non ha un numero di telefono" });
        }
        sendResult = await sendWhatsAppMessage(cliente.telefono, messaggio);
      } else {
        const gmailOk = await isGmailConfigured();
        if (!gmailOk) {
          return res.status(400).json({ error: "Gmail non configurato" });
        }
        if (!cliente.email) {
          return res.status(400).json({ error: "Il cliente non ha un indirizzo email" });
        }
        sendResult = await sendEmail(cliente.email, "Comunicazione ImmoGest", messaggio);
      }
      
      if (!sendResult.success) {
        return res.status(500).json({ error: sendResult.error || "Invio fallito" });
      }
      
      // Se è WhatsApp, registra anche nella sezione WhatsApp Chat
      if (canale === "whatsapp" && cliente.telefono) {
        try {
          const normalizedPhone = cliente.telefono.replace(/\D/g, '').replace(/^(0039|39)/, '');
          
          // Trova o crea conversazione
          let conversation = await storage.getWhatsappConversationByPhone(normalizedPhone);
          if (!conversation) {
            conversation = await storage.createWhatsappConversation({
              phoneNumber: normalizedPhone,
              clienteId: clienteId,
              immobileId: immobileId || null,
              nome: `${cliente.nome || ""} ${cliente.cognome || ""}`.trim() || null,
              ultimoMessaggio: messaggio.slice(0, 100),
              ultimoMessaggioData: new Date(),
              nonLetti: 0,
              stato: "attivo",
            });
          } else {
            // Aggiorna conversazione esistente
            await storage.updateWhatsappConversation(conversation.id, {
              ultimoMessaggio: messaggio.slice(0, 100),
              ultimoMessaggioData: new Date(),
              clienteId: conversation.clienteId || clienteId,
            });
          }
          
          // Crea messaggio WhatsApp
          await storage.createWhatsappMessage({
            conversationId: conversation.id,
            direction: "outbound",
            content: messaggio,
            messageType: "text",
            status: "sent",
            whatsappMessageId: sendResult.messageId?.toString() || null,
          });
          
          // Notifica WebSocket
          whatsappWS.notifyConversationUpdate({ conversationId: conversation!.id });
        } catch (e) {
          console.error("Errore salvataggio messaggio WhatsApp Chat:", e);
        }
      }
      
      // Registra comunicazione lato cliente
      const comunicazione = await storage.createComunicazione({
        clienteId,
        immobileId: immobileId || null,
        tipo,
        testo: messaggio,
        canale,
        creatoDA: "agente",
        esito: null,
      });
      
      // Se c'è un immobile collegato, registra anche un'attività sull'immobile
      if (immobileId) {
        try {
          await storage.createAttivitaImmobile({
            immobileId,
            titolo: canale === "whatsapp" ? "WhatsApp inviato" : "Email inviata",
            descrizione: `${canale === "whatsapp" ? "WhatsApp" : "Email"} inviato a ${cliente.nome || ""} ${cliente.cognome || ""}`.trim() + ": " + messaggio.slice(0, 300),
          });
        } catch (e) {
          console.error("Errore creazione attività immobile:", e);
        }
      }
      
      // Se c'è un'attività cliente collegata, segnala come completata
      if (attivitaClienteId) {
        try {
          await storage.updateAttivitaCliente(attivitaClienteId, { stato: "fatto" });
        } catch (e) {
          console.error("Errore aggiornamento attività cliente:", e);
        }
      }
      
      // Mark all unread notifications for this client as read (auto-gestione)
      try {
        const markedCount = await storage.markNotificheLetteByCliente(clienteId);
        if (markedCount > 0) {
          console.log(`[Comunicazione] Marked ${markedCount} notifications as read for client ${clienteId}`);
        }
      } catch (e) {
        console.error("Errore mark notifiche lette:", e);
      }
      
      res.json({ success: true, comunicazione });
    } catch (error) {
      console.error("Send communication error:", error);
      res.status(500).json({ error: "Errore nell'invio della comunicazione" });
    }
  });

  // ==================== RICHIESTE ====================
  app.get("/api/richieste", async (req, res) => {
    try {
      const clienteId = req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined;
      const richieste = await storage.getRichieste(clienteId);
      res.json(richieste);
    } catch (error) {
      console.error("Get richieste error:", error);
      res.status(500).json({ error: "Errore nel recupero delle richieste" });
    }
  });

  app.get("/api/richieste/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const richiesta = await storage.getRichiesta(id);
      if (!richiesta) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }
      res.json(richiesta);
    } catch (error) {
      console.error("Get richiesta error:", error);
      res.status(500).json({ error: "Errore nel recupero della richiesta" });
    }
  });

  // Helper function to normalize zona text for matching
  function normalizeZona(zona: string | null | undefined): string | null {
    if (!zona) return null;
    return zona
      .toLowerCase()
      .replace(/[\/,;]/g, ',')
      .replace(/[^\w\s,àèéìòùáéíóú]/g, '')
      .replace(/\s+/g, ' ')
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .join(', ');
  }

  app.post("/api/richieste", async (req, res) => {
    try {
      const parsed = insertRichiestaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const dataWithNormalizedZona = {
        ...parsed.data,
        zonaNormalizzata: normalizeZona(parsed.data.zona),
      };
      const richiesta = await storage.createRichiesta(dataWithNormalizedZona);
      
      // Auto-generate matching in background (non-blocking)
      generateMatchingForRichiesta(richiesta.id).catch(e => 
        console.error("[Auto-Matching] Error for richiesta:", e)
      );
      
      res.status(201).json(richiesta);
    } catch (error) {
      console.error("Create richiesta error:", error);
      res.status(500).json({ error: "Errore nella creazione della richiesta" });
    }
  });

  app.patch("/api/richieste/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertRichiestaSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const dataWithNormalizedZona = {
        ...parsed.data,
        zonaNormalizzata: parsed.data.zona !== undefined ? normalizeZona(parsed.data.zona) : undefined,
      };
      const richiesta = await storage.updateRichiesta(id, dataWithNormalizedZona);
      if (!richiesta) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }
      res.json(richiesta);
    } catch (error) {
      console.error("Update richiesta error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento della richiesta" });
    }
  });

  app.delete("/api/richieste/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteRichiesta(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete richiesta error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione della richiesta" });
    }
  });

  // Get external properties suggested for a specific request
  app.get("/api/richieste/:id/immobili-esterni", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const immobili = await storage.getImmobiliEsterniByRichiesta(id);
      res.json(immobili);
    } catch (error) {
      console.error("Get immobili esterni by richiesta error:", error);
      res.status(500).json({ error: "Errore nel recupero degli immobili esterni" });
    }
  });

  // Add external property suggestion for a specific request
  app.post("/api/richieste/:id/add-external-property", async (req, res) => {
    try {
      const richiestaId = parseInt(req.params.id);
      const { url, titolo, zona, prezzo, mq, camere, bagni, descrizione } = req.body;

      // Validate request exists
      const richiesta = await storage.getRichiesta(richiestaId);
      if (!richiesta) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      // If URL provided, try to scrape property data
      let propertyData: any = {
        richiestaId,
        clienteId: richiesta.clienteId,
        titolo: titolo || "Immobile esterno",
        zona,
        prezzo,
        mq,
        camere,
        bagni,
        descrizione,
        fonte: "manuale",
        statoContatto: "nuovo",
      };

      if (url) {
        // Check if property already exists by URL
        const existing = await storage.getImmobileEsternoByUrl(url);
        if (existing) {
          // Update existing property to link to this request
          const updated = await storage.updateImmobileEsterno(existing.id, { richiestaId, clienteId: richiesta.clienteId });
          return res.json({ success: true, immobile: updated, message: "Immobile esistente collegato alla richiesta" });
        }

        propertyData.urlAnnuncio = url;
        
        // Try to detect portal from URL
        if (url.includes("idealista")) {
          propertyData.fonte = "idealista.it";
        } else if (url.includes("immobiliare.it")) {
          propertyData.fonte = "immobiliare.it";
        } else if (url.includes("casa.it")) {
          propertyData.fonte = "casa.it";
        } else if (url.includes("subito.it")) {
          propertyData.fonte = "subito.it";
        }

        // Try to scrape property using Apify if available
        try {
          const { scrapePropertyWithApify } = await import("./apify-scraper");
          const scrapedData = await scrapePropertyWithApify(url);
          if (scrapedData) {
            propertyData = {
              ...propertyData,
              ...scrapedData,
              richiestaId,
              clienteId: richiesta.clienteId,
            };
          }
        } catch (scrapeError) {
          console.log("Scraping not available, using manual data:", scrapeError);
        }
      }

      const immobile = await storage.createImmobileEsterno(propertyData);
      res.status(201).json({ success: true, immobile, message: "Immobile aggiunto come suggerimento per la richiesta" });
    } catch (error) {
      console.error("Add external property to richiesta error:", error);
      res.status(500).json({ error: "Errore nell'aggiunta dell'immobile esterno" });
    }
  });

  // ==================== IMMOBILI ====================
  app.get("/api/immobili", async (req, res) => {
    try {
      const proprietarioId = req.query.proprietarioId ? parseInt(req.query.proprietarioId as string) : undefined;
      const immobili = await storage.getImmobili(proprietarioId);
      res.json(immobili);
    } catch (error) {
      console.error("Get immobili error:", error);
      res.status(500).json({ error: "Errore nel recupero degli immobili" });
    }
  });

  app.get("/api/immobili/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const immobile = await storage.getImmobile(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }
      res.json(immobile);
    } catch (error) {
      console.error("Get immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero dell'immobile" });
    }
  });

  app.post("/api/immobili", async (req, res) => {
    try {
      const parsed = insertImmobileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const immobile = await storage.createImmobile(parsed.data);
      
      // Auto-generate matching in background (non-blocking)
      generateMatchingForImmobile(immobile.id).catch(e => 
        console.error("[Auto-Matching] Error for immobile:", e)
      );
      
      res.status(201).json(immobile);
    } catch (error) {
      console.error("Create immobile error:", error);
      res.status(500).json({ error: "Errore nella creazione dell'immobile" });
    }
  });

  app.patch("/api/immobili/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertImmobileSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const immobile = await storage.updateImmobile(id, parsed.data);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }
      res.json(immobile);
    } catch (error) {
      console.error("Update immobile error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'immobile" });
    }
  });

  app.delete("/api/immobili/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteImmobile(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete immobile error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione dell'immobile" });
    }
  });

  // ==================== IMMOBILE DETAIL ENDPOINTS ====================
  
  // Attività Immobile
  app.get("/api/immobili/:id/attivita", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attivita = await storage.getAttivitaImmobile(id);
      res.json(attivita);
    } catch (error) {
      console.error("Get attivita immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero delle attività" });
    }
  });

  app.post("/api/immobili/:id/attivita", async (req, res) => {
    try {
      const immobileId = parseInt(req.params.id);
      const attivita = await storage.createAttivitaImmobile({ ...req.body, immobileId });
      res.status(201).json(attivita);
    } catch (error) {
      console.error("Create attivita error:", error);
      res.status(500).json({ error: "Errore nella creazione dell'attività" });
    }
  });

  app.patch("/api/attivita/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attivita = await storage.updateAttivitaImmobile(id, req.body);
      res.json(attivita);
    } catch (error) {
      console.error("Update attivita error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'attività" });
    }
  });

  app.delete("/api/attivita/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAttivitaImmobile(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete attivita error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione dell'attività" });
    }
  });

  // Documenti Immobile
  app.get("/api/immobili/:id/documenti", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const documenti = await storage.getDocumentiImmobile(id);
      res.json(documenti);
    } catch (error) {
      console.error("Get documenti immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero dei documenti" });
    }
  });

  app.post("/api/immobili/:id/documenti", async (req, res) => {
    try {
      const immobileId = parseInt(req.params.id);
      const documento = await storage.createDocumentoImmobile({ ...req.body, immobileId });
      res.status(201).json(documento);
    } catch (error) {
      console.error("Create documento error:", error);
      res.status(500).json({ error: "Errore nella creazione del documento" });
    }
  });

  app.delete("/api/documenti/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDocumentoImmobile(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete documento error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione del documento" });
    }
  });

  // Portali Immobile
  app.get("/api/immobili/:id/portali", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const portali = await storage.getPortaliImmobile(id);
      res.json(portali);
    } catch (error) {
      console.error("Get portali immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero dei portali" });
    }
  });

  app.post("/api/immobili/:id/portali", async (req, res) => {
    try {
      const immobileId = parseInt(req.params.id);
      const portale = await storage.createPortaleImmobile({ ...req.body, immobileId });
      res.status(201).json(portale);
    } catch (error) {
      console.error("Create portale error:", error);
      res.status(500).json({ error: "Errore nella creazione del portale" });
    }
  });

  app.patch("/api/portali/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const portale = await storage.updatePortaleImmobile(id, req.body);
      res.json(portale);
    } catch (error) {
      console.error("Update portale error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento del portale" });
    }
  });

  app.delete("/api/portali/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePortaleImmobile(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete portale error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione del portale" });
    }
  });

  // Storico Prezzo
  app.get("/api/immobili/:id/storico-prezzo", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const storico = await storage.getStoricoPrezzo(id);
      res.json(storico);
    } catch (error) {
      console.error("Get storico prezzo error:", error);
      res.status(500).json({ error: "Errore nel recupero dello storico prezzi" });
    }
  });

  app.post("/api/immobili/:id/storico-prezzo", async (req, res) => {
    try {
      const immobileId = parseInt(req.params.id);
      const storico = await storage.createStoricoPrezzo({ ...req.body, immobileId });
      res.status(201).json(storico);
    } catch (error) {
      console.error("Create storico prezzo error:", error);
      res.status(500).json({ error: "Errore nella creazione dello storico prezzi" });
    }
  });

  // Comunicazioni per Immobile
  app.get("/api/immobili/:id/comunicazioni", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comunicazioni = await storage.getComunicazioniByImmobile(id);
      res.json(comunicazioni);
    } catch (error) {
      console.error("Get comunicazioni by immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero delle comunicazioni" });
    }
  });

  // Appuntamenti per Immobile
  app.get("/api/immobili/:id/appuntamenti", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const appuntamenti = await storage.getAppuntamentiByImmobile(id);
      res.json(appuntamenti);
    } catch (error) {
      console.error("Get appuntamenti by immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero degli appuntamenti" });
    }
  });

  // Notifiche da gestire per Immobile (con dati cliente)
  app.get("/api/immobili/:id/notifiche-da-gestire", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notificheList = await storage.getNotificheByImmobile(id, true);
      
      // Arricchisci con dati cliente
      const enrichedNotifiche = await Promise.all(notificheList.map(async (n) => {
        const cliente = n.clienteId ? await storage.getCliente(n.clienteId) : null;
        return {
          ...n,
          cliente,
        };
      }));
      
      res.json(enrichedNotifiche);
    } catch (error) {
      console.error("Get notifiche da gestire error:", error);
      res.status(500).json({ error: "Errore nel recupero delle notifiche" });
    }
  });

  // Notifiche da gestire per Cliente (con dati immobile)
  app.get("/api/clienti/:id/notifiche-da-gestire", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notificheList = await storage.getNotificheByCliente(id, true);
      
      // Arricchisci con dati immobile
      const enrichedNotifiche = await Promise.all(notificheList.map(async (n) => {
        const immobile = n.immobileId ? await storage.getImmobile(n.immobileId) : null;
        return {
          ...n,
          immobile,
        };
      }));
      
      res.json(enrichedNotifiche);
    } catch (error) {
      console.error("Get notifiche da gestire per cliente error:", error);
      res.status(500).json({ error: "Errore nel recupero delle notifiche" });
    }
  });

  // Matching per Immobile (arricchito con dati cliente)
  app.get("/api/immobili/:id/matching", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const matchingList = await storage.getMatchingByImmobile(id);
      
      // Arricchisci con dati richiesta e cliente
      const enrichedMatching = await Promise.all(matchingList.map(async (m) => {
        const richiesta = await storage.getRichiesta(m.richiestaId);
        const cliente = richiesta ? await storage.getCliente(richiesta.clienteId) : null;
        return {
          ...m,
          richiesta,
          cliente,
        };
      }));
      
      // Ordina per punteggio
      enrichedMatching.sort((a, b) => (b.punteggio || 0) - (a.punteggio || 0));
      
      res.json(enrichedMatching);
    } catch (error) {
      console.error("Get matching by immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero dei matching" });
    }
  });

  // ==================== IMMOBILI ESTERNI (In Acquisizione) ====================
  app.get("/api/immobili-esterni", async (req, res) => {
    try {
      const preferiti = req.query.preferiti === 'true' ? true : (req.query.preferiti === 'false' ? false : undefined);
      const immobili = await storage.getImmobiliEsterni(preferiti);
      res.json(immobili);
    } catch (error) {
      console.error("Get immobili esterni error:", error);
      res.status(500).json({ error: "Errore nel recupero degli immobili esterni" });
    }
  });

  app.get("/api/immobili-esterni/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile esterno non trovato" });
      }
      res.json(immobile);
    } catch (error) {
      console.error("Get immobile esterno error:", error);
      res.status(500).json({ error: "Errore nel recupero dell'immobile esterno" });
    }
  });

  // ==================== COMUNICAZIONI ====================
  app.get("/api/comunicazioni", async (req, res) => {
    try {
      const clienteId = req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined;
      const immobileEsternoId = req.query.immobileEsternoId ? parseInt(req.query.immobileEsternoId as string) : undefined;
      
      let comunicazioni;
      if (immobileEsternoId) {
        comunicazioni = await storage.getComunicazioniByImmobileEsterno(immobileEsternoId);
      } else {
        comunicazioni = await storage.getComunicazioni(clienteId);
      }
      res.json(comunicazioni);
    } catch (error) {
      console.error("Get comunicazioni error:", error);
      res.status(500).json({ error: "Errore nel recupero delle comunicazioni" });
    }
  });

  app.post("/api/comunicazioni", async (req, res) => {
    try {
      const parsed = insertComunicazioneSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      
      // Auto-link to immobile esterno if clienteId is provided and client has external properties
      let dataToSave = { ...parsed.data };
      if (parsed.data.clienteId && !parsed.data.immobileEsternoId) {
        const immobiliEsterni = await storage.getImmobiliEsterniByCliente(parsed.data.clienteId);
        if (immobiliEsterni.length > 0) {
          // Link to the most recent immobile esterno of this client
          dataToSave.immobileEsternoId = immobiliEsterni[0].id;
        }
      }
      
      const comunicazione = await storage.createComunicazione(dataToSave);
      res.status(201).json(comunicazione);
    } catch (error) {
      console.error("Create comunicazione error:", error);
      res.status(500).json({ error: "Errore nella creazione della comunicazione" });
    }
  });

  app.patch("/api/comunicazioni/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comunicazione = await storage.updateComunicazione(id, req.body);
      if (!comunicazione) {
        return res.status(404).json({ error: "Comunicazione non trovata" });
      }
      res.json(comunicazione);
    } catch (error) {
      console.error("Update comunicazione error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento della comunicazione" });
    }
  });

  // ==================== APPUNTAMENTI ====================
  app.get("/api/appuntamenti", async (req, res) => {
    try {
      const clienteId = req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined;
      const appuntamenti = await storage.getAppuntamenti(clienteId);
      res.json(appuntamenti);
    } catch (error) {
      console.error("Get appuntamenti error:", error);
      res.status(500).json({ error: "Errore nel recupero degli appuntamenti" });
    }
  });

  app.get("/api/appuntamenti/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const appuntamento = await storage.getAppuntamento(id);
      if (!appuntamento) {
        return res.status(404).json({ error: "Appuntamento non trovato" });
      }
      res.json(appuntamento);
    } catch (error) {
      console.error("Get appuntamento error:", error);
      res.status(500).json({ error: "Errore nel recupero dell'appuntamento" });
    }
  });

  app.post("/api/appuntamenti", async (req, res) => {
    try {
      const parsed = insertAppuntamentoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const appuntamento = await storage.createAppuntamento(parsed.data);
      res.status(201).json(appuntamento);
    } catch (error) {
      console.error("Create appuntamento error:", error);
      res.status(500).json({ error: "Errore nella creazione dell'appuntamento" });
    }
  });

  app.patch("/api/appuntamenti/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertAppuntamentoSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const appuntamento = await storage.updateAppuntamento(id, parsed.data);
      if (!appuntamento) {
        return res.status(404).json({ error: "Appuntamento non trovato" });
      }
      res.json(appuntamento);
    } catch (error) {
      console.error("Update appuntamento error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'appuntamento" });
    }
  });

  app.delete("/api/appuntamenti/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAppuntamento(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete appuntamento error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione dell'appuntamento" });
    }
  });

  // ==================== MATCHING ====================
  app.get("/api/matching", async (req, res) => {
    try {
      const richiestaId = req.query.richiestaId ? parseInt(req.query.richiestaId as string) : undefined;
      const matching = await storage.getMatching(richiestaId);
      res.json(matching);
    } catch (error) {
      console.error("Get matching error:", error);
      res.status(500).json({ error: "Errore nel recupero dei matching" });
    }
  });

  app.post("/api/matching/generate", async (req, res) => {
    try {
      const { richiestaId } = req.body;
      
      let richieste = richiestaId 
        ? [await storage.getRichiesta(richiestaId)].filter(Boolean)
        : await storage.getRichieste();
      
      richieste = richieste.filter(r => r && r.attiva);
      
      const immobili = (await storage.getImmobili()).filter(i => i.attivo);
      
      const newMatches = [];
      
      for (const richiesta of richieste) {
        if (!richiesta) continue;
        
        // Delete existing matches for this request
        await storage.deleteMatchingByRichiesta(richiesta.id);
        
        for (const immobile of immobili) {
          const punteggio = calculateMatchScore(richiesta, immobile);
          
          // Only create matches with score >= 30
          if (punteggio >= 30) {
            const match = await storage.createMatching({
              richiestaId: richiesta.id,
              immobileId: immobile.id,
              punteggio,
              proposto: false,
            });
            newMatches.push(match);
          }
        }
      }
      
      res.json({ 
        message: "Matching generati con successo", 
        count: newMatches.length,
        matches: newMatches 
      });
    } catch (error) {
      console.error("Generate matching error:", error);
      res.status(500).json({ error: "Errore nella generazione dei matching" });
    }
  });

  app.patch("/api/matching/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertMatchingSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const match = await storage.updateMatching(id, parsed.data);
      if (!match) {
        return res.status(404).json({ error: "Match non trovato" });
      }
      res.json(match);
    } catch (error) {
      console.error("Update matching error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento del match" });
    }
  });

  // ==================== AI ENDPOINTS ====================
  app.post("/api/ai/parse-request", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Testo richiesto" });
      }
      const parsed = await parseRequestWithAI(text);
      res.json(parsed);
    } catch (error) {
      console.error("AI parse error:", error);
      res.status(500).json({ error: "Errore nell'analisi del testo" });
    }
  });

  app.get("/api/ai/coach", async (req, res) => {
    try {
      const [appuntamenti, clienti, richieste, matching] = await Promise.all([
        storage.getAppuntamenti(),
        storage.getClienti(),
        storage.getRichieste(),
        storage.getMatching(),
      ]);

      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      const unaSettimanaFa = new Date(oggi);
      unaSettimanaFa.setDate(unaSettimanaFa.getDate() - 7);

      const message = await generateAICoachMessage({
        appuntamentiOggi: appuntamenti.filter(a => new Date(a.dataOra).toDateString() === oggi.toDateString()).length,
        clientiNuovi: clienti.filter(c => new Date(c.createdAt) >= unaSettimanaFa).length,
        richiesteAttive: richieste.filter(r => r.attiva).length,
        matchingNuovi: matching.filter(m => !m.proposto && m.punteggio >= 60).length,
      });

      res.json({ message });
    } catch (error) {
      console.error("AI coach error:", error);
      res.json({ message: "Buona giornata di lavoro! Concentrati sui tuoi obiettivi." });
    }
  });

  // Generate message for portal form contact - with Idealista short format support
  app.post("/api/ai/generate-form-message", async (req, res) => {
    try {
      const { immobileId } = req.body;
      
      if (!immobileId) {
        return res.status(400).json({ error: "immobileId richiesto" });
      }
      
      const immobile = await storage.getImmobileEsterno(immobileId);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }

      // Detect if it's Idealista (use short format)
      const fonte = (immobile.fonte || "").toLowerCase();
      const urlAnnuncio = (immobile.urlAnnuncio || "").toLowerCase();
      const isIdealista = fonte.includes("idealista") || urlAnnuncio.includes("idealista");
      
      console.log(`[Generate Form Message] ID: ${immobileId}, fonte: ${fonte}, isIdealista: ${isIdealista}`);

      // Import templates - usa stesso MIRRORING_PROMPT di qualità per tutti
      const { 
        MIRRORING_PROMPT, MIRRORING_CONFIG, DEFAULT_ACQUISITION_MESSAGE,
        SHORT_ACQUISITION_MESSAGE 
      } = await import("./bot-config");
      
      // PRIORITÀ: testoOriginale > descrizione > titolo (filtra testo inutile del portale)
      const descr = immobile.descrizione || '';
      const testoOrig = immobile.testoOriginale || '';
      const descrInutile = descr.toLowerCase().includes('aggiungi una nota') || 
                            descr.toLowerCase().includes('la tua nota') ||
                            descr.toLowerCase().includes('modifica') ||
                            descr.trim().length < 80;
      let testoAnnuncio: string;
      if (testoOrig && testoOrig.length > 100) {
        testoAnnuncio = testoOrig.substring(0, 3000);
      } else if (!descrInutile && descr.length > 80) {
        testoAnnuncio = descr;
      } else {
        testoAnnuncio = immobile.titolo || 'Nessun testo disponibile';
      }
      
      let tipoUnita: string | null = null;
      if (immobile.camere) {
        const camereNum = Number(immobile.camere);
        if (camereNum === 1) tipoUnita = "monolocale";
        else if (camereNum === 2) tipoUnita = "bilocale";
        else if (camereNum === 3) tipoUnita = "trilocale";
        else if (camereNum >= 4) tipoUnita = "quadrilocale";
      }
      
      const zonaOVia = immobile.zona || immobile.indirizzo || null;
      
      let context = `Testo annuncio:\n"${testoAnnuncio}"`;
      if (tipoUnita) context += `\n\nTipo unità: ${tipoUnita}`;
      if (zonaOVia) context += `\nZona/Via: ${zonaOVia}`;

      const OpenAI = (await import("openai")).default;
      const openaiClient = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      // Usa SEMPRE lo stesso prompt di qualità per il mirroring
      const mirroringResponse = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: MIRRORING_PROMPT + '\n\nRispondi SOLO con JSON: {"mirroring": "testo"}' },
          { role: "user", content: context }
        ],
        temperature: MIRRORING_CONFIG.temperature,
        max_tokens: MIRRORING_CONFIG.max_tokens,
        response_format: { type: "json_object" }
      });
      
      let mirroringText = "";
      const mirroringContent = mirroringResponse.choices[0]?.message?.content;
      if (mirroringContent) {
        try {
          const parsed = JSON.parse(mirroringContent);
          mirroringText = parsed.mirroring || "";
        } catch (e) {
          console.error("Failed to parse mirroring JSON:", e);
        }
      }
      
      // Template unico per tutti i canali (web e WhatsApp)
      const finalMessage = DEFAULT_ACQUISITION_MESSAGE.replace('{{mirroring}}', mirroringText);
      
      console.log(`[Generate Form Message] Generated ${finalMessage.length} chars (isIdealista: ${isIdealista})`);
      res.json({ message: finalMessage, charCount: finalMessage.length });
    } catch (error) {
      console.error("Generate form message error:", error);
      res.status(500).json({ error: "Errore nella generazione del messaggio" });
    }
  });

  // ==================== ACQUISIZIONE (Immobili Esterni) ====================
  
  // Get all external properties (with optional clienteId filter)
  app.get("/api/acquisizione", async (req, res) => {
    try {
      const preferiti = req.query.preferiti === 'true' ? true : req.query.preferiti === 'false' ? false : undefined;
      const clienteId = req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined;
      
      if (clienteId) {
        // Filter by cliente
        const immobili = await storage.getImmobiliEsterniByCliente(clienteId);
        return res.json(immobili);
      }
      
      const immobili = await storage.getImmobiliEsterni(preferiti);
      res.json(immobili);
    } catch (error) {
      console.error("Get acquisizione error:", error);
      res.status(500).json({ error: "Errore nel recupero degli immobili esterni" });
    }
  });

  // Check if phone number exists (duplicate check)
  app.get("/api/acquisizione/check-phone", async (req, res) => {
    try {
      const phone = req.query.phone as string;
      if (!phone) {
        return res.json({ exists: false });
      }
      // Normalize phone (remove spaces, dashes, +39)
      const normalizedPhone = phone.replace(/[\s\-\+]/g, '').replace(/^39/, '');
      
      const immobili = await storage.getImmobiliEsterni();
      const existing = immobili.find(i => {
        if (!i.contattoTelefono) return false;
        const normalizedExisting = i.contattoTelefono.replace(/[\s\-\+]/g, '').replace(/^39/, '');
        return normalizedExisting === normalizedPhone;
      });
      
      if (existing) {
        res.json({ exists: true, immobile: { id: existing.id, titolo: existing.titolo } });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Check phone error:", error);
      res.json({ exists: false });
    }
  });

  // Get acquisition campaign statistics (MUST be before :id route)
  app.get("/api/acquisizione/stats", async (req, res) => {
    try {
      const immobili = await storage.getImmobiliEsterni();
      const campaigns = await storage.getWhatsappCampaigns();
      const allCampaignMessages: any[] = [];
      for (const campaign of campaigns) {
        const messages = await storage.getCampaignMessages(campaign.id);
        allCampaignMessages.push(...messages);
      }
      
      const dailyStats: Record<string, { sent: number; responses: number; whatsapp: number; form: number }> = {};
      
      for (const immobile of immobili) {
        if (immobile.messaggioInviato && immobile.dataContatto) {
          const date = new Date(immobile.dataContatto).toISOString().split('T')[0];
          if (!dailyStats[date]) {
            dailyStats[date] = { sent: 0, responses: 0, whatsapp: 0, form: 0 };
          }
          dailyStats[date].sent++;
          if (immobile.contattoTelefono) {
            dailyStats[date].whatsapp++;
          } else {
            dailyStats[date].form++;
          }
          if (immobile.rispostaRicevuta) {
            dailyStats[date].responses++;
          }
        }
      }
      
      for (const msg of allCampaignMessages) {
        if (msg.sentAt) {
          const date = new Date(msg.sentAt).toISOString().split('T')[0];
          if (!dailyStats[date]) {
            dailyStats[date] = { sent: 0, responses: 0, whatsapp: 0, form: 0 };
          }
          dailyStats[date].sent++;
          dailyStats[date].whatsapp++;
          if (msg.respondedAt) {
            const respDate = new Date(msg.respondedAt).toISOString().split('T')[0];
            if (!dailyStats[respDate]) {
              dailyStats[respDate] = { sent: 0, responses: 0, whatsapp: 0, form: 0 };
            }
            dailyStats[respDate].responses++;
          }
        }
      }
      
      const dailyStatsArray = Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);
      
      const totals = {
        totalSent: immobili.filter(i => i.messaggioInviato).length + allCampaignMessages.filter(m => m.sentAt).length,
        totalResponses: immobili.filter(i => i.rispostaRicevuta).length + allCampaignMessages.filter(m => m.respondedAt).length,
        totalWhatsApp: immobili.filter(i => i.messaggioInviato && i.contattoTelefono).length + allCampaignMessages.filter(m => m.sentAt).length,
        totalForm: immobili.filter(i => i.messaggioInviato && !i.contattoTelefono).length,
        totalPending: immobili.filter(i => !i.messaggioInviato && i.statoContatto !== 'scartato').length,
        totalContacted: immobili.filter(i => i.statoContatto === 'contattato').length,
        totalInterested: immobili.filter(i => i.statoContatto === 'interessato').length,
        totalDiscarded: immobili.filter(i => i.statoContatto === 'scartato').length,
      };
      
      const responseRate = totals.totalSent > 0 ? Math.round((totals.totalResponses / totals.totalSent) * 100) : 0;
      
      const responseTypes: Record<string, number> = { interessato: 0, nonInteressato: 0, richiestaInfo: 0, appuntamento: 0, altro: 0 };
      for (const immobile of immobili) {
        if (immobile.rispostaRicevuta) {
          if (immobile.statoContatto === 'interessato') responseTypes.interessato++;
          else if (immobile.statoContatto === 'scartato') responseTypes.nonInteressato++;
          else responseTypes.altro++;
        }
      }
      
      const sourceStats: Record<string, number> = {};
      for (const immobile of immobili) {
        const portale = immobile.portale || immobile.fonte || 'Sconosciuto';
        sourceStats[portale] = (sourceStats[portale] || 0) + 1;
      }
      
      res.json({ dailyStats: dailyStatsArray, totals, responseRate, responseTypes, sourceStats, lastUpdated: new Date().toISOString() });
    } catch (error) {
      console.error("Get acquisition stats error:", error);
      res.status(500).json({ error: "Errore nel caricamento delle statistiche" });
    }
  });

  // Get single external property
  app.get("/api/acquisizione/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }
      res.json(immobile);
    } catch (error) {
      console.error("Get acquisizione by id error:", error);
      res.status(500).json({ error: "Errore nel recupero dell'immobile" });
    }
  });

  // Parse property listing with AI
  app.post("/api/acquisizione/parse", async (req, res) => {
    try {
      const { text, url } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Testo dell'annuncio richiesto" });
      }
      const parsed = await parsePropertyListingWithAI(text, url);
      res.json(flattenAIResponse(parsed));
    } catch (error) {
      console.error("Parse listing error:", error);
      res.status(500).json({ error: "Errore nell'analisi dell'annuncio" });
    }
  });

  // Parse property image with AI Vision
  app.post("/api/acquisizione/parse-image", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || typeof imageBase64 !== "string") {
        return res.status(400).json({ error: "Immagine richiesta" });
      }
      const validMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!validMimeTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Formato immagine non supportato. Usa JPEG, PNG, GIF o WebP." });
      }
      const parsed = await parsePropertyImageWithAI(imageBase64, mimeType);
      res.json(flattenAIResponse(parsed));
    } catch (error) {
      console.error("Parse image error:", error);
      res.status(500).json({ error: "Errore nell'analisi dell'immagine" });
    }
  });

  // Helper to flatten nested AI response to flat object
  function flattenAIResponse(parsed: any): any {
    const result: any = {};
    const sections = ["DATI PRINCIPALI", "CARATTERISTICHE", "STATO IMMOBILE", "INFORMAZIONI AGGIUNTIVE", "CONTATTO", "META"];
    
    for (const section of sections) {
      if (parsed[section] && typeof parsed[section] === "object") {
        Object.assign(result, parsed[section]);
      }
    }
    
    // Also include any top-level fields not in sections
    for (const key of Object.keys(parsed)) {
      if (!sections.includes(key)) {
        result[key] = parsed[key];
      }
    }
    
    return result;
  }

  // Parse PDF with text extraction + AI + Vision for images
  app.post("/api/acquisizione/parse-pdf", async (req, res) => {
    try {
      const { pdfBase64, pdfText } = req.body;
      
      // If frontend already extracted text (preferred)
      if (pdfText && typeof pdfText === "string" && pdfText.trim().length > 50) {
        const parsed = await parsePropertyListingWithAI(pdfText);
        let result = flattenAIResponse(parsed);
        
        // If no phone found and we have pdfBase64, try extracting from PDF images
        if (!result.contattoTelefono && pdfBase64) {
          console.log("[PDF] No phone in text, trying image extraction...");
          const phoneFromImages = await extractPhoneFromPdfImages(pdfBase64);
          if (phoneFromImages) {
            console.log(`[PDF] Phone found in PDF image: ${phoneFromImages}`);
            result.contattoTelefono = phoneFromImages;
          }
        }
        
        return res.json(result);
      }
      
      // Fallback: try to extract text from PDF using pdftotext CLI
      if (!pdfBase64 || typeof pdfBase64 !== "string") {
        return res.status(400).json({ error: "PDF o testo richiesto" });
      }
      
      const buffer = Buffer.from(pdfBase64, "base64");
      const tempDir = os.tmpdir();
      const tempPdfPath = path.join(tempDir, `temp_${Date.now()}.pdf`);
      const tempTxtPath = path.join(tempDir, `temp_${Date.now()}.txt`);
      
      try {
        fs.writeFileSync(tempPdfPath, buffer);
        await execAsync(`pdftotext -layout "${tempPdfPath}" "${tempTxtPath}"`);
        const extractedText = fs.readFileSync(tempTxtPath, "utf-8");
        
        // Clean up temp files
        try { fs.unlinkSync(tempPdfPath); } catch {}
        try { fs.unlinkSync(tempTxtPath); } catch {}
        
        if (!extractedText || extractedText.trim().length < 50) {
          return res.status(400).json({ error: "Impossibile estrarre testo dal PDF. Prova con uno screenshot." });
        }
        
        const parsed = await parsePropertyListingWithAI(extractedText);
        let result = flattenAIResponse(parsed);
        
        // If no phone found, try extracting from PDF images
        if (!result.contattoTelefono) {
          console.log("[PDF] No phone in text, trying image extraction...");
          const phoneFromImages = await extractPhoneFromPdfImages(pdfBase64);
          if (phoneFromImages) {
            console.log(`[PDF] Phone found in PDF image: ${phoneFromImages}`);
            result.contattoTelefono = phoneFromImages;
          }
        }
        
        res.json(result);
      } catch (execError) {
        // Clean up temp files on error
        try { fs.unlinkSync(tempPdfPath); } catch {}
        try { fs.unlinkSync(tempTxtPath); } catch {}
        console.error("pdftotext error:", execError);
        return res.status(400).json({ error: "Impossibile estrarre testo dal PDF. Usa uno screenshot dell'annuncio." });
      }
    } catch (error) {
      console.error("Parse PDF error:", error);
      res.status(500).json({ error: "Errore nell'analisi del PDF" });
    }
  });
  
  // Helper function to extract phone from PDF using Vision AI on rendered pages
  async function extractPhoneFromPdfImages(pdfBase64: string): Promise<string | null> {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const tempPdfPath = path.join(tempDir, `pdf_${timestamp}.pdf`);
    const pagePrefix = path.join(tempDir, `page_${timestamp}`);
    
    try {
      // Write PDF to temp file
      const buffer = Buffer.from(pdfBase64, "base64");
      fs.writeFileSync(tempPdfPath, buffer);
      
      // Convert PDF pages to images (better than pdfimages for text in graphics)
      console.log("[PDF] Converting PDF pages to images with pdftoppm...");
      await execAsync(`pdftoppm -png -r 150 "${tempPdfPath}" "${pagePrefix}"`);
      
      // Find rendered page images
      const files = fs.readdirSync(tempDir);
      const pageFiles = files
        .filter(f => f.startsWith(`page_${timestamp}`) && f.endsWith('.png'))
        .map(f => path.join(tempDir, f))
        .slice(0, 3); // Limit to first 3 pages
      
      console.log(`[PDF] Rendered ${pageFiles.length} page(s) from PDF`);
      
      // Analyze each page with Vision AI looking for phone numbers
      for (const pagePath of pageFiles) {
        try {
          const imageData = fs.readFileSync(pagePath);
          const base64 = imageData.toString('base64');
          
          // Use parsePropertyImageWithAI to analyze the full page
          const parsed = await parsePropertyImageWithAI(base64, "image/png");
          
          if (parsed.contattoTelefono) {
            console.log(`[PDF] Phone found in page: ${parsed.contattoTelefono}`);
            // Clean up all temp files
            cleanupTempFiles(tempPdfPath, pagePrefix, timestamp, tempDir);
            return parsed.contattoTelefono;
          }
        } catch (imgErr) {
          console.log(`[PDF] Page analysis failed for ${pagePath}`);
        }
      }
      
      // Fallback: also try extracting embedded images
      console.log("[PDF] No phone in pages, trying embedded images...");
      const imgPrefix = path.join(tempDir, `img_${timestamp}`);
      try {
        await execAsync(`pdfimages -png "${tempPdfPath}" "${imgPrefix}"`);
        const imgFiles = fs.readdirSync(tempDir)
          .filter(f => f.startsWith(`img_${timestamp}`) && f.endsWith('.png'))
          .map(f => path.join(tempDir, f))
          .slice(0, 5);
        
        for (const imgPath of imgFiles) {
          try {
            const imageData = fs.readFileSync(imgPath);
            const base64 = imageData.toString('base64');
            const parsed = await parsePropertyImageWithAI(base64, "image/png");
            if (parsed.contattoTelefono) {
              cleanupTempFiles(tempPdfPath, pagePrefix, timestamp, tempDir);
              cleanupTempFiles(tempPdfPath, imgPrefix, timestamp, tempDir);
              return parsed.contattoTelefono;
            }
          } catch {}
        }
        cleanupTempFiles(tempPdfPath, imgPrefix, timestamp, tempDir);
      } catch {}
      
      // Clean up temp files
      cleanupTempFiles(tempPdfPath, pagePrefix, timestamp, tempDir);
      return null;
    } catch (err) {
      console.error("[PDF] PDF processing error:", err);
      cleanupTempFiles(tempPdfPath, pagePrefix, timestamp, tempDir);
      return null;
    }
  }
  
  // Helper to clean up temp files
  function cleanupTempFiles(pdfPath: string, prefix: string, timestamp: number, tempDir: string) {
    try { fs.unlinkSync(pdfPath); } catch {}
    try {
      const files = fs.readdirSync(tempDir);
      for (const f of files) {
        if (f.includes(`${timestamp}`)) {
          try { fs.unlinkSync(path.join(tempDir, f)); } catch {}
        }
      }
    } catch {}
  }

  // Parse PDF with Vision AI (for PDFs with images/scanned content)
  app.post("/api/acquisizione/parse-pdf-vision", async (req, res) => {
    try {
      const { pdfImages, pdfText } = req.body;
      
      if (!pdfImages || !Array.isArray(pdfImages) || pdfImages.length === 0) {
        return res.status(400).json({ error: "Immagini PDF richieste" });
      }
      
      console.log(`Processing ${pdfImages.length} PDF image slices with Vision AI`);
      
      // Process all image slices and merge results
      const allParsedResults: any[] = [];
      
      for (let i = 0; i < Math.min(pdfImages.length, 10); i++) { // Max 10 slices
        try {
          console.log(`  Parsing slice ${i + 1}/${pdfImages.length}`);
          const parsed = await parsePropertyImageWithAI(pdfImages[i], "image/jpeg");
          allParsedResults.push(flattenAIResponse(parsed));
        } catch (sliceErr) {
          console.log(`  Slice ${i + 1} parsing failed:`, sliceErr);
        }
      }
      
      if (allParsedResults.length === 0) {
        return res.status(500).json({ error: "Impossibile analizzare le immagini del PDF" });
      }
      
      // Merge all slice results: keep first non-empty value for single fields, concatenate strings
      const merged: any = {};
      const stringFields = ["descrizione", "note"];
      
      for (const result of allParsedResults) {
        for (const [key, value] of Object.entries(result)) {
          if (value === null || value === undefined || value === "") continue;
          
          if (stringFields.includes(key) && typeof value === "string") {
            // Concatenate text fields
            merged[key] = merged[key] ? `${merged[key]} ${value}` : value;
          } else if (merged[key] === undefined || merged[key] === null || merged[key] === "") {
            // Keep first non-empty value for other fields
            merged[key] = value;
          }
        }
      }
      
      // If we also have extracted text, merge it to fill gaps
      if (pdfText && pdfText.length > 100) {
        try {
          const textParsed = await parsePropertyListingWithAI(pdfText);
          const flatText = flattenAIResponse(textParsed);
          
          // Fill in any missing fields from text extraction
          for (const [key, value] of Object.entries(flatText)) {
            if ((merged[key] === undefined || merged[key] === null || merged[key] === "") && value) {
              merged[key] = value;
            }
          }
          
          // Prefer longer description
          if (flatText.descrizione && (!merged.descrizione || flatText.descrizione.length > merged.descrizione.length)) {
            merged.descrizione = flatText.descrizione;
          }
        } catch (textErr) {
          console.log("Text parsing failed, using vision-only results");
        }
        
        // Post-processing: extract phone/email with regex if AI missed them
        if (!merged.contattoTelefono) {
          const phonePatterns = [
            /\+39[\s./-]*3\d{2}[\s./-]?\d{3}[\s./-]?\d{4}/g,
            /\+39[\s./-]*0\d{1,3}[\s./-]?\d{3,4}[\s./-]?\d{3,4}/g,
            /\b3\d{2}[\s./-]?\d{3}[\s./-]?\d{4}\b/g,
            /\b0\d{1,3}[\s./-]?\d{3,4}[\s./-]?\d{3,4}\b/g,
            /\(\d{2,4}\)[\s./-]?\d{3,4}[\s./-]?\d{3,4}/g,
          ];
          for (const pattern of phonePatterns) {
            const matches = pdfText.match(pattern);
            if (matches && matches.length > 0) {
              const phone = matches[0].replace(/[\s.()/-]/g, "");
              merged.contattoTelefono = phone.startsWith("+39") ? phone : phone;
              console.log(`Regex extracted phone: ${merged.contattoTelefono}`);
              break;
            }
          }
        }
        
        if (!merged.contattoEmail) {
          const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
          const matches = pdfText.match(emailPattern);
          if (matches && matches.length > 0) {
            merged.contattoEmail = matches[0].toLowerCase();
            console.log(`Regex extracted email: ${merged.contattoEmail}`);
          }
        }
      }
      
      console.log(`PDF Vision parsing complete. Merged fields: ${Object.keys(merged).length}`);
      res.json(merged);
    } catch (error) {
      console.error("Parse PDF Vision error:", error);
      res.status(500).json({ error: "Errore nell'analisi visiva del PDF" });
    }
  });

  // Receive data from browser extension and save
  app.post("/api/acquisizione/from-extension", async (req, res) => {
    try {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      
      const data = req.body;
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Dati annuncio non validi" });
      }
      
      // If we have full text, enhance with AI parsing
      let parsedData = data;
      if (data.testoCompleto && typeof data.testoCompleto === "string" && data.testoCompleto.length > 100) {
        try {
          const aiParsed = await parsePropertyListingWithAI(data.testoCompleto, data.url);
          parsedData = { ...data, ...aiParsed };
        } catch (e) {
          console.log("AI parsing failed, using raw data:", e);
        }
      }
      
      // Se telefono non disponibile ma c'è immagine del telefono, usa OCR con GPT-4o Vision
      if (!parsedData.contattoTelefono && data.contatto?.telefonoImmagine) {
        console.log("Phone hidden as image, attempting OCR:", data.contatto.telefonoImmagine);
        try {
          const extractedPhone = await extractPhoneFromImage(data.contatto.telefonoImmagine);
          if (extractedPhone) {
            parsedData.contattoTelefono = extractedPhone;
            console.log("OCR extracted phone:", extractedPhone);
          }
        } catch (e) {
          console.log("OCR phone extraction failed:", e);
        }
      }
      
      // Prendi il telefono dal contatto se non già presente
      if (!parsedData.contattoTelefono && data.contatto?.telefono) {
        parsedData.contattoTelefono = data.contatto.telefono;
      }
      
      // Sanitizzazione testo titolo/descrizione (rimuove noise UI dei portali)
      const cleanText = (raw: any): string => {
        if (!raw) return "";
        let s = String(raw);
        const junkPatterns = [
          /vedi mappa/gi,
          /aggiungi una nota/gi,
          /la tua nota/gi,
          /modifica/gi,
          /salva ricerca/gi,
          /condividi/gi,
          /segnala/gi,
        ];
        for (const p of junkPatterns) s = s.replace(p, "");
        s = s.replace(/\n{2,}/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
        return s;
      };
      parsedData.titolo = cleanText(parsedData.titolo);
      parsedData.descrizione = cleanText(parsedData.descrizione);
      // Email contatto sospetta: se è la nostra firma Paolo Salvemini, ignora
      const emailContatto = (parsedData.contattoEmail || "").toLowerCase();
      if (emailContatto.includes("salvemini") || emailContatto.includes("cavour")) {
        console.warn(`[Extension] Email contatto sospetta (nostra firma), rimossa: ${emailContatto}`);
        parsedData.contattoEmail = null;
      }

      // Build and validate immobile data - map AI fields to storage fields
      const mq = parsedData.mq ?? parsedData.superficie;
      const camere = parsedData.camere ?? parsedData.locali;
      
      const immobileData = {
        titolo: String(parsedData.titolo || "Annuncio importato").substring(0, 500),
        descrizione: parsedData.descrizione ? String(parsedData.descrizione).substring(0, 10000) : undefined,
        indirizzo: parsedData.indirizzo ? String(parsedData.indirizzo).substring(0, 300) : undefined,
        prezzo: typeof parsedData.prezzo === "number" ? parsedData.prezzo : undefined,
        zona: parsedData.zona ? String(parsedData.zona).substring(0, 200) : undefined,
        citta: parsedData.citta ? String(parsedData.citta).substring(0, 100) : undefined,
        mq: typeof mq === "number" ? mq : undefined,
        piano: typeof parsedData.piano === "number" ? parsedData.piano : undefined,
        pianiEdificio: typeof parsedData.pianiEdificio === "number" ? parsedData.pianiEdificio : undefined,
        camere: typeof camere === "number" ? camere : undefined,
        bagni: typeof parsedData.bagni === "number" ? parsedData.bagni : undefined,
        ascensore: parsedData.ascensore === true,
        balcone: parsedData.balcone === true,
        terrazzo: parsedData.terrazzo === true,
        box: parsedData.box === true,
        cantina: parsedData.cantina === true,
        giardino: parsedData.giardino === true,
        arredato: parsedData.arredato === true,
        statoNuovo: parsedData.statoNuovo === true,
        statoRistrutturato: parsedData.statoRistrutturato === true,
        statoBuono: parsedData.statoBuono === true,
        statoDaRistrutturare: parsedData.statoDaRistrutturare === true,
        classeEnergetica: parsedData.classeEnergetica ? String(parsedData.classeEnergetica).substring(0, 10) : undefined,
        prestazioneEnergetica: parsedData.prestazioneEnergetica ? String(parsedData.prestazioneEnergetica) : undefined,
        speseCondominiali: typeof parsedData.speseCondominiali === "number" ? parsedData.speseCondominiali : undefined,
        riscaldamento: parsedData.riscaldamento ? String(parsedData.riscaldamento).substring(0, 100) : undefined,
        esposizione: parsedData.esposizione ? String(parsedData.esposizione).substring(0, 100) : undefined,
        annoCostruzione: typeof parsedData.annoCostruzione === "number" ? parsedData.annoCostruzione : undefined,
        riferimentoAnnuncio: parsedData.riferimentoAnnuncio ? String(parsedData.riferimentoAnnuncio).substring(0, 100) : undefined,
        contattoNome: parsedData.contattoNome 
          ? String(parsedData.contattoNome).substring(0, 200) 
          : (parsedData.indirizzo ? `Proprietario di ${String(parsedData.indirizzo).substring(0, 150)}` : undefined),
        contattoTelefono: parsedData.contattoTelefono ? normalizeItalianPhoneNumber(String(parsedData.contattoTelefono)) : undefined,
        contattoEmail: parsedData.contattoEmail ? String(parsedData.contattoEmail).substring(0, 200) : undefined,
        urlAnnuncio: parsedData.url ? String(parsedData.url).substring(0, 1000) : undefined,
        testoOriginale: parsedData.testoCompleto ? String(parsedData.testoCompleto).substring(0, 5000) : undefined,
        fonte: parsedData.fonte || (parsedData.url ? new URL(String(parsedData.url)).hostname.replace("www.", "") : "estensione"),
        caratteristiche: typeof parsedData.caratteristiche === "object" ? parsedData.caratteristiche : undefined,
        // Nuovi campi per contatto via form
        contattoMetodo: parsedData.contattoMetodo || (parsedData.contattoTelefono ? "telefono" : (parsedData.contattoEmail ? "email" : "form")),
        formUrl: parsedData.formUrl ? String(parsedData.formUrl).substring(0, 1000) : undefined,
        portale: parsedData.portale ? String(parsedData.portale).substring(0, 100) : undefined,
      };
      
      // Check if it's an agency listing - multiple detection methods
      const contattoTipo = data.contatto?.tipo || parsedData.contattoTipo || "";
      const contattoNome = data.contatto?.nome || parsedData.contattoNome || "";
      const testoCompleto = (parsedData.testoCompleto || parsedData.descrizione || "").toLowerCase();
      
      // Explicit agency type from extension
      const tipoAgenzia = typeof contattoTipo === "string" && (
        contattoTipo.toLowerCase() === "agenzia" ||
        contattoTipo.toLowerCase() === "agency" ||
        contattoTipo.toLowerCase().includes("agenz") ||
        contattoTipo.toLowerCase() === "professionale" ||
        contattoTipo.toLowerCase() === "professional"
      );
      
      // Agency keywords in contact name only (more reliable)
      const agencyKeywordsNome = [
        "immobiliare", "agenzia", "real estate", "realty", "agency", 
        "s.r.l.", "srl", "s.p.a.", "spa", "s.n.c.", "snc", "s.a.s.", "sas",
        "group", "properties", "consulting", "servizi", "mediazione"
      ];
      const nomeAgenzia = typeof contattoNome === "string" && 
        agencyKeywordsNome.some(kw => contattoNome.toLowerCase().includes(kw));
      
      // Check if explicitly marked as private (should NOT be agency)
      const esplicitamentePrivato = 
        testoCompleto.includes("no agenzia") ||
        testoCompleto.includes("no agenzie") ||
        testoCompleto.includes("vendita diretta") ||
        testoCompleto.includes("privato\n") ||
        testoCompleto.includes("\nprivato") ||
        (typeof contattoTipo === "string" && contattoTipo.toLowerCase() === "privato");
      
      // Check for phrases in text that indicate agency listing (first-person agency voice)
      const testoIndicaAgenzia = !esplicitamentePrivato && (
        testoCompleto.includes("proponiamo in vendita") ||
        testoCompleto.includes("proponiamo in stabile") ||
        testoCompleto.includes("proponiamo splendido") ||
        testoCompleto.includes("proponiamo questo") ||
        testoCompleto.includes("proponiamo un") ||
        testoCompleto.includes("la nostra agenzia") ||
        testoCompleto.includes("l'agenzia propone") ||
        testoCompleto.includes("propone in vendita") ||
        testoCompleto.includes("la nostra società") ||
        // Look for agency name patterns at end of listing (contact section)
        /\n[a-z]+ (immobiliare|real estate|realty)\n/i.test(testoCompleto) ||
        /\nimmobiliare [a-z]+\n/i.test(testoCompleto)
      );
      
      // Final agency detection: explicitly private overrides everything
      const isAgenzia = !esplicitamentePrivato && (tipoAgenzia || nomeAgenzia || testoIndicaAgenzia);
      
      console.log(`[Extension Import] Contact type: "${contattoTipo}", Contact name: "${contattoNome.substring(0,50)}", esplicitamentePrivato: ${esplicitamentePrivato}, tipoAgenzia: ${tipoAgenzia}, nomeAgenzia: ${nomeAgenzia}, testoIndicaAgenzia: ${testoIndicaAgenzia}, isAgenzia: ${isAgenzia}`);
      
      if (isAgenzia) {
        // Save to Mercato (opportunita_mercato) for agency listings
        const opportunitaData = {
          titolo: String(parsedData.titolo || "Annuncio importato").substring(0, 500),
          descrizione: parsedData.descrizione ? String(parsedData.descrizione).substring(0, 10000) : undefined,
          indirizzo: parsedData.indirizzo ? String(parsedData.indirizzo).substring(0, 300) : undefined,
          prezzo: typeof parsedData.prezzo === "number" ? String(parsedData.prezzo) : undefined,
          zona: parsedData.zona ? String(parsedData.zona).substring(0, 200) : undefined,
          citta: parsedData.citta ? String(parsedData.citta).substring(0, 100) : undefined,
          mq: typeof (parsedData.mq ?? parsedData.superficie) === "number" ? (parsedData.mq ?? parsedData.superficie) : undefined,
          piano: typeof parsedData.piano === "number" ? parsedData.piano : undefined,
          pianiEdificio: typeof parsedData.pianiEdificio === "number" ? parsedData.pianiEdificio : undefined,
          camere: typeof (parsedData.camere ?? parsedData.locali) === "number" ? (parsedData.camere ?? parsedData.locali) : undefined,
          bagni: typeof parsedData.bagni === "number" ? parsedData.bagni : undefined,
          ascensore: parsedData.ascensore === true,
          balcone: parsedData.balcone === true,
          terrazzo: parsedData.terrazzo === true,
          box: parsedData.box === true,
          cantina: parsedData.cantina === true,
          giardino: parsedData.giardino === true,
          arredato: parsedData.arredato === true,
          classeEnergetica: parsedData.classeEnergetica ? String(parsedData.classeEnergetica).substring(0, 10) : undefined,
          speseCondominiali: typeof parsedData.speseCondominiali === "number" ? String(parsedData.speseCondominiali) : undefined,
          riscaldamento: parsedData.riscaldamento ? String(parsedData.riscaldamento).substring(0, 100) : undefined,
          stato: "in_valutazione" as const,
          note: `Importato da estensione - Fonte: ${parsedData.fonte || "portale"}`,
        };
        
        const opportunita = await storage.createOpportunitaMercato(opportunitaData);
        
        // Add the agency to pubblicizzato_da
        const nomeAgenzia = data.contatto?.nome || parsedData.contattoNome || "Agenzia";
        const portale = parsedData.fonte || (parsedData.url ? new URL(String(parsedData.url)).hostname.replace("www.", "") : undefined);
        
        await storage.createPubblicizzatoDa({
          opportunitaId: opportunita.id,
          nomeAgenzia: String(nomeAgenzia).substring(0, 200),
          portale: portale ? String(portale).substring(0, 100) : undefined,
          urlAnnuncio: parsedData.url ? String(parsedData.url).substring(0, 1000) : undefined,
          prezzo: typeof parsedData.prezzo === "number" ? String(parsedData.prezzo) : undefined,
          telefono: parsedData.contattoTelefono ? normalizeItalianPhoneNumber(String(parsedData.contattoTelefono)) : undefined,
          email: parsedData.contattoEmail ? String(parsedData.contattoEmail).substring(0, 200) : undefined,
        });
        
        console.log(`[Extension] Agency listing saved to Mercato: ${opportunita.id} - ${nomeAgenzia}`);
        
        // Auto-generate matching in background
        generateMatchingForOpportunita(opportunita.id).catch(e => 
          console.error("[Auto-Matching] Error for extension mercato:", e)
        );
        
        return res.status(201).json({ 
          success: true, 
          id: opportunita.id, 
          destination: "mercato",
          message: "Annuncio agenzia importato in Mercato" 
        });
      }
      
      // Save to Acquisizione (immobili_esterni) for private listings
      const validated = insertImmobileEsternoSchema.safeParse(immobileData);
      if (!validated.success) {
        console.error("Extension data validation failed:", validated.error);
        return res.status(400).json({ error: "Dati non validi", details: validated.error.flatten() });
      }

      // ===== DEDUP =====
      // Cerca esistente con stesso indirizzo normalizzato + mq + prezzo (± 5%).
      // Se match → arricchisce la scheda con la nuova fonte invece di creare duplicato.
      const normIndirizzo = (validated.data.indirizzo || "").toLowerCase().replace(/[,\.;]/g, " ").replace(/\s+/g, " ").trim();
      const dedupMq = validated.data.mq ?? null;
      const dedupPrezzo = validated.data.prezzo ?? null;
      const nuovaFonte = validated.data.fonte || (validated.data.urlAnnuncio ? new URL(validated.data.urlAnnuncio).hostname.replace("www.", "") : null);

      console.log(`[Extension/DEDUP] check input: indirizzo='${normIndirizzo}' mq=${dedupMq} prezzo=${dedupPrezzo} fonte=${nuovaFonte}`);

      if (normIndirizzo && dedupMq && dedupPrezzo) {
        try {
          // Estraggo solo le parole significative dell'indirizzo (rimuovo "via", "viale", "corso", numeri civici stand-alone)
          const stopWords = ['via', 'viale', 'corso', 'piazza', 'piazzale', 'strada'];
          const tokensIndirizzo = normIndirizzo.split(' ').filter(t => !stopWords.includes(t) && t.length > 1);
          // Pattern flessibile per ILIKE — tutte le parole significative presenti
          const patternIndirizzo = `%${tokensIndirizzo.join('%')}%`;
          console.log(`[Extension/DEDUP] pattern='${patternIndirizzo}' mq=${dedupMq} prezzo_range=${Number(dedupPrezzo) * 0.95}-${Number(dedupPrezzo) * 1.05}`);
          const candidates = await pool.query(
            `SELECT id, fonte, url_annuncio, indirizzo, mq, prezzo, contatto_telefono, contatto_email
             FROM immobili_esterni
             WHERE attivo = true
               AND lower(indirizzo) ILIKE $1
               AND mq = $2
               AND prezzo BETWEEN $3 AND $4
             LIMIT 5`,
            [patternIndirizzo, dedupMq, Number(dedupPrezzo) * 0.95, Number(dedupPrezzo) * 1.05],
          );
          console.log(`[Extension/DEDUP] candidates trovati: ${candidates.rowCount}`);
          if (candidates.rowCount && candidates.rowCount > 0) {
            const existing = candidates.rows[0];
            // arricchisci campi mancanti
            const fields: string[] = [];
            const params: any[] = [];
            let idx = 1;
            if (nuovaFonte && nuovaFonte !== existing.fonte) {
              fields.push(`fonte = $${idx++}`);
              params.push(`${existing.fonte || ""}|${nuovaFonte}`.replace(/^\|/, ""));
            }
            if (validated.data.urlAnnuncio && !existing.url_annuncio?.includes(validated.data.urlAnnuncio)) {
              fields.push(`url_annuncio = $${idx++}`);
              params.push(`${existing.url_annuncio || ""}\n${validated.data.urlAnnuncio}`.trim());
            }
            if (validated.data.contattoTelefono && !existing.contatto_telefono) {
              fields.push(`contatto_telefono = $${idx++}`);
              params.push(validated.data.contattoTelefono);
            }
            if (validated.data.contattoEmail && !existing.contatto_email) {
              fields.push(`contatto_email = $${idx++}`);
              params.push(validated.data.contattoEmail);
            }
            fields.push(`updated_at = NOW()`);
            params.push(existing.id);
            await pool.query(
              `UPDATE immobili_esterni SET ${fields.join(", ")} WHERE id = $${idx}`,
              params,
            );
            console.log(`[Extension/DEDUP] Merge in immobile ${existing.id} (era già presente, arricchito con fonte/dati)`);

            // Pre-genera bozza WhatsApp anche per il caso dedup
            let bozzaTestoDedup: string | null = null;
            try {
              const bozzaResp = await fetch(`${req.protocol}://${req.get("host")}/api/acquisizione/${existing.id}/genera-bozza-whatsapp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              });
              if (bozzaResp.ok) {
                const bj = await bozzaResp.json();
                bozzaTestoDedup = (bj && (bj.testo || bj.message)) || null;
              }
            } catch (e) {
              console.warn("[Extension/DEDUP] Pre-generazione bozza fallita:", e);
            }

            return res.status(200).json({
              success: true,
              id: existing.id,
              destination: "acquisizione",
              deduplicato: true,
              message: "Immobile già presente — scheda arricchita con la nuova fonte",
              bozza: bozzaTestoDedup,
            });
          }
        } catch (dedupErr) {
          console.warn("[Extension/DEDUP] errore check, proseguo con insert:", dedupErr);
        }
      }
      // ===== /DEDUP =====

      const immobile = await storage.createImmobileEsterno(validated.data);
      console.log(`[Extension] Private listing saved to Acquisizione: ${immobile.id}`);

      // Pre-genera bozza WhatsApp così l'estensione la può usare per compilare il form
      // senza dover fare una seconda fetch (che spesso fallisce per CSP/CORS dell'estensione)
      let bozzaTesto: string | null = null;
      try {
        const bozzaResp = await fetch(`${req.protocol}://${req.get("host")}/api/acquisizione/${immobile.id}/genera-bozza-whatsapp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (bozzaResp.ok) {
          const bj = await bozzaResp.json();
          bozzaTesto = (bj && (bj.testo || bj.message)) || null;
        }
      } catch (e) {
        console.warn("[Extension] Pre-generazione bozza fallita:", e);
      }

      res.status(201).json({
        success: true,
        id: immobile.id,
        destination: "acquisizione",
        message: "Annuncio importato con successo",
        bozza: bozzaTesto, // null se la generazione fallisce; l'estensione gestisce il caso
      });
    } catch (error) {
      console.error("Extension import error:", error);
      res.status(500).json({ error: "Errore nell'importazione dell'annuncio" });
    }
  });

  // Handle CORS preflight for extension
  app.options("/api/acquisizione/from-extension", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });

  // Create external property (from parsed data)
  app.post("/api/acquisizione", async (req, res) => {
    try {
      const parsed = insertImmobileEsternoSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      
      // Extract property facts from description using AI
      let extractedFacts = null;
      const descrizioneOrTesto = parsed.data.descrizione || parsed.data.testoOriginale;
      if (descrizioneOrTesto) {
        try {
          extractedFacts = await extractPropertyFacts(descrizioneOrTesto);
          console.log("Extracted property facts:", extractedFacts);
        } catch (e) {
          console.log("Could not extract property facts:", e);
        }
      }
      
      // Auto-create prospect client if we have contact info (phone or email required)
      let clienteProspect = null;
      const { contattoTelefono, contattoEmail } = parsed.data;
      
      // Filter invalid phone values
      const invalidPhoneValues = ['non disponibile', 'nascosto', 'privato', 'n/a', 'nd', '-', ''];
      const isValidPhone = (phone: string | null | undefined): boolean => {
        if (!phone) return false;
        const normalized = phone.toLowerCase().replace(/\s+/g, '');
        if (invalidPhoneValues.some(v => normalized === v.replace(/\s+/g, ''))) return false;
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 8;
      };
      
      const normalizedPhone = isValidPhone(contattoTelefono) ? contattoTelefono?.replace(/\s+/g, '').trim() : undefined;
      const normalizedEmail = contattoEmail?.toLowerCase().trim();
      
      // Extract short street name from address (e.g. "Via Antonio Panizzi 15" → "Via Panizzi")
      const extractStreetName = (address: string): string => {
        // Remove civic number at end
        const withoutNumber = address.replace(/\s*,?\s*\d+[a-zA-Z]?\s*$/, '').trim();
        // Match Via/Viale/Piazza/Corso/Largo + name
        const match = withoutNumber.match(/^(Via|Viale|Piazza|Corso|Largo|Vicolo|Piazzale)\s+(.+)$/i);
        if (match) {
          const prefix = match[1];
          const nameParts = match[2].split(/\s+/);
          // Take last word as the main street name (skip middle names like "Antonio")
          const mainName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
          return `${prefix} ${mainName}`;
        }
        return withoutNumber || address;
      };
      
      // Generate contact name: use provided name or "Proprietario di [via]"
      let generatedContactName = "Proprietario";
      if (parsed.data.contattoNome && parsed.data.contattoNome.toLowerCase() !== "privato") {
        generatedContactName = parsed.data.contattoNome;
      } else if (parsed.data.indirizzo) {
        const streetName = extractStreetName(parsed.data.indirizzo);
        generatedContactName = `Proprietario di ${streetName}`;
      }
      
      if (normalizedPhone || normalizedEmail) {
        // Parse name into nome/cognome
        const nameParts = generatedContactName.trim().split(" ");
        const nome = nameParts[0] || "Proprietario";
        const cognome = nameParts.slice(1).join(" ") || "";
        
        // Check if client with same phone/email already exists
        const esistenti = await storage.getClienti();
        const esistente = esistenti.find(c => {
          const clientPhone = c.telefono?.replace(/\s+/g, '').trim();
          const clientEmail = c.email?.toLowerCase().trim();
          return (normalizedPhone && clientPhone === normalizedPhone) ||
                 (normalizedEmail && clientEmail === normalizedEmail);
        });
        
        if (!esistente) {
          try {
            clienteProspect = await storage.createCliente({
              appellativo: "",
              nome,
              cognome: cognome || "Sconosciuto",
              telefono: normalizedPhone || "",
              email: normalizedEmail || "",
              compleanno: "",
              religione: "",
              tipoCliente: "venditore",
              note: `Prospect da acquisizione: ${parsed.data.titolo}`,
              ratingCliente: 1,
              attivo: true,
            });
          } catch (e) {
            console.log("Could not create prospect client:", e);
          }
        } else {
          clienteProspect = esistente;
        }
      }
      
      // Check if this phone number has already been contacted
      let duplicateWarning = null;
      if (normalizedPhone) {
        const allProperties = await storage.getImmobiliEsterni();
        const alreadyContactedWithSamePhone = allProperties.find(p => {
          if (!p.contattoTelefono) return false;
          const propPhone = p.contattoTelefono.replace(/\D/g, '');
          const inputPhone = normalizedPhone.replace(/\D/g, '');
          return propPhone === inputPhone && p.statoContatto === "contattato";
        });
        
        if (alreadyContactedWithSamePhone) {
          duplicateWarning = {
            message: `Attenzione: questo numero (${normalizedPhone}) e gia stato contattato per l'immobile "${alreadyContactedWithSamePhone.titolo}"`,
            existingProperty: {
              id: alreadyContactedWithSamePhone.id,
              titolo: alreadyContactedWithSamePhone.titolo,
              indirizzo: alreadyContactedWithSamePhone.indirizzo
            }
          };
        }
        
        // Also check WhatsApp conversations
        const whatsappConversations = await storage.getWhatsappConversations();
        const existingConversation = whatsappConversations.find(c => {
          const convPhone = c.phoneNumber.replace(/\D/g, '');
          const inputPhone = normalizedPhone.replace(/\D/g, '');
          return convPhone === inputPhone;
        });
        
        if (existingConversation && !duplicateWarning) {
          duplicateWarning = {
            message: `Attenzione: questo numero (${normalizedPhone}) ha gia una conversazione WhatsApp attiva`,
            existingConversation: {
              phoneNumber: existingConversation.phoneNumber
            }
          };
        }
      }

      // Merge extracted facts with parsed data (extracted facts fill in missing fields)
      let enrichedData = { ...parsed.data };
      if (extractedFacts) {
        // Map extracted facts to schema fields (only fill if not already provided)
        const parsePiano = (piano: string | null): number | null => {
          if (!piano) return null;
          const lower = piano.toLowerCase();
          if (lower === "terra" || lower === "t" || lower === "pt") return 0;
          if (lower === "rialzato" || lower === "r") return 1;
          const num = parseInt(piano);
          return isNaN(num) ? null : num;
        };
        
        // Safely coerce boolean values (avoid undefined becoming false unexpectedly)
        const safeBoolean = (val: boolean | null | undefined, current: boolean | null | undefined): boolean | undefined => {
          if (current !== null && current !== undefined) return current;
          return val === true ? true : undefined;
        };
        
        // Check if balconi count is valid and > 0
        const hasBalcone = typeof extractedFacts.balconi === 'number' && extractedFacts.balconi > 0;
        
        enrichedData = {
          ...enrichedData,
          // Only override if the field is empty/null
          zona: enrichedData.zona || extractedFacts.zona_testuale || undefined,
          camere: enrichedData.camere ?? extractedFacts.numero_camere ?? undefined,
          bagni: enrichedData.bagni ?? extractedFacts.numero_bagni ?? undefined,
          piano: enrichedData.piano ?? parsePiano(extractedFacts.piano) ?? undefined,
          ascensore: safeBoolean(extractedFacts.ascensore, enrichedData.ascensore),
          balcone: enrichedData.balcone === true ? true : (hasBalcone ? true : undefined),
          terrazzo: safeBoolean(extractedFacts.terrazzo, enrichedData.terrazzo),
          cantina: safeBoolean(extractedFacts.cantina, enrichedData.cantina),
          arredato: safeBoolean(extractedFacts.arredato, enrichedData.arredato),
          box: safeBoolean(extractedFacts.posto_auto_o_bici, enrichedData.box),
          statoRistrutturato: safeBoolean(extractedFacts.ristrutturato, enrichedData.statoRistrutturato),
          classeEnergetica: enrichedData.classeEnergetica || extractedFacts.classe_energetica || undefined,
          // Store additional extracted data in caratteristiche
          caratteristiche: {
            ...(enrichedData.caratteristiche || {}),
            extractedFacts: {
              tipo_unita: extractedFacts.tipo_unita,
              doppia_esposizione: extractedFacts.doppia_esposizione,
              ultimo_piano: extractedFacts.ultimo_piano,
              portineria: extractedFacts.portineria,
              anno_ristrutturazione: extractedFacts.anno_ristrutturazione,
              metro_o_trasporti: extractedFacts.metro_o_trasporti,
              balconi: extractedFacts.balconi
            }
          }
        };
      }
      
      // Create immobile with clienteId if we have a prospect
      const immobileData = clienteProspect 
        ? { ...enrichedData, clienteId: clienteProspect.id }
        : enrichedData;
      
      const immobile = await storage.createImmobileEsterno(immobileData);
      
      res.status(201).json({ immobile, clienteProspect, duplicateWarning });
    } catch (error) {
      console.error("Create acquisizione error:", error);
      res.status(500).json({ error: "Errore nella creazione dell'immobile" });
    }
  });

  // Update external property
  app.patch("/api/acquisizione/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertImmobileEsternoSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      
      // Get current immobile to check if this is a form contact registration
      const currentImmobile = await storage.getImmobileEsterno(id);
      if (!currentImmobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }
      
      // If registering form submission (ultimoTentativoForm set, no proprietarioId yet, contattoMetodo is form)
      const isFormContactRegistration = 
        parsed.data.ultimoTentativoForm && 
        !currentImmobile.proprietarioId &&
        currentImmobile.contattoMetodo === "form";
      
      let proprietarioId = currentImmobile.proprietarioId;
      
      if (isFormContactRegistration) {
        // Create prospect client "Proprietario Via..."
        const via = currentImmobile.indirizzo || currentImmobile.zona || "Sconosciuto";
        const nuovoCliente = await storage.createCliente({
          nome: "Proprietario",
          cognome: via,
          telefono: "",
          email: currentImmobile.contattoEmail || "",
          tipoCliente: "venditore",
          ratingCliente: 1,
          note: `Prospect da acquisizione form: ${currentImmobile.titolo || via}\nPortale: ${currentImmobile.portale || currentImmobile.fonte || "N/D"}\nURL: ${currentImmobile.urlAnnuncio || "N/D"}`,
        });
        proprietarioId = nuovoCliente.id;
        console.log(`[Form Acquisition] Created prospect client ${nuovoCliente.id}: Proprietario ${via}`);
      }
      
      // Update immobile with proprietarioId if created
      const updateData = {
        ...parsed.data,
        ...(proprietarioId && !currentImmobile.proprietarioId ? { proprietarioId } : {})
      };
      
      const immobile = await storage.updateImmobileEsterno(id, updateData);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }
      res.json(immobile);
    } catch (error) {
      console.error("Update acquisizione error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'immobile" });
    }
  });

  // Delete external property
  app.delete("/api/acquisizione/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteImmobileEsterno(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete acquisizione error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione dell'immobile" });
    }
  });

  // Get comunicazioni for immobile esterno (includes communications linked to associated cliente)
  app.get("/api/acquisizione/:id/comunicazioni", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the immobile esterno to find the associated cliente
      const immobile = await storage.getImmobileEsterno(id);
      
      // Get communications linked directly to immobile esterno
      const comunicazioniImmobile = await storage.getComunicazioniByImmobileEsterno(id);
      
      // If there's an associated cliente, also get their communications
      let comunicazioniCliente: any[] = [];
      if (immobile?.clienteId) {
        comunicazioniCliente = await storage.getComunicazioni(immobile.clienteId);
      }
      
      // Merge and deduplicate (by id), then sort by date descending
      const allComunicazioni = [...comunicazioniImmobile];
      const existingIds = new Set(comunicazioniImmobile.map(c => c.id));
      
      for (const com of comunicazioniCliente) {
        if (!existingIds.has(com.id)) {
          allComunicazioni.push(com);
        }
      }
      
      // Sort by date descending
      allComunicazioni.sort((a, b) => {
        const dateA = new Date(a.dataOra).getTime();
        const dateB = new Date(b.dataOra).getTime();
        return dateB - dateA;
      });
      
      res.json(allComunicazioni);
    } catch (error) {
      console.error("Get comunicazioni by immobile esterno error:", error);
      res.status(500).json({ error: "Errore nel recupero delle comunicazioni" });
    }
  });

  // Get appuntamenti for immobile esterno
  app.get("/api/acquisizione/:id/appuntamenti", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const appuntamenti = await storage.getAppuntamentiByImmobileEsterno(id);
      res.json(appuntamenti);
    } catch (error) {
      console.error("Get appuntamenti by immobile esterno error:", error);
      res.status(500).json({ error: "Errore nel recupero degli appuntamenti" });
    }
  });

  // Attività Immobile Esterno (Acquisizione)
  app.get("/api/acquisizione/:id/attivita", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attivita = await storage.getAttivitaImmobileEsterno(id);
      res.json(attivita);
    } catch (error) {
      console.error("Get attivita immobile esterno error:", error);
      res.status(500).json({ error: "Errore nel recupero delle attività" });
    }
  });

  app.post("/api/acquisizione/:id/attivita", async (req, res) => {
    try {
      const immobileEsternoId = parseInt(req.params.id);
      const attivita = await storage.createAttivitaImmobileEsterno({ ...req.body, immobileEsternoId });
      res.status(201).json(attivita);
    } catch (error) {
      console.error("Create attivita immobile esterno error:", error);
      res.status(500).json({ error: "Errore nella creazione dell'attività" });
    }
  });

  app.patch("/api/acquisizione/attivita/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attivita = await storage.updateAttivitaImmobileEsterno(id, req.body);
      res.json(attivita);
    } catch (error) {
      console.error("Update attivita immobile esterno error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dell'attività" });
    }
  });

  app.delete("/api/acquisizione/attivita/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAttivitaImmobileEsterno(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete attivita immobile esterno error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione dell'attività" });
    }
  });

  // Generate personalized acquisition message with automatic mirroring
  // Automatically uses short format (max 400 chars) for Idealista listings
  app.post("/api/acquisizione/:id/generate-message", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { template, format: requestedFormat } = req.body;
      
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }

      // Usa sempre formato corto per tutti i portali
      const format = requestedFormat || "idealista";
      const isShort = true;
      
      console.log(`[Generate Message] ID: ${id}, fonte: ${immobile.fonte}, format: ${format}, isShort: ${isShort}`);

      // Import templates - usa SEMPRE lo stesso MIRRORING_PROMPT di qualità per tutti
      const { 
        MIRRORING_PROMPT, 
        MIRRORING_CONFIG, 
        DEFAULT_ACQUISITION_MESSAGE,
        SHORT_ACQUISITION_MESSAGE
      } = await import("./bot-config");
      
      // Build mirroring context using the new schema
      // PRIORITÀ: testoOriginale > descrizione > titolo
      // testoOriginale contiene il testo completo dell'annuncio dal portale
      let testoAnnuncio = '';
      
      const descrizione = immobile.descrizione || '';
      const testoOriginale = (immobile as any).testoOriginale || '';
      
      const descrizioneInutile = descrizione.toLowerCase().includes('aggiungi una nota') || 
                                  descrizione.toLowerCase().includes('modifica') ||
                                  descrizione.toLowerCase().includes('la tua nota') ||
                                  descrizione.trim().length < 80;
      
      if (testoOriginale && testoOriginale.length > 100) {
        // Limita a 3000 caratteri per evitare di mandare troppo rumore all'AI
        testoAnnuncio = testoOriginale.substring(0, 3000);
      } else if (!descrizioneInutile && descrizione.length > 80) {
        testoAnnuncio = descrizione;
      } else {
        testoAnnuncio = immobile.titolo || 'Immobile in vendita';
      }
      
      // Determine tipo_unita from camere count OR from title
      let tipoUnita: string | null = null;
      if (immobile.camere) {
        const camereNum = Number(immobile.camere);
        if (camereNum === 1) tipoUnita = "monolocale";
        else if (camereNum === 2) tipoUnita = "bilocale";
        else if (camereNum === 3) tipoUnita = "trilocale";
        else if (camereNum >= 4) tipoUnita = "quadrilocale";
      } else {
        // Extract from title if not in camere
        const titoloLower = (immobile.titolo || '').toLowerCase();
        if (titoloLower.includes('monolocale')) tipoUnita = "monolocale";
        else if (titoloLower.includes('bilocale')) tipoUnita = "bilocale";
        else if (titoloLower.includes('trilocale')) tipoUnita = "trilocale";
        else if (titoloLower.includes('quadrilocale') || titoloLower.includes('4 locali')) tipoUnita = "quadrilocale";
        else if (titoloLower.includes('attico')) tipoUnita = "attico";
        else if (titoloLower.includes('loft')) tipoUnita = "loft";
      }
      
      // Determine zona_o_via - prefer indirizzo if complete
      const zonaOVia = immobile.indirizzo || immobile.zona || null;
      
      // Build context message for AI con più dati strutturati
      let context = `Testo annuncio:\n"${testoAnnuncio}"`;
      if (tipoUnita) context += `\n\nTipo unità: ${tipoUnita}`;
      if (zonaOVia && !zonaOVia.toLowerCase().includes('mappa')) context += `\nIndirizzo: ${zonaOVia}`;
      if (immobile.mq) context += `\nMetratura: ${immobile.mq} mq`;
      if (immobile.prezzo) context += `\nPrezzo: €${Number(immobile.prezzo).toLocaleString('it-IT')}`;
      
      // Add additional extracted fields for richer context
      const campiEstratti: string[] = [];
      if (immobile.balcone) campiEstratti.push("balcone presente");
      if (immobile.terrazzo) campiEstratti.push("terrazzo presente");
      if (immobile.statoRistrutturato) campiEstratti.push("ristrutturato");
      if (immobile.statoNuovo) campiEstratti.push("nuovo");
      if (immobile.classeEnergetica) campiEstratti.push(`classe energetica ${immobile.classeEnergetica}`);
      if (immobile.ascensore) campiEstratti.push("ascensore presente");
      if (immobile.bagni) campiEstratti.push(`${immobile.bagni} bagni`);
      
      // Add AI-extracted facts from caratteristiche if available
      const extractedFacts = (immobile.caratteristiche as any)?.extractedFacts;
      if (extractedFacts) {
        if (extractedFacts.tipo_unita && !tipoUnita) tipoUnita = extractedFacts.tipo_unita;
        if (extractedFacts.doppia_esposizione) campiEstratti.push("doppia esposizione");
        if (extractedFacts.ultimo_piano) campiEstratti.push("ultimo piano");
        if (extractedFacts.portineria) campiEstratti.push("portineria");
        if (extractedFacts.metro_o_trasporti) campiEstratti.push(`vicino a ${extractedFacts.metro_o_trasporti}`);
        if (extractedFacts.balconi && extractedFacts.balconi > 1) campiEstratti.push(`${extractedFacts.balconi} balconi`);
      }
      
      if (campiEstratti.length > 0) {
        context += `\n\nCampi già estratti:\n${campiEstratti.join("\n")}`;
      }

      const OpenAI = (await import("openai")).default;
      const openaiClient = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      // Template unico per tutti i canali (web e WhatsApp)
      const messageTemplate = DEFAULT_ACQUISITION_MESSAGE;
      
      const mirroringResponse = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: MIRRORING_PROMPT + '\n\nRispondi SOLO con JSON: {"mirroring": "testo"}' },
          { role: "user", content: context }
        ],
        temperature: MIRRORING_CONFIG.temperature,
        max_tokens: MIRRORING_CONFIG.max_tokens,
        response_format: { type: "json_object" }
      });

      let mirroringText = mirroringResponse.choices[0]?.message?.content?.trim() || "";
      
      // Parse JSON response
      if (mirroringText.startsWith('{')) {
        try {
          const parsed = JSON.parse(mirroringText);
          mirroringText = parsed.mirroring || mirroringText;
        } catch {
          // Not JSON, use as-is
        }
      }

      // Build the complete message using template unico
      const message = messageTemplate.replace(/\{\{mirroring\}\}/g, mirroringText);
      
      console.log(`[Generate Message] Generated ${message.length} chars (format: ${format})`);
      res.json({ message, format, charCount: message.length });
    } catch (error) {
      console.error("Generate message error:", error);
      res.status(500).json({ error: "Errore nella generazione del messaggio" });
    }
  });

  // Send WhatsApp message and update immobile status
  app.post("/api/acquisizione/:id/send-whatsapp", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { message, phone } = req.body;
      
      if (!message || !phone) {
        return res.status(400).json({ error: "Messaggio e telefono richiesti" });
      }

      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }

      // Send WhatsApp message
      const { sendWhatsAppMessage } = await import("./ultramsg");
      const result = await sendWhatsAppMessage(phone, message);
      
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }

      // Update immobile status
      await storage.updateImmobileEsterno(id, {
        statoContatto: "contattato",
        messaggioInviato: message,
        dataContatto: new Date(),
      });

      // Use the same normalizeItalianPhone function for consistent format (39xxxxxxxxxx)
      const { normalizeItalianPhone: normalizePhoneFn } = await import("./ultramsg");
      const normalizedPhone = normalizePhoneFn(phone);
      
      // Create or find client "Proprietario [Via]"
      // Extract street name from address (e.g. "Via Antonio Panizzi 15" → "Via Panizzi")
      const extractStreetName = (address: string): string => {
        // Remove civic number at end
        const withoutNumber = address.replace(/\s*,?\s*\d+[a-zA-Z]?\s*$/, '').trim();
        // Match Via/Viale/Piazza/Corso/Largo + name
        const match = withoutNumber.match(/^(Via|Viale|Piazza|Corso|Largo|Vicolo|Piazzale)\s+(.+)$/i);
        if (match) {
          const prefix = match[1];
          const nameParts = match[2].split(/\s+/);
          // Take last word as the main street name (skip middle names like "Antonio")
          const mainName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
          return `${prefix} ${mainName}`;
        }
        return withoutNumber || address;
      };
      
      // Use address (via) first, fallback to titolo (which often contains the via), then zona
      let streetName = "Immobile";
      if (immobile.indirizzo) {
        streetName = extractStreetName(immobile.indirizzo);
      } else if (immobile.titolo) {
        // Titolo spesso contiene la via, es: "Bilocale via Antonio Panizzi 15, Lorenteggio, Milano"
        const viaMatch = immobile.titolo.match(/(Via|Viale|Piazza|Corso|Largo|Vicolo|Piazzale)\s+[^,\d]+/i);
        if (viaMatch) {
          streetName = extractStreetName(viaMatch[0]);
        } else if (immobile.zona) {
          streetName = immobile.zona;
        }
      } else if (immobile.zona) {
        streetName = immobile.zona;
      }
      
      // Helper for comparing phones (strip 39 prefix for comparison)
      const stripPrefix = (p: string) => p?.replace(/\D/g, '').replace(/^(0039|39)/, '') || '';
      
      // Check if client already exists by phone
      const clienti = await storage.getClienti();
      let cliente = clienti.find(c => stripPrefix(c.telefono || '') === stripPrefix(normalizedPhone));
      
      if (!cliente) {
        // Create new client
        cliente = await storage.createCliente({
          nome: "Proprietario",
          cognome: streetName,
          telefono: normalizedPhone,
          email: immobile.contattoEmail || "",
          tipoCliente: "venditore",
          ratingCliente: 1,
          note: `Prospect da acquisizione: ${immobile.titolo || streetName}`,
          attivo: true,
        });
      }

      // Update immobile with client association
      await storage.updateImmobileEsterno(id, {
        clienteId: cliente.id,
      });

      // Create communication record
      await storage.createComunicazione({
        clienteId: cliente.id,
        immobileEsternoId: id,
        tipo: "proposta",
        testo: message,
        canale: "whatsapp",
        creatoDA: "agente",
        esito: null,
      });

      // Create campaign_message for bot tracking (enables automatic AI responses)
      // First get or create the default acquisition campaign
      const campaigns = await storage.getWhatsappCampaigns();
      let acquisitionCampaign = campaigns.find(c => c.name === "Invio messaggi acquisizione");
      
      if (!acquisitionCampaign) {
        // Create default campaign if not exists
        acquisitionCampaign = await storage.createWhatsappCampaign({
          name: "Invio messaggi acquisizione",
          template: message,
          status: "active",
        });
      }

      // Create campaign_message to track this conversation for bot
      // normalizedPhone is already in 39xxxxxxxxxx format from normalizeItalianPhone
      const campaignMessage = await storage.createCampaignMessage({
        campaignId: acquisitionCampaign.id,
        immobileEsternoId: id,
        phoneNumber: normalizedPhone,
        ownerName: immobile.contattoNome || `Proprietario ${streetName}`,
        messageContent: message,
        status: "sent",
        sentAt: new Date(),
        conversationActive: true,
      });

      console.log(`[Acquisizione] Created campaign_message ${campaignMessage.id} for phone ${normalizedPhone}`);

      // Create WhatsApp conversation and message so it appears in WhatsApp Chat tab
      let conversation = await storage.getWhatsappConversationByPhone(normalizedPhone);
      if (!conversation) {
        conversation = await storage.createWhatsappConversation({
          phoneNumber: normalizedPhone,
          clienteId: cliente.id,
          ultimoMessaggio: message.substring(0, 100),
          ultimoMessaggioData: new Date(),
          nonLetti: 0,
        });
        console.log(`[Acquisizione] Created WhatsApp conversation ${conversation.id} for ${normalizedPhone}`);
      }

      // Save the outbound message
      await storage.createWhatsappMessage({
        conversationId: conversation.id,
        whatsappMessageId: result.messageId || null,
        direction: "outbound",
        messageType: "chat",
        content: message,
        mediaUrl: null,
        status: "sent",
      });

      // Update conversation with last message
      await storage.updateWhatsappConversation(conversation.id, {
        ultimoMessaggio: message.substring(0, 100),
        ultimoMessaggioData: new Date(),
        clienteId: cliente.id,
      });

      // Notify WebSocket
      const finalConversation = await storage.getWhatsappConversation(conversation.id);
      if (finalConversation) {
        whatsappWS.notifyConversationUpdate({ ...finalConversation, conversationId: finalConversation.id });
      }

      res.json({ 
        success: true, 
        messageId: result.messageId,
        cliente: cliente,
        campaignMessageId: campaignMessage.id,
        conversationId: conversation.id,
      });
    } catch (error) {
      console.error("Send WhatsApp error:", error);
      res.status(500).json({ success: false, error: "Errore nell'invio del messaggio" });
    }
  });

  // Register form submission - creates client and updates immobile (like WhatsApp but without sending)
  app.post("/api/acquisizione/:id/register-form-sent", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { message } = req.body;
      
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }

      // Update immobile status
      await storage.updateImmobileEsterno(id, {
        statoContatto: "contattato",
        messaggioInviato: message || null,
        dataContatto: new Date(),
      });

      // Create or find client "Proprietario [Via]" - same logic as WhatsApp
      const extractStreetName = (address: string): string => {
        const withoutNumber = address.replace(/\s*,?\s*\d+[a-zA-Z]?\s*$/, '').trim();
        const match = withoutNumber.match(/^(Via|Viale|Piazza|Corso|Largo|Vicolo|Piazzale)\s+(.+)$/i);
        if (match) {
          const prefix = match[1];
          const nameParts = match[2].split(/\s+/);
          const mainName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
          return `${prefix} ${mainName}`;
        }
        return withoutNumber || address;
      };
      
      // Use address (via) first, fallback to titolo (which often contains the via), then zona
      let streetName = "Immobile";
      if (immobile.indirizzo) {
        streetName = extractStreetName(immobile.indirizzo);
      } else if (immobile.titolo) {
        const viaMatch = immobile.titolo.match(/(Via|Viale|Piazza|Corso|Largo|Vicolo|Piazzale)\s+[^,\d]+/i);
        if (viaMatch) {
          streetName = extractStreetName(viaMatch[0]);
        } else if (immobile.zona) {
          streetName = immobile.zona;
        }
      } else if (immobile.zona) {
        streetName = immobile.zona;
      }
      
      // Check if client already exists by email (for form contacts we don't have phone)
      const clienti = await storage.getClienti();
      let cliente = immobile.contattoEmail 
        ? clienti.find(c => c.email?.toLowerCase() === immobile.contattoEmail?.toLowerCase())
        : null;
      
      if (!cliente) {
        // Create new client
        cliente = await storage.createCliente({
          nome: "Proprietario",
          cognome: streetName,
          telefono: "",
          email: immobile.contattoEmail || "",
          tipoCliente: "venditore",
          ratingCliente: 1,
          note: `Prospect da form portale: ${immobile.titolo || streetName}. Portale: ${immobile.fonte || 'N/D'}`,
          attivo: true,
        });
      }

      // Update immobile with client association
      await storage.updateImmobileEsterno(id, {
        clienteId: cliente.id,
      });

      // Create communication record
      if (message) {
        await storage.createComunicazione({
          clienteId: cliente.id,
          immobileEsternoId: id,
          tipo: "proposta",
          testo: message,
          canale: "email", // Form contact is like email
          creatoDA: "agente",
          esito: null,
        });
      }

      res.json({ 
        success: true, 
        cliente: cliente,
      });
    } catch (error) {
      console.error("Register form sent error:", error);
      res.status(500).json({ success: false, error: "Errore nella registrazione" });
    }
  });

  // Generate mirroring phrases from property listing
  app.post("/api/acquisizione/:id/generate-mirroring", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }

      const { MIRRORING_PROMPT } = await import("./bot-config");
      
      // Build context from immobile data
      let context = `Testo annuncio:\n"${immobile.descrizione || immobile.titolo || 'Nessun testo disponibile'}"`;
      
      // Add extracted fields if available
      const campiEstratti: string[] = [];
      if (immobile.titolo) campiEstratti.push(`titolo: ${immobile.titolo}`);
      if (immobile.zona) campiEstratti.push(`zona: ${immobile.zona}`);
      if (immobile.balcone) campiEstratti.push("ha_balcone: si");
      if (immobile.terrazzo) campiEstratti.push("ha_terrazzo: si");
      if (immobile.statoRistrutturato) campiEstratti.push("ristrutturato: si");
      if (immobile.statoNuovo) campiEstratti.push("stato_nuovo: si");
      if (immobile.classeEnergetica) campiEstratti.push(`classe_energetica: ${immobile.classeEnergetica}`);
      if (immobile.ascensore) campiEstratti.push("presenza_ascensore: si");
      if (immobile.mq) campiEstratti.push(`metratura: ${immobile.mq} mq`);
      if (immobile.camere) campiEstratti.push(`camere: ${immobile.camere}`);
      
      // Add AI-extracted facts from caratteristiche if available
      const extractedFacts = (immobile.caratteristiche as any)?.extractedFacts;
      if (extractedFacts) {
        if (extractedFacts.tipo_unita) campiEstratti.push(`tipo_unita: ${extractedFacts.tipo_unita}`);
        if (extractedFacts.doppia_esposizione) campiEstratti.push("doppia_esposizione: si");
        if (extractedFacts.ultimo_piano) campiEstratti.push("ultimo_piano: si");
        if (extractedFacts.portineria) campiEstratti.push("portineria: si");
        if (extractedFacts.metro_o_trasporti) campiEstratti.push(`metro_o_trasporti: ${extractedFacts.metro_o_trasporti}`);
        if (extractedFacts.balconi) campiEstratti.push(`numero_balconi: ${extractedFacts.balconi}`);
      }
      
      if (campiEstratti.length > 0) {
        context += `\n\nCampi già estratti:\n${campiEstratti.join("\n")}`;
      }

      // Use the centralized generateMirroring function for consistency
      const result = await generateMirroring({
        testoAnnuncio: immobile.descrizione || immobile.titolo || '',
        tipoUnita: extractedFacts?.tipo_unita || undefined,
        zonaOVia: immobile.zona || immobile.indirizzo || undefined
      });

      const mirroring = result.mirroring;
      res.json({ mirroring });
    } catch (error) {
      console.error("Generate mirroring error:", error);
      res.status(500).json({ error: "Errore nella generazione delle frasi di mirroring" });
    }
  });

  // Toggle preferito status
  app.post("/api/acquisizione/:id/toggle-preferito", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }
      
      const updated = await storage.updateImmobileEsterno(id, { preferito: !immobile.preferito });
      res.json(updated);
    } catch (error) {
      console.error("Toggle preferito error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dello stato preferito" });
    }
  });

  // ========== ANNUNCI IMMOBILE (MULTI-AGENZIA) ==========
  
  // Get annunci for an immobile esterno
  app.get("/api/acquisizione/:id/annunci", async (req, res) => {
    try {
      const immobileEsternoId = parseInt(req.params.id);
      const annunci = await storage.getAnnunciImmobile(immobileEsternoId);
      res.json(annunci);
    } catch (error) {
      console.error("Get annunci error:", error);
      res.status(500).json({ error: "Errore nel recupero degli annunci" });
    }
  });

  // Create new annuncio for an immobile esterno
  app.post("/api/acquisizione/:id/annunci", async (req, res) => {
    try {
      const immobileEsternoId = parseInt(req.params.id);
      const { insertAnnuncioImmobileSchema } = await import("@shared/schema");
      
      const parsed = insertAnnuncioImmobileSchema.safeParse({
        ...req.body,
        immobileEsternoId
      });
      
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      
      const annuncio = await storage.createAnnuncioImmobile(parsed.data);
      res.status(201).json(annuncio);
    } catch (error) {
      console.error("Create annuncio error:", error);
      res.status(500).json({ error: "Errore nella creazione dell'annuncio" });
    }
  });

  // Delete annuncio
  app.delete("/api/annunci/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAnnuncioImmobile(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete annuncio error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione dell'annuncio" });
    }
  });

  // Toggle conferma multi-agenzia
  app.post("/api/acquisizione/:id/toggle-multi-agenzia-confermata", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }
      
      const updated = await storage.updateImmobileEsterno(id, { 
        multiAgenziaConfermata: !immobile.multiAgenziaConfermata 
      });
      res.json(updated);
    } catch (error) {
      console.error("Toggle multi-agenzia confermata error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento dello stato multi-agenzia" });
    }
  });

  // Generate AI report for acquisition campaigns
  app.post("/api/acquisizione/ai-report", async (req, res) => {
    try {
      // Get statistics first
      const immobili = await storage.getImmobiliEsterni();
      const campaigns = await storage.getWhatsappCampaigns();
      const allCampaignMessages: any[] = [];
      for (const campaign of campaigns) {
        const messages = await storage.getCampaignMessages(campaign.id);
        allCampaignMessages.push(...messages);
      }
      
      // Prepare data for AI analysis
      const totalSent = immobili.filter(i => i.messaggioInviato).length + allCampaignMessages.filter(m => m.sentAt).length;
      const totalResponses = immobili.filter(i => i.rispostaRicevuta).length + allCampaignMessages.filter(m => m.respondedAt).length;
      const responseRate = totalSent > 0 ? Math.round((totalResponses / totalSent) * 100) : 0;
      
      const whatsappSent = immobili.filter(i => i.messaggioInviato && i.contattoTelefono).length + allCampaignMessages.filter(m => m.sentAt).length;
      const formSent = immobili.filter(i => i.messaggioInviato && !i.contattoTelefono).length;
      
      const whatsappResponses = immobili.filter(i => i.rispostaRicevuta && i.contattoTelefono).length + allCampaignMessages.filter(m => m.respondedAt).length;
      const formResponses = immobili.filter(i => i.rispostaRicevuta && !i.contattoTelefono).length;
      
      const interested = immobili.filter(i => i.statoContatto === 'interessato').length;
      const discarded = immobili.filter(i => i.statoContatto === 'scartato').length;
      
      // Source analysis by portal
      const sourceStats: Record<string, { total: number; responses: number }> = {};
      for (const immobile of immobili) {
        const portale = immobile.portale || immobile.fonte || 'Sconosciuto';
        if (!sourceStats[portale]) {
          sourceStats[portale] = { total: 0, responses: 0 };
        }
        if (immobile.messaggioInviato) {
          sourceStats[portale].total++;
          if (immobile.rispostaRicevuta) {
            sourceStats[portale].responses++;
          }
        }
      }
      
      // Sample messages for analysis
      const sampleMessages = immobili
        .filter(i => i.messaggioInviato)
        .slice(0, 5)
        .map(i => i.messaggioInviato);
      
      // Sample responses for analysis
      const sampleResponses = immobili
        .filter(i => i.rispostaRicevuta)
        .slice(0, 10)
        .map(i => ({
          messaggio: i.messaggioInviato?.substring(0, 200),
          risposta: i.note?.substring(0, 200),
          stato: i.statoContatto,
        }));
      
      const prompt = `Sei un esperto di marketing immobiliare e acquisizione clienti. Analizza i seguenti dati della campagna di acquisizione immobili e fornisci un report dettagliato con consigli pratici.

DATI CAMPAGNA:
- Messaggi totali inviati: ${totalSent}
- Risposte ricevute: ${totalResponses}
- Tasso di risposta: ${responseRate}%

CANALI:
- WhatsApp: ${whatsappSent} inviati, ${whatsappResponses} risposte (${whatsappSent > 0 ? Math.round((whatsappResponses/whatsappSent)*100) : 0}%)
- Form portali: ${formSent} inviati, ${formResponses} risposte (${formSent > 0 ? Math.round((formResponses/formSent)*100) : 0}%)

RISULTATI:
- Proprietari interessati: ${interested}
- Contatti scartati: ${discarded}

FONTI (portali):
${Object.entries(sourceStats).map(([fonte, stats]) => 
  `- ${fonte}: ${stats.total} contatti, ${stats.responses} risposte (${stats.total > 0 ? Math.round((stats.responses/stats.total)*100) : 0}%)`
).join('\n')}

${sampleResponses.length > 0 ? `
ESEMPI DI RISPOSTE RICEVUTE:
${sampleResponses.map((r, i) => `${i+1}. Stato: ${r.stato}\n   Risposta: ${r.risposta || 'N/A'}`).join('\n')}
` : ''}

Fornisci un report strutturato con:
1. ANALISI GENERALE - Valutazione complessiva delle performance
2. PUNTI DI FORZA - Cosa sta funzionando bene
3. AREE DI MIGLIORAMENTO - Cosa può essere ottimizzato
4. ANALISI PER CANALE - Confronto WhatsApp vs Form
5. CONSIGLI PRATICI - 5 azioni concrete da implementare subito
6. BENCHMARK - Come si posizionano questi risultati rispetto alle medie del settore
7. PROSSIMI PASSI - Piano d'azione per i prossimi 7 giorni

Rispondi in italiano con un tono professionale ma accessibile.`;

      const result = await generateChatCompletion([
        { role: "system", content: "Sei un consulente esperto di marketing immobiliare specializzato in acquisizione proprietari." },
        { role: "user", content: prompt }
      ], { model: "gpt-4o", temperature: 0.7 });
      
      res.json({
        report: result.message,
        generatedAt: new Date().toISOString(),
        dataSnapshot: {
          totalSent,
          totalResponses,
          responseRate,
          whatsappRate: whatsappSent > 0 ? Math.round((whatsappResponses/whatsappSent)*100) : 0,
          formRate: formSent > 0 ? Math.round((formResponses/formSent)*100) : 0,
        }
      });
    } catch (error) {
      console.error("Generate AI report error:", error);
      res.status(500).json({ error: "Errore nella generazione del report AI" });
    }
  });

  // ==================== WHATSAPP CAMPAIGNS ====================
  
  // Get all campaigns
  app.get("/api/whatsapp-campaigns", async (req, res) => {
    try {
      const campaigns = await storage.getWhatsappCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ error: "Errore nel caricamento delle campagne" });
    }
  });

  // Get single campaign
  app.get("/api/whatsapp-campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const campaign = await storage.getWhatsappCampaign(id);
      if (!campaign) {
        return res.status(404).json({ error: "Campagna non trovata" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Get campaign error:", error);
      res.status(500).json({ error: "Errore nel caricamento della campagna" });
    }
  });

  // Create campaign
  app.post("/api/whatsapp-campaigns", async (req, res) => {
    try {
      const parsed = insertWhatsappCampaignSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const campaign = await storage.createWhatsappCampaign(parsed.data);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({ error: "Errore nella creazione della campagna" });
    }
  });

  // Create campaign with recipients from properties
  app.post("/api/whatsapp-campaigns/create-with-recipients", async (req, res) => {
    try {
      const { name, propertyIds } = req.body as { name: string; propertyIds: number[] };
      
      if (!propertyIds || propertyIds.length === 0) {
        return res.status(400).json({ error: "Seleziona almeno un immobile" });
      }

      // Default template for acquisition campaigns
      const defaultTemplate = `Gentile Proprietario,
sono l'assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent'anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un'opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile.
Caratteristiche come {{caratteristiche}} sono oggi molto richieste da chi cerca immobili con potenzialità immediate, sia in termini di rendimento sia di stabilità del valore nel tempo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l'immobile: una decina di minuti per ascoltare la sua situazione, vedere l'appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Paolo
Assistente del Dott. Ilan Boni`;

      const defaultInstructions = `IDENTITÀ BOT:
- Nome: Assistente del Dott. Ilan Boni
- Presentazione: "Sono l'assistente del Dott. Ilan Boni."
- Background: Il Dott. Boni è agente immobiliare da oltre trent'anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano.
- Posizionamento: Figura di supporto che gestisce il primo contatto, ascolta il proprietario e valuta se ha senso fissare un incontro diretto con il Dott. Boni.

OBIETTIVI:
- Primario: Fissare un appuntamento presso l'immobile con il Dott. Boni, breve e non vincolante.
- Secondario: Lasciare un'ottima impressione, creare fiducia, posizionare il Dott. Boni come riferimento per dubbi futuri.

REGOLE DI COMPORTAMENTO:
1. Dare sempre del Lei.
2. Essere empatico, calmo e rispettoso.
3. Ascoltare prima di rispondere.
4. Non criticare altre agenzie.
5. Non fare promesse sul risultato.
6. Non portare clienti senza aver visto l'immobile.
7. Evitare discussioni tecniche approfondite via messaggio.
8. Riportare sempre la conversazione verso la proposta di un incontro breve.
9. Chiudere sempre con gentilezza.

STILE COMUNICAZIONE:
- Formalità: Dare sempre del "Lei"
- Frasi: brevi
- Tono: calmo, istituzionale, empatico
- EVITARE: tono commerciale, promesse, pressing, linguaggio aggressivo, linguaggio troppo tecnico

FIRMA: Un cordiale saluto, l'Assistente del Dott. Ilan Boni`;

      const defaultObjectionHandling = {
        no_agency_solo_privati: {
          triggers: ["no agenzie", "no agenzia", "solo privati", "vendo da solo", "senza agenzia", "vendita privata", "vendere da privato"],
          responses: [
            "Capisco perfettamente, molti proprietari oggi preferiscono muoversi da privati. Il punto è che gli investitori che segue il Dott. Boni non si muovono mai senza prima avere un quadro preciso dell'immobile e dei documenti. Per questo serve un breve incontro in casa: dieci minuti per ascoltare la sua situazione e capire se l'immobile rientra davvero nelle richieste che abbiamo.",
            "È comprensibile. Anche chi vende da privato spesso chiede un confronto per evitare errori o perdite di tempo. Per capire se e come possiamo esserle utili, il Dott. Boni deve vedere l'immobile e ascoltare la sua storia. Possiamo fissare un incontro breve?"
          ]
        },
        already_agency: {
          triggers: ["ho già un'agenzia", "mi segue un'altra agenzia", "ho un amico agente", "sono già seguito"],
          responses: [
            "Capisco bene, ed è un segno di correttezza da parte sua. A volte però un secondo sguardo, soprattutto di un professionista che lavora molto con investitori italiani e stranieri, può dare spunti utili senza togliere nulla a chi la segue oggi. Il Dott. Boni può passare per un breve confronto in appartamento, le potrebbe essere utile?",
            "Ha fatto bene a dirlo. Non si tratta di sostituire il lavoro di nessuno, ma di offrirle un punto di vista aggiuntivo, basato sulla domanda reale che gestiamo ogni giorno. Se vuole, posso organizzare un incontro di dieci minuti con il Dott. Boni direttamente in casa."
          ]
        },
        porta_cliente_no_mandato: {
          triggers: ["portate clienti", "portate il cliente", "se avete un cliente", "no mandato", "senza mandato", "non pago provvigioni"],
          responses: [
            "Capisco cosa intende. Il Dott. Boni però non porta mai un acquirente senza aver prima visto l'immobile e valutato documenti e situazione del proprietario. Non sarebbe serio né per Lei né per l'investitore. Possiamo fissare un incontro breve in casa e capire insieme se il suo immobile può rientrare nelle richieste che abbiamo.",
            "Comprendo la richiesta. Il punto è che il nostro lavoro non è accompagnare persone a caso, ma costruire trattative solide mettendo gli acquirenti in concorrenza tra loro. Per farlo serve conoscere bene l'immobile. Possiamo organizzare un appuntamento con il Dott. Boni per vedere la casa?"
          ]
        },
        ci_penso: {
          triggers: ["ci penso", "devo pensarci", "vediamo", "forse", "valuterò"],
          responses: [
            "È giusto prendersi un momento. Di solito però prima di pensarci aiuta avere qualche dato concreto sulla domanda reale in zona. Il Dott. Boni può passarle dieci minuti in appartamento e darle un quadro chiaro. Vuole fissare un momento?",
            "Capisco. Un incontro breve serve proprio a chiarire i dubbi che oggi la fanno esitare. Se vuole, organizzo un appuntamento con il Dott. Boni direttamente in casa."
          ]
        }
      };

      // Create the campaign
      const campaign = await storage.createWhatsappCampaign({
        name: name || `Campagna ${new Date().toLocaleDateString('it-IT')}`,
        template: defaultTemplate,
        instructions: defaultInstructions,
        objectionHandling: defaultObjectionHandling,
        useAiPersonalization: true,
        status: "draft",
        totalTargets: propertyIds.length
      });

      // Get properties and create messages
      let recipientsAdded = 0;
      for (const propertyId of propertyIds) {
        const property = await storage.getImmobileEsterno(propertyId);
        if (property && property.contattoTelefono) {
          // Build characteristics string
          const caratteristiche: string[] = [];
          if (property.mq) caratteristiche.push(`${property.mq} mq`);
          if (property.camere) caratteristiche.push(`${property.camere} camere`);
          if (property.balcone) caratteristiche.push("balcone");
          if (property.terrazzo) caratteristiche.push("terrazzo");
          if (property.ascensore) caratteristiche.push("ascensore");
          if (property.box) caratteristiche.push("box");
          if (property.statoRistrutturato) caratteristiche.push("ristrutturato");
          
          // Personalize message
          let personalizedMessage = defaultTemplate
            .replace(/\{\{via\}\}/g, property.indirizzo || "questa zona")
            .replace(/\{\{caratteristiche\}\}/g, caratteristiche.length > 0 ? caratteristiche.join(", ") : "le sue caratteristiche");

          await storage.createCampaignMessage({
            campaignId: campaign.id,
            phoneNumber: property.contattoTelefono,
            ownerName: property.contattoNome || null,
            messageContent: personalizedMessage,
            immobileEsternoId: property.id,
            status: "pending"
          });
          recipientsAdded++;
        }
      }

      // Update campaign total targets
      await storage.updateWhatsappCampaign(campaign.id, { totalTargets: recipientsAdded });

      res.status(201).json({ 
        campaign, 
        recipientsAdded 
      });
    } catch (error) {
      console.error("Create campaign with recipients error:", error);
      res.status(500).json({ error: "Errore nella creazione della campagna" });
    }
  });

  // Automatic acquisition campaign - send to all properties with phone that haven't been contacted yet
  app.post("/api/whatsapp-campaigns/send-automatic", async (req, res) => {
    try {
      // Check if UltraMsg is configured
      if (!isUltraMsgConfigured()) {
        return res.status(400).json({ error: "WhatsApp non configurato. Configura UltraMsg nelle impostazioni." });
      }

      // Get all acquisition properties with phone numbers
      const allProperties = await storage.getImmobiliEsterni();
      const propertiesWithPhone = allProperties.filter(p => 
        p.contattoTelefono && 
        p.contattoTelefono !== "non disponibile" &&
        p.statoContatto !== "contattato" // Not already contacted
      );

      // Check for duplicate phone numbers - get all already contacted numbers
      const contactedPhones = new Set(
        allProperties
          .filter(p => p.statoContatto === "contattato" && p.contattoTelefono)
          .map(p => p.contattoTelefono!.replace(/\D/g, '')) // Normalize phone numbers
      );

      // Also check WhatsApp conversations for previously contacted numbers
      const whatsappConversations = await storage.getWhatsappConversations();
      whatsappConversations.forEach(conv => {
        contactedPhones.add(conv.phoneNumber.replace(/\D/g, ''));
      });

      // Filter out properties with already contacted phone numbers
      const uniquePropertiesToContact = propertiesWithPhone.filter(p => {
        const normalizedPhone = p.contattoTelefono!.replace(/\D/g, '');
        return !contactedPhones.has(normalizedPhone);
      });

      // Identify duplicates for warning
      const duplicateProperties = propertiesWithPhone.filter(p => {
        const normalizedPhone = p.contattoTelefono!.replace(/\D/g, '');
        return contactedPhones.has(normalizedPhone);
      });

      if (uniquePropertiesToContact.length === 0) {
        if (duplicateProperties.length > 0) {
          return res.status(400).json({ 
            error: `Tutti i ${duplicateProperties.length} numeri sono già stati contattati in precedenza. Importa nuovi immobili con numeri diversi.`,
            duplicates: duplicateProperties.map(p => ({ titolo: p.titolo, telefono: p.contattoTelefono }))
          });
        }
        return res.status(400).json({ error: "Nessun immobile con telefono da contattare. Importa nuovi immobili dalla sezione Acquisizione." });
      }

      // Template with {{mirroring}} placeholder
      const defaultTemplate = `Gentile Proprietario,
sono l'assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent'anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un'opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile.
{{mirroring}}

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l'immobile: una decina di minuti per ascoltare la sua situazione, vedere l'appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Paolo
Assistente del Dott. Ilan Boni`;

      // Send messages with rate limiting
      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const results: { phoneNumber: string; indirizzo: string; success: boolean; error?: string; mirroring?: string; skipped?: boolean }[] = [];
      
      // Track phones sent during this batch to avoid duplicate sends within same batch
      const phonesSentInThisBatch = new Set<string>();

      for (const property of uniquePropertiesToContact) {
        try {
          const normalizedPhone = property.contattoTelefono!.replace(/\D/g, '');
          
          // Double-check: skip if this phone was already sent in this batch
          if (phonesSentInThisBatch.has(normalizedPhone)) {
            skippedCount++;
            results.push({ 
              phoneNumber: property.contattoTelefono!, 
              indirizzo: property.indirizzo || "", 
              success: false, 
              skipped: true,
              error: "Numero già contattato in questa sessione" 
            });
            continue;
          }
          
          // Generate AI mirroring from the property listing text
          let mirroringText = "";
          if (property.descrizione) {
            try {
              const mirroringResult = await generateMirroring({
                testoAnnuncio: property.descrizione,
                tipoUnita: property.camere ? `${property.camere} locali` : null,
                zonaOVia: property.indirizzo || property.zona
              });
              mirroringText = mirroringResult.mirroring;
            } catch (e) {
              console.log("Mirroring generation failed, using fallback:", e);
            }
          }
          
          // Fallback: Build characteristics string if no mirroring generated
          if (!mirroringText) {
            const caratteristiche: string[] = [];
            if (property.mq) caratteristiche.push(`${property.mq} mq`);
            if (property.camere) caratteristiche.push(`${property.camere} camere`);
            if (property.balcone) caratteristiche.push("balcone");
            if (property.terrazzo) caratteristiche.push("terrazzo");
            if (property.ascensore) caratteristiche.push("ascensore");
            if (property.box) caratteristiche.push("box");
            if (property.statoRistrutturato) caratteristiche.push("ristrutturato");
            mirroringText = caratteristiche.length > 0 
              ? `Caratteristiche come ${caratteristiche.join(", ")} sono oggi molto richieste da chi cerca immobili con potenzialita immediate, sia in termini di rendimento sia di stabilita del valore nel tempo.`
              : "Le sue caratteristiche sono oggi molto richieste da chi cerca immobili con potenzialita immediate.";
          }
          
          // Personalize message
          const personalizedMessage = defaultTemplate
            .replace(/\{\{via\}\}/g, property.indirizzo || "questa zona")
            .replace(/\{\{mirroring\}\}/g, mirroringText);

          // Send via UltraMsg
          const result = await sendWhatsAppMessage(property.contattoTelefono!, personalizedMessage);
          
          if (result.success) {
            // Mark phone as sent in this batch
            phonesSentInThisBatch.add(normalizedPhone);
            
            // Update property status to contacted
            await storage.updateImmobileEsterno(property.id, { 
              statoContatto: "contattato",
              dataContatto: new Date(),
              messaggioInviato: personalizedMessage
            });
            sentCount++;
            results.push({ phoneNumber: property.contattoTelefono!, indirizzo: property.indirizzo || "", success: true });
          } else {
            failedCount++;
            results.push({ phoneNumber: property.contattoTelefono!, indirizzo: property.indirizzo || "", success: false, error: result.error });
          }

          // Rate limit: wait 1.5 seconds between messages
          if (uniquePropertiesToContact.indexOf(property) < uniquePropertiesToContact.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          failedCount++;
          results.push({ phoneNumber: property.contattoTelefono!, indirizzo: property.indirizzo || "", success: false, error: String(error) });
        }
      }

      res.json({
        success: true,
        sent: sentCount,
        failed: failedCount,
        skippedInBatch: skippedCount,
        total: uniquePropertiesToContact.length,
        skippedDuplicates: duplicateProperties.length,
        duplicates: duplicateProperties.map(p => ({ titolo: p.titolo, telefono: p.contattoTelefono, indirizzo: p.indirizzo })),
        results
      });
    } catch (error) {
      console.error("Automatic campaign error:", error);
      res.status(500).json({ error: "Errore nell'invio automatico dei messaggi" });
    }
  });

  // Add recipients from property IDs
  app.post("/api/whatsapp-campaigns/:id/add-from-properties", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { propertyIds } = req.body as { propertyIds: number[] };
      
      const campaign = await storage.getWhatsappCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campagna non trovata" });
      }

      if (!propertyIds || propertyIds.length === 0) {
        return res.status(400).json({ error: "Seleziona almeno un immobile" });
      }

      let added = 0;
      for (const propertyId of propertyIds) {
        const property = await storage.getImmobileEsterno(propertyId);
        if (property && property.contattoTelefono) {
          // Build characteristics string
          const caratteristiche: string[] = [];
          if (property.mq) caratteristiche.push(`${property.mq} mq`);
          if (property.camere) caratteristiche.push(`${property.camere} camere`);
          if (property.balcone) caratteristiche.push("balcone");
          if (property.terrazzo) caratteristiche.push("terrazzo");
          if (property.ascensore) caratteristiche.push("ascensore");
          if (property.box) caratteristiche.push("box");
          if (property.statoRistrutturato) caratteristiche.push("ristrutturato");
          
          // Personalize message using campaign template
          let personalizedMessage = campaign.template
            .replace(/\{\{via\}\}/g, property.indirizzo || "questa zona")
            .replace(/\{\{caratteristiche\}\}/g, caratteristiche.length > 0 ? caratteristiche.join(", ") : "le sue caratteristiche");

          await storage.createCampaignMessage({
            campaignId,
            phoneNumber: property.contattoTelefono,
            ownerName: property.contattoNome || null,
            messageContent: personalizedMessage,
            immobileEsternoId: property.id,
            status: "pending"
          });
          added++;
        }
      }

      // Update campaign total targets
      await storage.updateWhatsappCampaign(campaignId, { 
        totalTargets: (campaign.totalTargets || 0) + added 
      });

      res.json({ added, total: (campaign.totalTargets || 0) + added });
    } catch (error) {
      console.error("Add from properties error:", error);
      res.status(500).json({ error: "Errore nell'aggiunta dei destinatari" });
    }
  });

  // Update campaign
  app.patch("/api/whatsapp-campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = insertWhatsappCampaignSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const campaign = await storage.updateWhatsappCampaign(id, parsed.data);
      if (!campaign) {
        return res.status(404).json({ error: "Campagna non trovata" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento della campagna" });
    }
  });

  // Delete campaign
  app.delete("/api/whatsapp-campaigns/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWhatsappCampaign(id);
      res.status(204).send();
    } catch (error) {
      console.error("Delete campaign error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione della campagna" });
    }
  });

  // Start campaign - send pending messages via UltraMsg
  app.post("/api/whatsapp-campaigns/:id/start", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      
      // Check if UltraMsg is configured before proceeding
      if (!isUltraMsgConfigured()) {
        return res.status(400).json({ error: "WhatsApp non configurato. Configura UltraMsg nelle impostazioni." });
      }
      
      const campaign = await storage.getWhatsappCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campagna non trovata" });
      }

      // Get pending messages for this campaign
      const allMessages = await storage.getCampaignMessages(campaignId);
      const pendingMessages = allMessages.filter(m => m.status === "pending");

      if (pendingMessages.length === 0) {
        return res.status(400).json({ error: "Nessun messaggio da inviare. Aggiungi prima dei destinatari." });
      }

      // Send messages with rate limiting (1.5 seconds between messages to avoid spam)
      let sentCount = 0;
      let failedCount = 0;
      const results: { phoneNumber: string; success: boolean; error?: string }[] = [];

      for (const msg of pendingMessages) {
        try {
          const result = await sendWhatsAppMessage(msg.phoneNumber, msg.messageContent);
          
          if (result.success) {
            await storage.updateCampaignMessage(msg.id, {
              status: "sent",
              sentAt: new Date(),
              metadata: { ...(msg.metadata || {}), ultraMsgId: result.messageId }
            });
            sentCount++;
            results.push({ phoneNumber: msg.phoneNumber, success: true });
          } else {
            await storage.updateCampaignMessage(msg.id, {
              status: "failed",
              errorMessage: result.error
            });
            failedCount++;
            results.push({ phoneNumber: msg.phoneNumber, success: false, error: result.error });
          }

          // Rate limit: wait 1.5 seconds between messages
          if (pendingMessages.indexOf(msg) < pendingMessages.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          await storage.updateCampaignMessage(msg.id, {
            status: "failed",
            errorMessage: String(error)
          });
          failedCount++;
          results.push({ phoneNumber: msg.phoneNumber, success: false, error: String(error) });
        }
      }

      // Update campaign stats and status
      await storage.updateWhatsappCampaign(campaignId, {
        sentCount: (campaign.sentCount || 0) + sentCount,
        status: sentCount > 0 ? "active" : "paused",
        startedAt: campaign.startedAt || new Date()
      });

      res.json({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: pendingMessages.length,
        results
      });
    } catch (error) {
      console.error("Start campaign error:", error);
      res.status(500).json({ error: "Errore nell'avvio della campagna" });
    }
  });

  // Add recipients to campaign
  app.post("/api/whatsapp-campaigns/:id/recipients", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const campaign = await storage.getWhatsappCampaign(campaignId);
      
      if (!campaign) {
        return res.status(404).json({ error: "Campagna non trovata" });
      }

      const { recipients } = req.body as { recipients: Array<{ phoneNumber: string; ownerName?: string; message?: string; immobileEsternoId?: number }> };
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: "Fornisci almeno un destinatario" });
      }

      const createdMessages: any[] = [];
      
      for (const recipient of recipients) {
        // Use custom message or campaign template
        const messageContent = recipient.message || campaign.template;
        
        const msg = await storage.createCampaignMessage({
          campaignId,
          phoneNumber: recipient.phoneNumber,
          ownerName: recipient.ownerName || null,
          messageContent,
          immobileEsternoId: recipient.immobileEsternoId || null,
          status: "pending"
        });
        createdMessages.push(msg);
      }

      // Update campaign total targets
      await storage.updateWhatsappCampaign(campaignId, {
        totalTargets: (campaign.totalTargets || 0) + recipients.length
      });

      res.status(201).json({
        success: true,
        added: createdMessages.length,
        messages: createdMessages
      });
    } catch (error) {
      console.error("Add recipients error:", error);
      res.status(500).json({ error: "Errore nell'aggiunta dei destinatari" });
    }
  });

  // ==================== CAMPAIGN MESSAGES ====================

  // Get campaign messages (with optional filters)
  app.get("/api/campaign-messages", async (req, res) => {
    try {
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      const hasResponse = req.query.hasResponse === "true";
      
      let messages = await storage.getCampaignMessages(campaignId);
      
      if (hasResponse) {
        messages = messages.filter(m => m.response);
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Errore nel caricamento dei messaggi" });
    }
  });

  // Get single message
  app.get("/api/campaign-messages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const message = await storage.getCampaignMessage(id);
      if (!message) {
        return res.status(404).json({ error: "Messaggio non trovato" });
      }
      res.json(message);
    } catch (error) {
      console.error("Get message error:", error);
      res.status(500).json({ error: "Errore nel caricamento del messaggio" });
    }
  });

  // Get conversation logs for a message
  app.get("/api/campaign-messages/:id/logs", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const logs = await storage.getBotConversationLogs(id);
      res.json(logs);
    } catch (error) {
      console.error("Get logs error:", error);
      res.status(500).json({ error: "Errore nel caricamento dei log" });
    }
  });

  // ==================== BOT SIMULATION ====================

  // Generate mirroring text from property description
  app.post("/api/bot/generate-mirroring", async (req, res) => {
    try {
      const { testoAnnuncio, tipoUnita, zonaOVia } = req.body;
      
      if (!testoAnnuncio) {
        return res.status(400).json({ error: "Testo annuncio richiesto" });
      }

      const result = await generateMirroring({
        testoAnnuncio,
        tipoUnita,
        zonaOVia
      });

      res.json(result);
    } catch (error) {
      console.error("Generate mirroring error:", error);
      res.status(500).json({ error: "Errore nella generazione del mirroring" });
    }
  });

  // Extract property facts from listing text
  app.post("/api/bot/extract-facts", async (req, res) => {
    try {
      const { testoAnnuncio } = req.body;
      
      if (!testoAnnuncio) {
        return res.status(400).json({ error: "Testo annuncio richiesto" });
      }

      const facts = await extractPropertyFacts(testoAnnuncio);
      res.json(facts);
    } catch (error) {
      console.error("Extract facts error:", error);
      res.status(500).json({ error: "Errore nell'estrazione dei fatti" });
    }
  });

  // Generate initial message with AI mirroring for simulation
  // Supports "format" parameter: "standard" (default, for Immobiliare.it) or "idealista" (short, max 400 chars)
  app.post("/api/bot/generate-initial-message", async (req, res) => {
    try {
      const { testoAnnuncio, titolo, format = "standard" } = req.body;
      
      if (!testoAnnuncio) {
        return res.status(400).json({ error: "Testo annuncio richiesto" });
      }

      // Import templates - usa SEMPRE lo stesso MIRRORING_PROMPT di qualità per tutti
      const { 
        MIRRORING_PROMPT, 
        MIRRORING_CONFIG, 
        DEFAULT_ACQUISITION_MESSAGE,
        SHORT_ACQUISITION_MESSAGE
      } = await import("./bot-config");
      
      // Build context for mirroring
      let context = `Testo annuncio:\n"${testoAnnuncio}"`;
      if (titolo) {
        context += `\n\nTitolo: ${titolo}`;
      }

      const OpenAI = (await import("openai")).default;
      const openaiClient = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      // Template unico per tutti i canali (web e WhatsApp)
      const messageTemplate = DEFAULT_ACQUISITION_MESSAGE;
      
      // Generate mirroring phrases with JSON response format
      const mirroringResponse = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: MIRRORING_PROMPT + '\n\nRispondi SOLO con JSON: {"mirroring": "testo"}' },
          { role: "user", content: context }
        ],
        temperature: MIRRORING_CONFIG.temperature,
        max_tokens: MIRRORING_CONFIG.max_tokens,
        response_format: { type: "json_object" }
      });

      let mirroringText = mirroringResponse.choices[0]?.message?.content?.trim() || "";
      
      // Remove any JSON wrapper if present
      if (mirroringText.startsWith('{')) {
        try {
          const parsed = JSON.parse(mirroringText);
          mirroringText = parsed.mirroring || mirroringText;
        } catch {
          // Not JSON, use as-is
        }
      }

      // Build the complete message using the appropriate template (stesso placeholder per entrambi)
      const message = messageTemplate.replace(/\{\{mirroring\}\}/g, mirroringText);

      res.json({ message, format, charCount: message.length });
    } catch (error) {
      console.error("Generate initial message error:", error);
      res.status(500).json({ error: "Errore nella generazione del messaggio" });
    }
  });

  // Simulate bot response
  app.post("/api/bot/simulate", async (req, res) => {
    try {
      const { message, history, property } = req.body;
      
      if (!message || !property) {
        return res.status(400).json({ error: "Messaggio e contesto immobile richiesti" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      });

      const systemPrompt = `Sei l'Assistente del Dott. Ilan Boni, agente immobiliare con oltre 30 anni di esperienza a Milano.

CONTESTO IMMOBILE:
- Titolo: ${property.titolo || "Non specificato"}
- Proprietario: Sig. ${property.proprietario || "Proprietario"}

ANNUNCIO ORIGINALE DEL PROPRIETARIO:
"""
${property.testoAnnuncio || "Nessun testo disponibile"}
"""

TECNICA DI MIRRORING:
Quando rispondi, riprendi alcune parole o frasi che il proprietario ha usato nel suo annuncio. Questo crea rapport e fiducia. Per esempio, se il proprietario scrive "splendido appartamento luminoso", puoi dire "Ho visto che il Suo splendido appartamento e davvero luminoso...".

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
- Se chiede dettagli tecnici: rinvia all'incontro, il Dott. Boni potra rispondere di persona.

STRUTTURA RISPOSTA:
1. Empatia (riconosci il punto di vista)
2. Ricalco (mostra comprensione)
3. Valore dell'incontro (perche conviene vedersi)
4. Proposta appuntamento (concreta ma non insistente)`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Add conversation history
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      // Add current message
      messages.push({ role: "user", content: message });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 200
      });

      const botMessage = completion.choices[0]?.message?.content?.trim() 
        || "Grazie per il messaggio. La ricontattero a breve.";

      res.json({ message: botMessage });
    } catch (error) {
      console.error("Bot simulation error:", error);
      res.status(500).json({ error: "Errore nella simulazione", message: "Mi scusi, c'e stato un problema tecnico. Riprovi tra poco." });
    }
  });

  // AI Campaign Assistant - Chat per migliorare le campagne
  app.post("/api/ai/campaign-assistant", async (req, res) => {
    try {
      const { message, campaignContext, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Messaggio richiesto" });
      }

      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      });

      const systemPrompt = `Sei un esperto di marketing immobiliare e copywriting per agenzie immobiliari italiane.
Il tuo compito è aiutare a migliorare le campagne di acquisizione WhatsApp per contattare proprietari privati.

CONTESTO CAMPAGNA ATTUALE:
${campaignContext || "Nessun contesto fornito"}

COMPETENZE:
- Scrittura persuasiva per messaggi WhatsApp
- Gestione obiezioni nel settore immobiliare
- Tecniche di neuromarketing e rapport
- Conoscenza del mercato immobiliare italiano
- Best practice per acquisizione immobiliare

COSA PUOI FARE:
1. Migliorare i template dei messaggi per essere più efficaci
2. Suggerire nuove obiezioni da gestire e relative risposte
3. Ottimizzare le istruzioni per il bot
4. Proporre A/B test per migliorare le conversioni
5. Analizzare punti di forza e debolezza della campagna

FORMATO RISPOSTE:
- Rispondi in italiano
- Sii pratico e concreto con esempi specifici
- Quando suggerisci modifiche, mostra il testo esatto da usare
- Usa formattazione chiara (punti elenco, titoli)`;

      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];

      // Add conversation history
      if (history && Array.isArray(history)) {
        for (const msg of history) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      }

      // Add current message
      messages.push({ role: "user", content: message });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      });

      const aiMessage = completion.choices[0]?.message?.content?.trim() 
        || "Mi scusi, non sono riuscito a elaborare la richiesta. Riprovi.";

      res.json({ message: aiMessage });
    } catch (error) {
      console.error("AI Campaign Assistant error:", error);
      res.status(500).json({ error: "Errore nella risposta AI" });
    }
  });

  // ==================== WHATSAPP CHAT API ====================
  
  // Get all WhatsApp conversations with client names
  app.get("/api/whatsapp/conversations", async (req, res) => {
    try {
      const conversations = await storage.getWhatsappConversations();
      const clienti = await storage.getClienti();
      
      // Enrich conversations with client names
      const enrichedConversations = conversations.map(conv => {
        let clienteNome = conv.nome || null;
        if (conv.clienteId) {
          const cliente = clienti.find(c => c.id === conv.clienteId);
          if (cliente) {
            clienteNome = `${cliente.nome} ${cliente.cognome}`.trim();
          }
        }
        return { ...conv, clienteNome };
      });
      
      res.json(enrichedConversations);
    } catch (error) {
      console.error("Get WhatsApp conversations error:", error);
      res.status(500).json({ error: "Errore nel recupero conversazioni" });
    }
  });

  // Sync messages from UltraMsg API (polling alternative to webhooks)
  app.post("/api/whatsapp/sync", async (req, res) => {
    try {
      const { fetchRecentMessages } = await import("./ultramsg");
      const result = await fetchRecentMessages(50);
      
      if (!result.success || !result.messages) {
        return res.status(500).json({ error: result.error || "Errore nel recupero messaggi" });
      }

      const clienti = await storage.getClienti();
      let syncedCount = 0;
      let skippedCount = 0;

      for (const msg of result.messages) {
        // Determine if outbound or inbound based on from/to
        const instancePhone = "390235981509"; // Instance phone without @c.us
        const fromPhone = msg.from?.replace("@c.us", "").replace(/\D/g, '') || "";
        const toPhone = msg.to?.replace("@c.us", "").replace(/\D/g, '') || "";
        
        const isOutbound = fromPhone === instancePhone || fromPhone.endsWith(instancePhone.slice(-9));
        const contactPhone = isOutbound ? toPhone : fromPhone;
        
        if (!contactPhone || !msg.body) {
          skippedCount++;
          continue;
        }

        // Check if message already exists by UltraMsg ID
        const existingConv = await storage.getWhatsappConversationByPhone(contactPhone);
        if (existingConv) {
          const existingMessages = await storage.getWhatsappMessages(existingConv.id);
          const alreadyExists = existingMessages.some(m => 
            m.whatsappMessageId === String(msg.id) || 
            (m.content === msg.body && Math.abs(new Date(m.createdAt).getTime() - msg.created_at * 1000) < 60000)
          );
          if (alreadyExists) {
            skippedCount++;
            continue;
          }
        }

        // Find matching client
        const matchingClient = clienti.find(c => 
          c.telefono && c.telefono.replace(/\D/g, '').includes(contactPhone.slice(-9))
        );

        // Find or create conversation
        let conversation = await storage.getWhatsappConversationByPhone(contactPhone);
        if (!conversation) {
          conversation = await storage.createWhatsappConversation({
            phoneNumber: contactPhone,
            clienteId: matchingClient?.id || null,
            immobileId: null,
            nome: null,
            ultimoMessaggio: msg.body.substring(0, 100),
            ultimoMessaggioData: new Date(msg.created_at * 1000),
            nonLetti: isOutbound ? 0 : 1,
            stato: "attivo"
          });
        } else {
          await storage.updateWhatsappConversation(conversation.id, {
            ultimoMessaggio: msg.body.substring(0, 100),
            ultimoMessaggioData: new Date(msg.created_at * 1000),
            nonLetti: isOutbound ? (conversation.nonLetti || 0) : (conversation.nonLetti || 0) + 1,
            clienteId: conversation.clienteId || matchingClient?.id || null
          });
        }

        // Save message
        await storage.createWhatsappMessage({
          conversationId: conversation.id,
          whatsappMessageId: String(msg.id),
          direction: isOutbound ? "outbound" : "inbound",
          messageType: msg.type || "text",
          content: msg.body,
          mediaUrl: null,
          status: msg.ack || "sent"
        });

        // Create comunicazione
        await storage.createComunicazione({
          clienteId: conversation.clienteId,
          immobileId: conversation.immobileId,
          immobileEsternoId: null,
          whatsappMessageId: null,
          tipo: isOutbound ? "messaggio" : "risposta",
          testo: msg.body,
          canale: "whatsapp",
          creatoDA: isOutbound ? "agente" : "cliente",
          esito: null
        });

        syncedCount++;
      }

      // Notify WebSocket clients
      whatsappWS.broadcast({ type: "sync_complete", syncedCount });

      res.json({ 
        success: true, 
        synced: syncedCount, 
        skipped: skippedCount,
        total: result.messages.length 
      });
    } catch (error) {
      console.error("WhatsApp sync error:", error);
      res.status(500).json({ error: "Errore nella sincronizzazione" });
    }
  });

  // Get single conversation with messages
  app.get("/api/whatsapp/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getWhatsappConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversazione non trovata" });
      }
      const messages = await storage.getWhatsappMessages(id);
      res.json({ conversation, messages });
    } catch (error) {
      console.error("Get WhatsApp conversation error:", error);
      res.status(500).json({ error: "Errore nel recupero conversazione" });
    }
  });

  app.delete("/api/whatsapp/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getWhatsappConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversazione non trovata" });
      }
      await storage.deleteWhatsappConversation(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete WhatsApp conversation error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione conversazione" });
    }
  });

  // Get messages for a conversation
  app.get("/api/whatsapp/conversations/:id/messages", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const messages = await storage.getWhatsappMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Get WhatsApp messages error:", error);
      res.status(500).json({ error: "Errore nel recupero messaggi" });
    }
  });

  // Send a message (outbound)
  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const { phoneNumber, content, clienteId, immobileId } = req.body;
      
      if (!phoneNumber || !content) {
        return res.status(400).json({ error: "Numero e contenuto richiesti" });
      }

      // Normalize phone number
      const normalizedPhone = phoneNumber.replace(/\D/g, '');

      // Try to find matching client by phone if clienteId not provided
      let resolvedClienteId = clienteId || null;
      if (!resolvedClienteId) {
        const clienti = await storage.getClienti();
        const matchingClient = clienti.find(c => 
          c.telefono && c.telefono.replace(/\D/g, '').includes(normalizedPhone.slice(-9))
        );
        resolvedClienteId = matchingClient?.id || null;
      }

      // Get or create conversation
      let conversation = await storage.getWhatsappConversationByPhone(normalizedPhone);
      if (!conversation) {
        conversation = await storage.createWhatsappConversation({
          phoneNumber: normalizedPhone,
          clienteId: resolvedClienteId,
          immobileId: immobileId || null,
          nome: null,
          ultimoMessaggio: content.substring(0, 100),
          ultimoMessaggioData: new Date(),
          nonLetti: 0,
          stato: "attivo"
        });
      } else {
        // Update conversation with last message and link client if found
        const newClienteId = resolvedClienteId || conversation.clienteId;
        await storage.updateWhatsappConversation(conversation.id, {
          ultimoMessaggio: content.substring(0, 100),
          ultimoMessaggioData: new Date(),
          clienteId: newClienteId,
          immobileId: immobileId || conversation.immobileId
        });
        // Update local reference for comunicazione
        conversation = { ...conversation, clienteId: newClienteId };
      }

      // Create message record
      const message = await storage.createWhatsappMessage({
        conversationId: conversation.id,
        whatsappMessageId: null,
        direction: "outbound",
        messageType: "text",
        content,
        mediaUrl: null,
        status: "pending"
      });

      // Create comunicazione record - use resolvedClienteId which is always set correctly
      await storage.createComunicazione({
        clienteId: resolvedClienteId || conversation.clienteId,
        immobileId: immobileId || conversation.immobileId,
        immobileEsternoId: null,
        whatsappMessageId: message.id,
        tipo: "messaggio",
        testo: content,
        canale: "whatsapp",
        creatoDA: "agente",
        esito: null
      });

      // Mark all unread notifications for this client as read (auto-gestione)
      const clientIdToMark = resolvedClienteId || conversation.clienteId;
      if (clientIdToMark) {
        const markedCount = await storage.markNotificheLetteByCliente(clientIdToMark);
        if (markedCount > 0) {
          console.log(`[WhatsApp] Marked ${markedCount} notifications as read for client ${clientIdToMark}`);
        }
      }

      // Send via UltraMsg API
      if (isUltraMsgConfigured()) {
        const sendResult = await sendWhatsAppMessage(normalizedPhone, content);
        if (sendResult.success) {
          await storage.updateWhatsappMessageStatus(message.id, "sent");
          if (sendResult.messageId) {
            await storage.updateWhatsappMessage(message.id, { whatsappMessageId: sendResult.messageId });
          }
        } else {
          await storage.updateWhatsappMessageStatus(message.id, "failed");
          console.error("WhatsApp send failed:", sendResult.error);
        }
      } else {
        // UltraMsg not configured, just mark as sent for demo
        console.log("UltraMsg not configured, simulating send");
        await storage.updateWhatsappMessageStatus(message.id, "sent");
      }

      // Fetch updated conversation with correct state
      const updatedConversation = await storage.getWhatsappConversation(conversation.id);
      
      // Notify WebSocket clients with conversationId included
      whatsappWS.notifyNewMessage(conversation.id, { ...message, conversationId: conversation.id });
      if (updatedConversation) {
        whatsappWS.notifyConversationUpdate({ ...updatedConversation, conversationId: updatedConversation.id });
      }

      res.json({ success: true, message, conversationId: conversation.id });
    } catch (error) {
      console.error("Send WhatsApp message error:", error);
      res.status(500).json({ error: "Errore nell'invio messaggio" });
    }
  });

  // Webhook to receive incoming WhatsApp messages
  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      // Verify webhook signature/token for security
      const webhookToken = req.headers["x-webhook-token"] || req.query.token;
      const expectedToken = process.env.WHATSAPP_WEBHOOK_TOKEN || "immogest_webhook_secret";
      
      if (webhookToken !== expectedToken) {
        console.warn("WhatsApp webhook: invalid token attempt");
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("WhatsApp Webhook received:", JSON.stringify(req.body, null, 2));
      
      // Validate payload structure
      const { from, body, messageSid, profileName } = req.body;
      
      if (!from || typeof from !== "string") {
        return res.status(400).json({ error: "Missing or invalid 'from' field" });
      }
      
      if (!body || typeof body !== "string") {
        return res.status(200).json({ status: "ignored", reason: "no message content" });
      }

      // Normalize phone number
      const phoneNumber = from.replace(/\D/g, '');

      // Try to find matching client by phone
      const clienti = await storage.getClienti();
      const matchingClient = clienti.find(c => 
        c.telefono && c.telefono.replace(/\D/g, '').includes(phoneNumber.slice(-9))
      );

      // Find or create conversation
      let conversation = await storage.getWhatsappConversationByPhone(phoneNumber);
      if (!conversation) {
        conversation = await storage.createWhatsappConversation({
          phoneNumber,
          clienteId: matchingClient?.id || null,
          immobileId: null,
          nome: profileName || null,
          ultimoMessaggio: body.substring(0, 100),
          ultimoMessaggioData: new Date(),
          nonLetti: 1,
          stato: "attivo"
        });
      } else {
        // Update conversation and link client if not already linked
        const newClienteId = conversation.clienteId || matchingClient?.id || null;
        await storage.updateWhatsappConversation(conversation.id, {
          ultimoMessaggio: body.substring(0, 100),
          ultimoMessaggioData: new Date(),
          nonLetti: (conversation.nonLetti || 0) + 1,
          nome: profileName || conversation.nome,
          clienteId: newClienteId
        });
        conversation = { ...conversation, clienteId: newClienteId };
      }

      // Save the incoming message
      const message = await storage.createWhatsappMessage({
        conversationId: conversation.id,
        whatsappMessageId: messageSid || null,
        direction: "inbound",
        messageType: "text",
        content: body,
        mediaUrl: null,
        status: "received"
      });

      // Create comunicazione record
      await storage.createComunicazione({
        clienteId: conversation.clienteId,
        immobileId: conversation.immobileId,
        immobileEsternoId: null,
        whatsappMessageId: message.id,
        tipo: "risposta",
        testo: body,
        canale: "whatsapp",
        creatoDA: "cliente",
        esito: null
      });

      // Fetch updated conversation with correct unread count
      const updatedConversation = await storage.getWhatsappConversation(conversation.id);
      
      // Broadcast to WebSocket clients with conversationId
      whatsappWS.notifyNewMessage(conversation.id, { ...message, conversationId: conversation.id });
      if (updatedConversation) {
        whatsappWS.notifyConversationUpdate({ ...updatedConversation, conversationId: updatedConversation.id });
      }

      res.status(200).json({ status: "ok", messageId: message.id });
    } catch (error) {
      console.error("WhatsApp webhook error:", error);
      res.status(500).json({ error: "Webhook processing error" });
    }
  });

  // UltraMsg webhook for incoming messages and status updates
  // Supports both /api/webhook/ultramsg and /api/whatsapp/webhook paths
  const handleUltraMsgWebhook = async (req: Request, res: Response) => {
    try {
      console.log("UltraMsg Webhook received:", JSON.stringify(req.body, null, 2));
      
      const { event_type, event, data } = req.body;
      const eventName = event_type || event; // UltraMsg uses "event" field
      
      if (!data) {
        return res.status(200).json({ status: "ignored", reason: "no data" });
      }

      // Handle messages (message_create or message_received events)
      if ((eventName === "message_create" || eventName === "message_received") && data.body) {
        const isOutbound = data.fromMe === true;
        
        // For outbound messages (fromMe=true), use "to" as the conversation phone
        // For incoming messages, use "from" as the conversation phone
        const rawPhone = isOutbound 
          ? (data.to?.replace("@c.us", "") || "")
          : (data.from?.replace("@c.us", "") || "");
        const phoneNumber = rawPhone.replace(/\D/g, '');
        const body = data.body;
        const profileName = data.pushname || null;
        const messageId = data.sid || null;

        if (!phoneNumber) {
          return res.status(200).json({ status: "ignored", reason: "no phone number" });
        }
        
        // Check if this message already exists (avoid duplicates)
        const existingConv = await storage.getWhatsappConversationByPhone(phoneNumber);
        if (existingConv) {
          const existingMessages = await storage.getWhatsappMessages(existingConv.id);
          
          // Check by whatsappMessageId first
          if (messageId) {
            const alreadyExists = existingMessages.some(m => m.whatsappMessageId === messageId);
            if (alreadyExists) {
              return res.status(200).json({ status: "ignored", reason: "duplicate message by id" });
            }
          }
          
          // For outbound messages, also check if there's a recent message with same content
          // This handles the case where CRM sends a message (with null messageId) and webhook arrives later
          if (isOutbound) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const recentDuplicate = existingMessages.some(m => 
              m.direction === "outbound" && 
              m.content === body &&
              m.createdAt && new Date(m.createdAt) > fiveMinutesAgo
            );
            if (recentDuplicate) {
              // If we have the messageId from webhook, update the existing message
              if (messageId) {
                const msgToUpdate = existingMessages.find(m => 
                  m.direction === "outbound" && 
                  m.content === body &&
                  m.createdAt && new Date(m.createdAt) > fiveMinutesAgo &&
                  !m.whatsappMessageId
                );
                if (msgToUpdate) {
                  await storage.updateWhatsappMessage(msgToUpdate.id, { whatsappMessageId: messageId });
                  console.log(`Updated existing message ${msgToUpdate.id} with whatsappMessageId: ${messageId}`);
                }
              }
              return res.status(200).json({ status: "ignored", reason: "duplicate outbound message" });
            }
          }
        }

        // Try to find matching client by phone
        const clienti = await storage.getClienti();
        const matchingClient = clienti.find(c => 
          c.telefono && c.telefono.replace(/\D/g, '').includes(phoneNumber.slice(-9))
        );

        // Find or create conversation
        let conversation = await storage.getWhatsappConversationByPhone(phoneNumber);
        if (!conversation) {
          conversation = await storage.createWhatsappConversation({
            phoneNumber,
            clienteId: matchingClient?.id || null,
            immobileId: null,
            nome: profileName,
            ultimoMessaggio: body.substring(0, 100),
            ultimoMessaggioData: new Date(),
            nonLetti: isOutbound ? 0 : 1,
            stato: "attivo"
          });
        } else {
          // Update and link client if not already linked
          const newClienteId = conversation.clienteId || matchingClient?.id || null;
          await storage.updateWhatsappConversation(conversation.id, {
            ultimoMessaggio: body.substring(0, 100),
            ultimoMessaggioData: new Date(),
            nonLetti: isOutbound ? (conversation.nonLetti || 0) : (conversation.nonLetti || 0) + 1,
            nome: profileName || conversation.nome,
            clienteId: newClienteId
          });
          conversation = { ...conversation, clienteId: newClienteId };
        }

        // Save message (inbound or outbound)
        const message = await storage.createWhatsappMessage({
          conversationId: conversation.id,
          whatsappMessageId: messageId,
          direction: isOutbound ? "outbound" : "inbound",
          messageType: data.type || "text",
          content: body,
          mediaUrl: data.media || null,
          status: isOutbound ? "sent" : "received"
        });

        // Create comunicazione
        await storage.createComunicazione({
          clienteId: conversation.clienteId,
          immobileId: conversation.immobileId,
          immobileEsternoId: null,
          whatsappMessageId: message.id,
          tipo: isOutbound ? "messaggio" : "risposta",
          testo: body,
          canale: "whatsapp",
          creatoDA: isOutbound ? "agente" : "cliente",
          esito: null
        });

        const updatedConversation = await storage.getWhatsappConversation(conversation.id);
        whatsappWS.notifyNewMessage(conversation.id, { ...message, conversationId: conversation.id });
        if (updatedConversation) {
          whatsappWS.notifyConversationUpdate({ ...updatedConversation, conversationId: updatedConversation.id });
        }

        console.log(`Created ${isOutbound ? 'outbound' : 'inbound'} message from contact: ${messageId}`);

        // === BOT IA ACQUISIZIONE: Risposta automatica con delay umano (persistente) ===
        // Solo per messaggi IN ENTRATA (non outbound)
        if (!isOutbound && body) {
          try {
            // Check if bot is disabled for this conversation (manual management mode)
            if (conversation.botDisattivato) {
              console.log(`[Bot IA] Bot disabled for conversation ${conversation.id}, skipping automatic response`);
            } else {
            // Cerca se esiste un campaign_message attivo per questo numero
            const normalizedPhone = normalizeItalianPhone(phoneNumber);
            const campaignMessages = await storage.getCampaignMessagesByPhone(normalizedPhone);
            
            // Trova il campaign message più recente con conversazione attiva
            const activeCampaignMessage = campaignMessages.find(cm => 
              cm.conversationActive !== false && cm.sentAt
            );

            if (activeCampaignMessage) {
              // Calcola scheduledAt rispettando orari lavorativi (8:30-19:00, lun-ven)
              const scheduledAt = calculateWorkingHoursSchedule();
              
              console.log(`[Bot IA] Found active campaign message ${activeCampaignMessage.id} for ${normalizedPhone}`);
              console.log(`[Bot IA] Scheduling response at ${scheduledAt.toISOString()} (working hours: 8:30-19:00)`);
              
              // Salva nel database per elaborazione dal worker (persistente!)
              await storage.createScheduledBotMessage({
                campaignMessageId: activeCampaignMessage.id,
                conversationId: conversation.id,
                phoneNumber: normalizedPhone,
                userMessage: body,
                scheduledAt: scheduledAt,
                status: "pending"
              });
              
              console.log(`[Bot IA] Scheduled message saved to database for ${normalizedPhone}`);
              
            } else {
              console.log(`[Bot IA] No active campaign message for ${normalizedPhone}, skipping bot response`);
            }
            } // close else block for botDisattivato check
          } catch (botError) {
            console.error("[Bot IA] Error scheduling bot response:", botError);
            // Non blocchiamo il webhook se il bot fallisce
          }
        }

        return res.status(200).json({ status: "ok", action: "message_created", messageId: message.id });
      }

      // Handle message acknowledgment (delivery/read status) - only for message_ack events
      if (eventName === "message_ack" && data.ack !== undefined && data.ack !== "") {
        let newStatus = "sent";
        
        // UltraMsg ack string values: "server"=sent, "device"=delivered, "read"=read
        const ackValue = String(data.ack).toLowerCase();
        if (ackValue === "device" || ackValue === "2") {
          newStatus = "delivered";
        } else if (ackValue === "read" || ackValue === "3") {
          newStatus = "read";
        } else if (ackValue === "server" || ackValue === "1") {
          newStatus = "sent";
        }

        // Find message by whatsappMessageId and update status
        // UltraMsg sends 'id' in the root object (e.g., 658) and 'data.id' as full WhatsApp ID
        const messageIdToFind = String(req.body.id || data.sid || "");
        
        if (messageIdToFind) {
          const conversations = await storage.getWhatsappConversations();
          let found = false;
          for (const conv of conversations) {
            const messages = await storage.getWhatsappMessages(conv.id);
            const msg = messages.find(m => m.whatsappMessageId === messageIdToFind);
            if (msg) {
              await storage.updateWhatsappMessageStatus(msg.id, newStatus);
              whatsappWS.notifyNewMessage(conv.id, { ...msg, status: newStatus, conversationId: conv.id });
              found = true;
              console.log(`Updated message ${msg.id} status to ${newStatus}`);
              break;
            }
          }
          if (!found) {
            console.log(`Message not found for ID: ${messageIdToFind}`);
          }
        }
        
        return res.status(200).json({ status: "ok", action: "ack_updated" });
      }

      res.status(200).json({ status: "ignored" });
    } catch (error) {
      console.error("UltraMsg webhook error:", error);
      res.status(500).json({ error: "Webhook processing error" });
    }
  };
  
  // Register UltraMsg webhook on multiple paths for compatibility
  app.post("/api/webhook/ultramsg", handleUltraMsgWebhook);
  app.post("/api/whatsapp/webhook", handleUltraMsgWebhook);

  // Webhook verification for Meta WhatsApp Business API
  app.get("/api/webhook/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Check if verify token matches (use env var in production)
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "immogest_verify";
    
    if (mode === "subscribe" && token === verifyToken) {
      console.log("WhatsApp webhook verified");
      res.status(200).send(challenge);
    } else {
      res.status(403).send("Verification failed");
    }
  });

  // Mark conversation as read
  app.post("/api/whatsapp/conversations/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getWhatsappConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversazione non trovata" });
      }
      await storage.updateWhatsappConversation(id, { nonLetti: 0 });
      res.json({ success: true });
    } catch (error) {
      console.error("Mark conversation read error:", error);
      res.status(500).json({ error: "Errore" });
    }
  });

  // Toggle bot on/off for a conversation (manual management mode)
  app.post("/api/whatsapp/conversations/:id/toggle-bot", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await storage.getWhatsappConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversazione non trovata" });
      }
      const newBotDisattivato = !conversation.botDisattivato;
      await storage.updateWhatsappConversation(id, { botDisattivato: newBotDisattivato });
      res.json({ 
        success: true, 
        botDisattivato: newBotDisattivato,
        message: newBotDisattivato ? "Bot disattivato - gestione manuale" : "Bot attivato - risposte automatiche"
      });
    } catch (error) {
      console.error("Toggle bot error:", error);
      res.status(500).json({ error: "Errore" });
    }
  });

  app.get("/api/whatsapp/pending-approvals", async (req, res) => {
    try {
      const pending = await storage.getScheduledMessagesByStatus("pending_approval");
      res.json(pending);
    } catch (error) {
      console.error("Get pending approvals error:", error);
      res.status(500).json({ error: "Errore" });
    }
  });

  app.post("/api/whatsapp/scheduled-messages/:id/approve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { editedResponse } = req.body;
      
      const scheduled = await storage.getScheduledBotMessage(id);
      if (!scheduled || scheduled.status !== "pending_approval") {
        return res.status(404).json({ error: "Messaggio non trovato o già processato" });
      }
      
      const finalResponse = editedResponse || scheduled.botResponse;
      if (!finalResponse) {
        return res.status(400).json({ error: "Nessuna risposta da inviare" });
      }
      
      const sendResult = await sendWhatsAppMessage(scheduled.phoneNumber, finalResponse);
      
      if (sendResult.success) {
        const botMessage = await storage.createWhatsappMessage({
          conversationId: scheduled.conversationId,
          whatsappMessageId: sendResult.messageId || null,
          direction: "outbound",
          messageType: "chat",
          content: finalResponse,
          mediaUrl: null,
          status: "sent"
        });
        
        await storage.updateWhatsappConversation(scheduled.conversationId, {
          ultimoMessaggio: finalResponse.substring(0, 100),
          ultimoMessaggioData: new Date()
        });
        
        if (whatsappWS) {
          const finalConversation = await storage.getWhatsappConversation(scheduled.conversationId);
          whatsappWS.notifyNewMessage(scheduled.conversationId, { ...botMessage, conversationId: scheduled.conversationId });
          if (finalConversation) {
            whatsappWS.notifyConversationUpdate({ ...finalConversation, conversationId: finalConversation.id });
          }
        }
        
        await storage.updateScheduledBotMessage(id, {
          status: "sent",
          botResponse: finalResponse,
          sentAt: new Date()
        });
        
        res.json({ success: true, message: "Risposta approvata e inviata" });
      } else {
        res.status(500).json({ error: `Errore invio: ${sendResult.error}` });
      }
    } catch (error) {
      console.error("Approve scheduled message error:", error);
      res.status(500).json({ error: "Errore" });
    }
  });

  app.post("/api/whatsapp/scheduled-messages/:id/reject", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateScheduledBotMessage(id, { status: "rejected" });
      res.json({ success: true, message: "Risposta rifiutata" });
    } catch (error) {
      console.error("Reject scheduled message error:", error);
      res.status(500).json({ error: "Errore" });
    }
  });

  // Link conversation to client/property
  app.patch("/api/whatsapp/conversations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { clienteId, immobileId, stato } = req.body;
      
      const conversation = await storage.updateWhatsappConversation(id, {
        ...(clienteId !== undefined && { clienteId }),
        ...(immobileId !== undefined && { immobileId }),
        ...(stato && { stato })
      });

      if (!conversation) {
        return res.status(404).json({ error: "Conversazione non trovata" });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Update conversation error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento" });
    }
  });

  // ==================== ATTIVITA CLIENTE ====================
  
  // Get all client activities (with optional stato/immobileId filter)
  app.get("/api/attivita-cliente", async (req, res) => {
    try {
      const stato = req.query.stato as string | undefined;
      const immobileId = req.query.immobileId ? parseInt(req.query.immobileId as string) : undefined;
      const attivita = await storage.getAllAttivitaCliente(stato, immobileId);
      res.json(attivita);
    } catch (error) {
      console.error("Get attivita cliente error:", error);
      res.status(500).json({ error: "Errore nel recupero attività" });
    }
  });

  // Get activities for a specific client
  app.get("/api/clienti/:id/attivita", async (req, res) => {
    try {
      const clienteId = parseInt(req.params.id);
      const attivita = await storage.getAttivitaCliente(clienteId);
      res.json(attivita);
    } catch (error) {
      console.error("Get client attivita error:", error);
      res.status(500).json({ error: "Errore nel recupero attività cliente" });
    }
  });

  // Get all matching for a client (aggregated from all their richieste)
  app.get("/api/clienti/:id/matching", async (req, res) => {
    try {
      const clienteId = parseInt(req.params.id);
      
      // Get all richieste for this client
      const richieste = await storage.getRichieste(clienteId);
      
      const immobiliMatching: any[] = [];
      const mercatoMatching: any[] = [];
      
      for (const richiesta of richieste) {
        // Get matching immobili
        const matchingImmobili = await storage.getMatching(richiesta.id);
        for (const m of matchingImmobili) {
          const immobile = await storage.getImmobile(m.immobileId);
          if (immobile && immobile.attivo) {
            immobiliMatching.push({
              matchingId: m.id,
              score: m.punteggio || 0,
              richiestaId: richiesta.id,
              richiestaTipologia: richiesta.tipologia || "N/A",
              richiestaZona: richiesta.zona || null,
              immobile,
            });
          }
        }
        
        // Get matching opportunità mercato
        const matchingMercato = await storage.getMatchingOpportunitaByRichiesta(richiesta.id);
        for (const m of matchingMercato) {
          const opportunita = await storage.getOpportunitaMercatoById(m.opportunitaId);
          if (opportunita && opportunita.stato !== "scartato") {
            mercatoMatching.push({
              matchingId: m.id,
              score: m.punteggio || 0,
              richiestaId: richiesta.id,
              richiestaTipologia: richiesta.tipologia || "N/A",
              richiestaZona: richiesta.zona || null,
              opportunity: opportunita,
            });
          }
        }
      }
      
      // Sort by score
      immobiliMatching.sort((a, b) => b.score - a.score);
      mercatoMatching.sort((a, b) => b.score - a.score);
      
      res.json({
        immobili: immobiliMatching,
        mercato: mercatoMatching
      });
    } catch (error) {
      console.error("Get client matching error:", error);
      res.status(500).json({ error: "Errore nel recupero matching cliente" });
    }
  });
  
  // Generate matching for a client (for all their richieste)
  app.post("/api/clienti/:id/matching", async (req, res) => {
    try {
      const clienteId = parseInt(req.params.id);
      
      // Get all richieste for this client
      const richieste = await storage.getRichieste(clienteId);
      
      // Prefetch all data once to avoid redundant lookups
      const allImmobili = await storage.getImmobili();
      const activeImmobili = allImmobili.filter(i => i.attivo);
      const allOpportunita = await storage.getOpportunitaMercato();
      const activeOpportunita = allOpportunita.filter(o => o.stato !== "scartato");
      
      let totalMatchingCreated = 0;
      let totalMatchingUpdated = 0;
      
      for (const richiesta of richieste) {
        // Prefetch existing matching for this richiesta once
        const existingImmobiliMatching = await storage.getMatching(richiesta.id);
        const existingMercatoMatching = await storage.getMatchingOpportunitaByRichiesta(richiesta.id);
        
        // Create maps for fast lookup
        const existingImmobiliMap = new Map(existingImmobiliMatching.map(m => [m.immobileId, m]));
        const existingMercatoMap = new Map(existingMercatoMatching.map(m => [m.opportunitaId, m]));
        
        // Calculate matching for immobili
        for (const immobile of activeImmobili) {
          const score = calculateMatchScore(richiesta, immobile);
          if (score >= 30) {
            const existing = existingImmobiliMap.get(immobile.id);
            
            if (!existing) {
              await storage.createMatching({
                richiestaId: richiesta.id,
                immobileId: immobile.id,
                punteggio: score,
                stato: "proposto",
                note: "Matching automatico generato dal sistema"
              });
              totalMatchingCreated++;
            } else if (existing.punteggio !== score) {
              await storage.updateMatching(existing.id, { punteggio: score });
              totalMatchingUpdated++;
            }
          }
        }
        
        // Calculate matching for mercato opportunities
        for (const opp of activeOpportunita) {
          const score = calculateMatchScoreMercato(richiesta, opp);
          if (score >= 30) {
            const existing = existingMercatoMap.get(opp.id);
            
            if (!existing) {
              await storage.createMatchingOpportunita({
                richiestaId: richiesta.id,
                opportunitaId: opp.id,
                punteggio: score,
                stato: "proposto",
                note: "Matching automatico generato dal sistema"
              });
              totalMatchingCreated++;
            } else if (existing.punteggio !== score) {
              await storage.updateMatchingOpportunita(existing.id, { punteggio: score });
              totalMatchingUpdated++;
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        matchingCreated: totalMatchingCreated,
        matchingUpdated: totalMatchingUpdated,
        richiesteProcessed: richieste.length
      });
    } catch (error) {
      console.error("Generate client matching error:", error);
      res.status(500).json({ error: "Errore nella generazione matching cliente" });
    }
  });

  // Create client activity
  app.post("/api/attivita-cliente", async (req, res) => {
    try {
      const parsed = insertAttivitaClienteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error.errors });
      }
      const attivita = await storage.createAttivitaCliente(parsed.data);
      res.json(attivita);
    } catch (error) {
      console.error("Create attivita cliente error:", error);
      res.status(500).json({ error: "Errore nella creazione attività" });
    }
  });

  // Update client activity
  app.patch("/api/attivita-cliente/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const attivita = await storage.updateAttivitaCliente(id, req.body);
      if (!attivita) {
        return res.status(404).json({ error: "Attività non trovata" });
      }
      res.json(attivita);
    } catch (error) {
      console.error("Update attivita cliente error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento attività" });
    }
  });

  // Delete client activity
  app.delete("/api/attivita-cliente/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAttivitaCliente(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete attivita cliente error:", error);
      res.status(500).json({ error: "Errore nell'eliminazione attività" });
    }
  });

  // ==================== RICHIESTE EMAIL PORTALI ====================
  
  // Register an inbound email request from real estate portals
  // This creates a client (if not exists) and activities for tracking
  app.post("/api/email-richiesta", async (req, res) => {
    try {
      const { 
        email, 
        nome, 
        cognome, 
        telefono, 
        immobileId, 
        descrizioneRichiesta,
        portale 
      } = req.body;

      if (!email && !telefono) {
        return res.status(400).json({ error: "Email o telefono richiesto" });
      }

      // Check if client already exists by email
      let cliente = null;
      const clienti = await storage.getClienti();
      
      if (email) {
        cliente = clienti.find(c => c.email?.toLowerCase() === email.toLowerCase());
      }
      
      // If not found by email, try by phone
      if (!cliente && telefono) {
        const normalizedPhone = telefono.replace(/\D/g, '').slice(-9);
        cliente = clienti.find(c => 
          c.telefono && c.telefono.replace(/\D/g, '').includes(normalizedPhone)
        );
      }

      // Create new client if not exists
      const isNewClient = !cliente;
      if (!cliente) {
        cliente = await storage.createCliente({
          nome: nome || "Potenziale",
          cognome: cognome || "Acquirente",
          email: email || null,
          telefono: telefono || null,
          tipoCliente: "compratore",
          ratingCliente: 3,
          note: `Contatto da portale ${portale || 'immobiliare'}`
        });
      }

      // Validate immobileId if provided
      let immobile = null;
      let immobileTitolo = "";
      if (immobileId) {
        immobile = await storage.getImmobile(immobileId);
        if (!immobile) {
          return res.status(404).json({ error: "Immobile non trovato" });
        }
        immobileTitolo = immobile.indirizzo || immobile.titolo || `ID ${immobileId}`;
      }

      // Create client activity
      const attivitaCliente = await storage.createAttivitaCliente({
        clienteId: cliente.id,
        immobileId: immobileId || null,
        titolo: immobileTitolo 
          ? `Mail ricevuta per immobile in ${immobileTitolo}`
          : `Richiesta generica da ${portale || 'portale'}`,
        descrizione: descrizioneRichiesta || null,
        fonte: portale || "email",
        scadenza: null,
        stato: "da_fare"
      });

      // Create immobile activity if immobileId provided
      let attivitaImmobile = null;
      if (immobileId) {
        const clienteNome = `${cliente.nome} ${cliente.cognome}`.trim();
        attivitaImmobile = await storage.createAttivitaImmobile({
          immobileId,
          titolo: `Mail ricevuta da ${clienteNome}`,
          descrizione: descrizioneRichiesta || null,
          scadenza: null,
          stato: "da_fare"
        });
      }

      // Create comunicazione record
      await storage.createComunicazione({
        clienteId: cliente.id,
        immobileId: immobileId || null,
        immobileEsternoId: null,
        whatsappMessageId: null,
        tipo: "richiesta",
        testo: descrizioneRichiesta || `Richiesta da ${portale || 'portale'}`,
        canale: "email",
        creatoDA: "cliente",
        esito: null
      });

      res.json({
        success: true,
        cliente,
        attivitaCliente,
        attivitaImmobile,
        isNewClient
      });
    } catch (error) {
      console.error("Email richiesta error:", error);
      res.status(500).json({ error: "Errore nella registrazione richiesta email" });
    }
  });

  // ==================== ATTIVITA IMMOBILE (EXTENDED) ====================
  
  // Get all property activities (with optional stato filter)
  app.get("/api/attivita-immobile", async (req, res) => {
    try {
      const stato = req.query.stato as string | undefined;
      const attivita = await storage.getAllAttivitaImmobile(stato);
      res.json(attivita);
    } catch (error) {
      console.error("Get attivita immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero attività" });
    }
  });

  // ==================== GMAIL INTEGRATION ====================

  // Debug Gmail credentials
  app.get("/api/gmail/debug", async (req, res) => {
    const clientId = process.env.GMAIL_CLIENT_ID || '';
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN || '';
    
    res.json({
      clientId: clientId ? `${clientId.slice(0, 20)}...${clientId.slice(-30)}` : 'MISSING',
      clientIdLength: clientId.length,
      clientIdEndsWithApps: clientId.endsWith('.apps.googleusercontent.com'),
      clientSecret: clientSecret ? `${clientSecret.slice(0, 10)}...` : 'MISSING',
      clientSecretLength: clientSecret.length,
      refreshToken: refreshToken ? `${refreshToken.slice(0, 10)}...` : 'MISSING',
      refreshTokenLength: refreshToken.length,
      refreshTokenStartsWith1: refreshToken.startsWith('1//'),
    });
  });

  // Get unread emails
  app.get("/api/gmail/unread", async (req, res) => {
    try {
      const maxResults = parseInt(req.query.max as string) || 10;
      const emails = await getUnreadEmails(maxResults);
      res.json(emails);
    } catch (error: any) {
      console.error("Gmail unread error:", error);
      if (error.message?.includes('Gmail not connected')) {
        res.status(401).json({ error: "Gmail non connesso", needsAuth: true });
      } else {
        res.status(500).json({ error: "Errore nel recupero email" });
      }
    }
  });

  // Search forwarded emails from Paolo Salvemini (form responses)
  app.get("/api/gmail/salvemini", async (req, res) => {
    try {
      // Search for emails forwarded from Paolo Salvemini (typically form responses from portals)
      const query = 'from:paolo.salvemini OR (subject:Fw subject:salvemini) OR (subject:Fwd subject:salvemini)';
      const emails = await getEmailsByQuery(query, 20);
      
      // Return full details for analysis
      res.json({
        count: emails.length,
        emails: emails.map(email => ({
          id: email.id,
          threadId: email.threadId,
          from: email.from,
          subject: email.subject,
          date: email.date,
          snippet: email.snippet,
          bodyPreview: email.body?.substring(0, 1000) || '',
          fullBody: email.body
        }))
      });
    } catch (error: any) {
      console.error("Gmail Salvemini search error:", error);
      if (error.message?.includes('Gmail not connected')) {
        res.status(401).json({ error: "Gmail non connesso", needsAuth: true });
      } else {
        res.status(500).json({ error: "Errore nella ricerca email Salvemini" });
      }
    }
  });

  // Search all emails (read and unread) by query
  app.get("/api/gmail/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' required" });
      }
      const emails = await getEmailsByQuery(query, 30);
      res.json(emails.map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        date: email.date,
        snippet: email.snippet,
        body: email.body?.substring(0, 2000)
      })));
    } catch (error: any) {
      console.error("Gmail search error:", error);
      res.status(500).json({ error: "Errore nella ricerca email" });
    }
  });

  // Search portal emails
  app.get("/api/gmail/portali", async (req, res) => {
    try {
      const emails = await searchPortalEmails();
      const parsedEmails = emails.map(email => ({
        ...email,
        parsed: parsePortalEmail(email)
      }));
      res.json(parsedEmails);
    } catch (error: any) {
      console.error("Gmail portali error:", error);
      if (error.message?.includes('Gmail not connected')) {
        res.status(401).json({ error: "Gmail non connesso", needsAuth: true });
      } else {
        res.status(500).json({ error: "Errore nel recupero email dai portali" });
      }
    }
  });

  // Search form response emails (risposte acquisizioni)
  app.get("/api/gmail/form-responses", async (req, res) => {
    try {
      const { searchFormResponseEmails, parseFormResponseEmail } = await import("./gmail-service");
      const emails = await searchFormResponseEmails();
      const parsedEmails = emails.map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        date: email.date,
        snippet: email.snippet,
        parsed: parseFormResponseEmail(email)
      }));
      res.json({
        count: emails.length,
        emails: parsedEmails
      });
    } catch (error: any) {
      console.error("Gmail form-responses error:", error);
      if (error.message?.includes('Gmail not connected')) {
        res.status(401).json({ error: "Gmail non connesso", needsAuth: true });
      } else {
        res.status(500).json({ error: "Errore nel recupero email form responses" });
      }
    }
  });

  // Mark email as read
  app.post("/api/gmail/mark-read/:id", async (req, res) => {
    try {
      const messageId = req.params.id;
      await markAsRead(messageId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Gmail mark read error:", error);
      res.status(500).json({ error: "Errore nel segnare email come letta" });
    }
  });

  // Process portal email - create client and activities
  app.post("/api/gmail/process", async (req, res) => {
    try {
      const { emailId, immobileId } = req.body;
      
      // Get the email
      const emails = await getUnreadEmails(100);
      const email = emails.find(e => e.id === emailId);
      
      if (!email) {
        return res.status(404).json({ error: "Email non trovata" });
      }
      
      const parsed = parsePortalEmail(email);
      
      // Create or find client
      let cliente = null;
      let isNewClient = false;
      
      if (parsed.emailCliente) {
        const existingClients = await storage.getClienti();
        cliente = existingClients.find(c => c.email === parsed.emailCliente);
        
        if (!cliente && parsed.telefonoCliente) {
          cliente = existingClients.find(c => c.telefono === parsed.telefonoCliente);
        }
        
        if (!cliente) {
          isNewClient = true;
          const nameParts = (parsed.nomeCliente || "Contatto").split(" ");
          cliente = await storage.createCliente({
            nome: nameParts[0] || "Contatto",
            cognome: nameParts.slice(1).join(" ") || parsed.portale,
            email: parsed.emailCliente || null,
            telefono: parsed.telefonoCliente || null,
            tipoCliente: "acquirente",
            ratingCliente: 3,
            note: `Importato da ${parsed.portale}`
          });
        }
      }
      
      if (!cliente) {
        return res.status(400).json({ error: "Impossibile identificare il cliente dall'email" });
      }
      
      // Create client activity
      const attivitaCliente = await storage.createAttivitaCliente({
        clienteId: cliente.id,
        immobileId: immobileId || null,
        titolo: `Email da ${parsed.portale}`,
        descrizione: parsed.testoRichiesta.slice(0, 500),
        fonte: parsed.portale,
        scadenza: null,
        stato: "da_fare"
      });
      
      // Create property activity if immobileId
      let attivitaImmobile = null;
      if (immobileId) {
        attivitaImmobile = await storage.createAttivitaImmobile({
          immobileId,
          titolo: `Richiesta da ${cliente.nome} ${cliente.cognome}`,
          descrizione: parsed.testoRichiesta.slice(0, 500),
          scadenza: null,
          stato: "da_fare"
        });
      }
      
      // Create comunicazione
      await storage.createComunicazione({
        clienteId: cliente.id,
        immobileId: immobileId || null,
        immobileEsternoId: null,
        whatsappMessageId: null,
        tipo: "richiesta",
        testo: parsed.testoRichiesta.slice(0, 1000),
        canale: "email",
        creatoDA: "cliente",
        esito: null
      });
      
      // Mark email as read
      await markAsRead(emailId);
      
      res.json({
        success: true,
        cliente,
        isNewClient,
        attivitaCliente,
        attivitaImmobile,
        parsed
      });
    } catch (error: any) {
      console.error("Gmail process error:", error);
      res.status(500).json({ error: "Errore nell'elaborazione email" });
    }
  });

  // ==================== GOOGLE CALENDAR ====================
  const { getAuthUrl, handleCallback, isCalendarConnected, syncEventToGoogleCalendar, isGoogleCalendarConfigured } = await import("./google-calendar-service");
  
  app.get("/api/calendar/auth-status", async (_req, res) => {
    try {
      const status = await isCalendarConnected();
      res.json(status);
    } catch (error: any) {
      console.error("Calendar auth status error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/calendar/auth", async (_req, res) => {
    try {
      if (!isGoogleCalendarConfigured()) {
        return res.status(400).json({ error: "Google Calendar non configurato" });
      }
      const url = getAuthUrl();
      res.redirect(url);
    } catch (error: any) {
      console.error("Calendar auth error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/calendar/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.status(400).json({ error: "Codice autorizzazione mancante" });
      }
      const result = await handleCallback(code);
      res.redirect("/conferma-appuntamenti?connected=true");
    } catch (error: any) {
      console.error("Calendar callback error:", error);
      res.redirect("/conferma-appuntamenti?error=" + encodeURIComponent(error.message));
    }
  });

  // ==================== CALENDAR EVENTS ====================
  app.get("/api/calendar-events", async (_req, res) => {
    try {
      const events = await storage.getCalendarEvents();
      res.json(events);
    } catch (error: any) {
      console.error("Get calendar events error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/calendar-events", async (req, res) => {
    try {
      const { title, startDate: startDateStr, endDate: endDateStr, location, description, clientName, clientPhone, salutation } = req.body;
      
      if (!title || !startDateStr) {
        return res.status(400).json({ error: "Titolo e data di inizio sono obbligatori" });
      }
      
      const startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        return res.status(400).json({ error: "Formato data non valido" });
      }
      
      const endDate = endDateStr 
        ? new Date(endDateStr) 
        : new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const event = await storage.createCalendarEvent({
        title,
        description: description || null,
        startDate,
        endDate,
        location: location || null,
        syncStatus: "pending",
        dedupeKey: `${clientPhone || ""}-${startDate.toISOString()}`,
      });
      
      // Also create appointment confirmation record
      await storage.createAppointmentConfirmation({
        originalMessage: description || "",
        clientName: clientName || null,
        clientPhone: clientPhone || null,
        salutation: salutation || null,
        appointmentDate: startDate,
        address: location || null,
        calendarEventId: event.id,
        status: "created",
      });
      
      // Auto-sync to Google Calendar if connected
      const calendarStatus = await isCalendarConnected();
      if (calendarStatus.connected) {
        const syncResult = await syncEventToGoogleCalendar(event.id);
        if (syncResult.success) {
          const updatedEvent = await storage.getCalendarEvent(event.id);
          return res.json(updatedEvent);
        }
      }
      
      res.json(event);
    } catch (error: any) {
      console.error("Create calendar event error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/calendar-events/:id/sync", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const result = await syncEventToGoogleCalendar(eventId);
      if (result.success) {
        const event = await storage.getCalendarEvent(eventId);
        res.json(event);
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Sync calendar event error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== APPOINTMENT CONFIRMATIONS ====================
  app.get("/api/appointment-confirmations", async (_req, res) => {
    try {
      const confirmations = await storage.getAppointmentConfirmations();
      res.json(confirmations);
    } catch (error: any) {
      console.error("Get appointment confirmations error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/appointment-confirmations/extract", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Messaggio mancante" });
      }
      
      const { extractAppointmentData } = await import("./ai-service");
      const extracted = await extractAppointmentData(message);
      res.json(extracted);
    } catch (error: any) {
      console.error("Extract appointment data error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new appointment confirmation
  app.post("/api/appointment-confirmations", async (req, res) => {
    try {
      const { clienteId, immobileId, salutation, clientName, clientPhone, appointmentDate, address, status } = req.body;
      const confirmation = await storage.createAppointmentConfirmation({
        clienteId: clienteId || null,
        immobileId: immobileId || null,
        salutation,
        clientName,
        clientPhone,
        appointmentDate: new Date(appointmentDate),
        address,
        status: status || "pending",
      });
      res.json(confirmation);
    } catch (error: any) {
      console.error("Create appointment confirmation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update appointment confirmation
  app.patch("/api/appointment-confirmations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const confirmation = await storage.updateAppointmentConfirmation(id, req.body);
      res.json(confirmation);
    } catch (error: any) {
      console.error("Update appointment confirmation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete appointment confirmation
  app.delete("/api/appointment-confirmations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteAppointmentConfirmation(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete appointment confirmation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Send confirmation: WhatsApp message + activity records + calendar event with reminders
  app.post("/api/appointment-confirmations/:id/send", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const confirmation = await storage.getAppointmentConfirmation(id);
      if (!confirmation) {
        return res.status(404).json({ error: "Conferma non trovata" });
      }

      const appointmentDate = new Date(confirmation.appointmentDate);
      const formattedDate = appointmentDate.toLocaleDateString("it-IT", { 
        weekday: "long", 
        day: "numeric", 
        month: "long",
        timeZone: "Europe/Rome"
      });
      const formattedTime = appointmentDate.toLocaleTimeString("it-IT", { 
        hour: "2-digit", 
        minute: "2-digit",
        timeZone: "Europe/Rome"
      });

      // 1. Send WhatsApp message (required - fail if not sent)
      let whatsappSent = false;
      if (!confirmation.clientPhone) {
        return res.status(400).json({ error: "Numero di telefono mancante" });
      }
      if (!process.env.ULTRAMSG_INSTANCE_ID || !process.env.ULTRAMSG_API_KEY) {
        return res.status(500).json({ error: "WhatsApp non configurato. Contatta l'amministratore." });
      }
      
      const messageText = `${confirmation.salutation || ""} ${confirmation.clientName || ""},\n\nLe confermo l'appuntamento di ${formattedDate} alle ore ${formattedTime}${confirmation.address ? ` in ${confirmation.address}` : ""}.\n\nLa ringrazio per la disponibilità.\nCordiali saluti,\nDott. Ilan Boni\nCavour Immobiliare`;
      
      try {
        const phone = confirmation.clientPhone.replace(/\D/g, "");
        const response = await fetch(`https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: process.env.ULTRAMSG_API_KEY,
            to: phone.startsWith("39") ? phone : `39${phone}`,
            body: messageText,
          }),
        });
        const result = await response.json();
        if (result.sent === "true" || result.sent === true) {
          whatsappSent = true;
          console.log("WhatsApp message sent successfully to:", phone);
        } else {
          console.error("WhatsApp send failed:", result);
          return res.status(500).json({ error: `Invio WhatsApp fallito: ${result.error || "errore sconosciuto"}` });
        }
      } catch (whatsappError: any) {
        console.error("WhatsApp send error:", whatsappError);
        return res.status(500).json({ error: `Errore invio WhatsApp: ${whatsappError.message}` });
      }

      // 2. Create client activity if clienteId exists
      if (confirmation.clienteId) {
        const activityTitle = `Appuntamento in ${confirmation.address || "sede da definire"}`;
        await storage.createAttivitaCliente({
          clienteId: confirmation.clienteId,
          immobileId: confirmation.immobileId || null,
          titolo: activityTitle,
          descrizione: `Appuntamento confermato per ${formattedDate} alle ${formattedTime}`,
          stato: "da_fare",
          scadenza: appointmentDate,
        });
      }

      // 3. Create property activity if immobileId exists
      if (confirmation.immobileId) {
        const activityTitle = `Appuntamento con ${confirmation.salutation || ""} ${confirmation.clientName || "cliente"}`;
        await storage.createAttivitaImmobile({
          immobileId: confirmation.immobileId,
          titolo: activityTitle,
          descrizione: `Visita programmata per ${formattedDate} alle ${formattedTime}`,
          stato: "da_fare",
          scadenza: appointmentDate,
        });
      }

      // 4. Create calendar event with reminders (2 days before + 2 hours before, push + email)
      const eventTitle = `${confirmation.clientName || "Cliente"} - ${confirmation.clientPhone || ""}`;
      const endDate = new Date(appointmentDate.getTime() + 60 * 60 * 1000); // +1 hour
      
      const event = await storage.createCalendarEvent({
        title: eventTitle,
        description: `Appuntamento con ${confirmation.salutation || ""} ${confirmation.clientName || ""}`,
        startDate: appointmentDate,
        endDate: endDate,
        location: confirmation.address || "",
        clienteId: confirmation.clienteId || null,
        immobileId: confirmation.immobileId || null,
        appointmentConfirmationId: confirmation.id,
        syncStatus: "pending",
      });

      // Sync to Google Calendar with reminders
      let calendarSynced = false;
      try {
        const { syncEventToGoogleCalendar } = await import("./google-calendar-service");
        console.log("[Calendar] Syncing event", event.id, "to Google Calendar...");
        const syncResult = await syncEventToGoogleCalendar(event.id, {
          reminders: [
            { method: "popup", minutes: 2880 },  // 2 days = 2880 minutes
            { method: "email", minutes: 2880 },  // 2 days email
            { method: "popup", minutes: 120 },   // 2 hours = 120 minutes
            { method: "email", minutes: 120 },   // 2 hours email
          ],
        });
        console.log("[Calendar] Sync result:", syncResult);
        calendarSynced = syncResult.success;
        if (!syncResult.success) {
          console.error("[Calendar] Sync failed:", syncResult.error);
        }
      } catch (syncError) {
        console.error("[Calendar] Sync error:", syncError);
      }

      // 5. Update confirmation status
      await storage.updateAppointmentConfirmation(id, { 
        status: "sent",
        calendarEventId: event.id,
      });

      res.json({ 
        success: true, 
        message: "Messaggio inviato, attività create e evento calendario sincronizzato con promemoria" 
      });
    } catch (error: any) {
      console.error("Send confirmation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== SINCRONIZZAZIONE DATABASE ====================
  
  // Export data from this environment (protected with secret key)
  app.get("/api/admin/export", async (req, res) => {
    try {
      // Require sync secret for security
      const syncSecret = process.env.SESSION_SECRET;
      const providedSecret = req.headers['x-sync-secret'] as string;
      
      if (!providedSecret || providedSecret !== syncSecret) {
        return res.status(401).json({ error: "Non autorizzato" });
      }

      const [clienti, immobili, immobiliEsterni] = await Promise.all([
        storage.getClienti(),
        storage.getImmobili(),
        storage.getImmobiliEsterni(),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        environment: process.env.REPLIT_DEPLOYMENT === '1' ? 'production' : 'development',
        data: {
          clienti,
          immobili,
          immobiliEsterni,
        }
      };

      res.json(exportData);
    } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Import data from production (only available in development)
  app.post("/api/admin/sync-from-production", async (req, res) => {
    try {
      // Only allow in development environment
      if (process.env.REPLIT_DEPLOYMENT === '1') {
        return res.status(403).json({ error: "Sincronizzazione non permessa in produzione" });
      }

      // Hard-coded production URL for security (no SSRF)
      const productionUrl = 'https://cavour.replit.app';
      const syncSecret = process.env.SESSION_SECRET;
      
      if (!syncSecret) {
        return res.status(500).json({ error: "Configurazione sync secret mancante" });
      }
      
      // Fetch data from production with auth header
      const response = await fetch(`${productionUrl}/api/admin/export`, {
        headers: { 'x-sync-secret': syncSecret }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(500).json({ 
          error: errorData.error || "Impossibile connettersi alla produzione" 
        });
      }

      const exportData = await response.json();
      
      if (exportData.environment !== 'production') {
        return res.status(400).json({ error: "I dati non provengono dalla produzione" });
      }

      const { clienti } = exportData.data;
      let imported = 0;
      let updated = 0;
      let skipped = 0;

      // Import clienti (upsert based on phone/email)
      for (const cliente of clienti) {
        const esistenti = await storage.getClienti();
        const esistente = esistenti.find(c => {
          const samePhone = c.telefono && cliente.telefono && 
            c.telefono.replace(/\D/g, '') === cliente.telefono.replace(/\D/g, '');
          const sameEmail = c.email && cliente.email && 
            c.email.toLowerCase() === cliente.email.toLowerCase();
          return samePhone || sameEmail;
        });

        if (!esistente) {
          // Create new
          await storage.createCliente({
            appellativo: cliente.appellativo || "",
            nome: cliente.nome || "",
            cognome: cliente.cognome || "",
            telefono: cliente.telefono || "",
            email: cliente.email || "",
            compleanno: cliente.compleanno || "",
            religione: cliente.religione || "",
            note: cliente.note || "",
            tipoCliente: cliente.tipoCliente || "compratore",
            ratingCliente: cliente.ratingCliente || 3,
            clienteAmico: cliente.clienteAmico || false,
            linkImmobile: cliente.linkImmobile || null,
            attivo: cliente.attivo !== false,
          });
          imported++;
        } else {
          // Update if production is newer
          const prodDate = new Date(cliente.updatedAt || cliente.createdAt);
          const localDate = new Date(esistente.updatedAt || esistente.createdAt);
          if (prodDate > localDate) {
            await storage.updateCliente(esistente.id, {
              appellativo: cliente.appellativo,
              nome: cliente.nome,
              cognome: cliente.cognome,
              telefono: cliente.telefono,
              email: cliente.email,
              note: cliente.note,
              tipoCliente: cliente.tipoCliente,
              ratingCliente: cliente.ratingCliente,
              clienteAmico: cliente.clienteAmico,
            });
            updated++;
          } else {
            skipped++;
          }
        }
      }

      res.json({ 
        success: true, 
        message: `Sincronizzazione completata: ${imported} nuovi, ${updated} aggiornati, ${skipped} ignorati`,
        imported,
        updated,
        skipped,
      });
    } catch (error: any) {
      console.error("Sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Import data from external source (used by sync-to-production)
  app.post("/api/admin/import", async (req, res) => {
    try {
      // Require sync secret for security
      const syncSecret = process.env.SESSION_SECRET;
      const providedSecret = req.headers['x-sync-secret'] as string;
      
      if (!providedSecret || providedSecret !== syncSecret) {
        return res.status(401).json({ error: "Non autorizzato" });
      }

      const { clienti, deleteNotInSource } = req.body;
      if (!clienti || !Array.isArray(clienti)) {
        return res.status(400).json({ error: "Dati clienti mancanti o non validi" });
      }

      let imported = 0;
      let updated = 0;
      let deleted = 0;

      // Build set of source phone/email for deletion check
      const sourcePhones = new Set(clienti.map((c: any) => c.telefono?.replace(/\D/g, '')).filter(Boolean));
      const sourceEmails = new Set(clienti.map((c: any) => c.email?.toLowerCase()).filter(Boolean));

      // Delete clients not in source if requested
      if (deleteNotInSource) {
        const esistenti = await storage.getClienti();
        for (const esistente of esistenti) {
          const phoneNorm = esistente.telefono?.replace(/\D/g, '');
          const emailNorm = esistente.email?.toLowerCase();
          const inSource = (phoneNorm && sourcePhones.has(phoneNorm)) || 
                          (emailNorm && sourceEmails.has(emailNorm));
          if (!inSource) {
            await storage.deleteCliente(esistente.id);
            deleted++;
          }
        }
      }

      for (const cliente of clienti) {
        const esistenti = await storage.getClienti();
        const esistente = esistenti.find(c => {
          const samePhone = c.telefono && cliente.telefono && 
            c.telefono.replace(/\D/g, '') === cliente.telefono.replace(/\D/g, '');
          const sameEmail = c.email && cliente.email && 
            c.email.toLowerCase() === cliente.email.toLowerCase();
          return samePhone || sameEmail;
        });

        if (!esistente) {
          await storage.createCliente({
            appellativo: cliente.appellativo || "",
            nome: cliente.nome || "",
            cognome: cliente.cognome || "",
            telefono: cliente.telefono || "",
            email: cliente.email || "",
            compleanno: cliente.compleanno || "",
            religione: cliente.religione || "",
            note: cliente.note || "",
            tipoCliente: cliente.tipoCliente || "compratore",
            ratingCliente: cliente.ratingCliente || 3,
            clienteAmico: cliente.clienteAmico || false,
            linkImmobile: cliente.linkImmobile || null,
            attivo: cliente.attivo !== false,
          });
          imported++;
        } else {
          // Always update with incoming data
          await storage.updateCliente(esistente.id, {
            appellativo: cliente.appellativo,
            nome: cliente.nome,
            cognome: cliente.cognome,
            telefono: cliente.telefono,
            email: cliente.email,
            note: cliente.note,
            tipoCliente: cliente.tipoCliente,
            ratingCliente: cliente.ratingCliente,
            clienteAmico: cliente.clienteAmico,
          });
          updated++;
        }
      }

      res.json({ 
        success: true, 
        message: `Import completato: ${imported} nuovi, ${updated} aggiornati, ${deleted} eliminati`,
        imported,
        updated,
        deleted,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete clients by phone pattern (for cleanup)
  app.post("/api/admin/delete-by-pattern", async (req, res) => {
    try {
      const syncSecret = process.env.SESSION_SECRET;
      const providedSecret = req.headers['x-sync-secret'] as string;
      
      if (!providedSecret || providedSecret !== syncSecret) {
        return res.status(401).json({ error: "Non autorizzato" });
      }

      const { phonePattern } = req.body;
      if (!phonePattern) {
        return res.status(400).json({ error: "Pattern telefono mancante" });
      }

      const clienti = await storage.getClienti();
      const regex = new RegExp(phonePattern);
      let deleted = 0;

      for (const cliente of clienti) {
        if (cliente.telefono && regex.test(cliente.telefono)) {
          await storage.deleteCliente(cliente.id);
          deleted++;
        }
      }

      res.json({ success: true, deleted });
    } catch (error: any) {
      console.error("Delete by pattern error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Push local data to production (only available in development)
  app.post("/api/admin/sync-to-production", async (req, res) => {
    try {
      // Only allow in development environment
      if (process.env.REPLIT_DEPLOYMENT === '1') {
        return res.status(403).json({ error: "Sincronizzazione verso produzione non permessa dalla produzione stessa" });
      }

      const productionUrl = 'https://cavour.replit.app';
      const syncSecret = process.env.SESSION_SECRET;
      
      if (!syncSecret) {
        return res.status(500).json({ error: "Configurazione sync secret mancante" });
      }

      // First, delete invalid phone numbers in production
      const deleteResponse = await fetch(`${productionUrl}/api/admin/delete-by-pattern`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-sync-secret': syncSecret 
        },
        body: JSON.stringify({ phonePattern: '^[15]' }),
      });
      const deleteResult = await deleteResponse.json().catch(() => ({}));
      console.log('[Sync] Deleted invalid phones in production:', deleteResult);

      // Get local data
      const clienti = await storage.getClienti();

      // Send to production with delete flag
      const response = await fetch(`${productionUrl}/api/admin/import`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-sync-secret': syncSecret 
        },
        body: JSON.stringify({ clienti, deleteNotInSource: true }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(500).json({ 
          error: errorData.error || "Errore durante l'invio alla produzione" 
        });
      }

      const result = await response.json();
      res.json(result);
    } catch (error: any) {
      console.error("Sync to production error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== SCRAPE URL (per iPad/mobile) ====================
  const { scrapePropertyUrl, isApifyConfigured, extractPhoneFromImage } = await import('./apify-scraper');

  app.get("/api/scrape/status", async (req, res) => {
    res.json({ configured: isApifyConfigured() });
  });

  app.post("/api/scrape/url", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL richiesto" });
      }

      if (!isApifyConfigured()) {
        return res.status(500).json({ error: "Apify non configurato. Aggiungi APIFY_API_TOKEN." });
      }

      console.log('[Scrape] Avvio scraping per:', url);
      const data = await scrapePropertyUrl(url);
      
      if (!data) {
        return res.status(404).json({ error: "Nessun dato trovato per questo URL" });
      }

      res.json(data);
    } catch (error: any) {
      console.error("Scrape URL error:", error);
      res.status(500).json({ error: error.message || "Errore durante lo scraping" });
    }
  });

  // OCR per estrarre telefono da screenshot
  app.post("/api/scrape/ocr-phone", async (req, res) => {
    try {
      const { image } = req.body;
      
      if (!image) {
        return res.status(400).json({ error: "Immagine richiesta (base64)" });
      }

      // Rimuovi prefisso data:image/... se presente
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      
      console.log('[OCR] Analisi screenshot per telefono...');
      const phone = await extractPhoneFromImage(base64Data);
      
      if (phone) {
        console.log('[OCR] Telefono trovato:', phone);
        res.json({ phone, found: true });
      } else {
        console.log('[OCR] Nessun telefono trovato');
        res.json({ phone: null, found: false });
      }
    } catch (error: any) {
      console.error("OCR phone error:", error);
      res.status(500).json({ error: error.message || "Errore durante l'OCR" });
    }
  });

  // Estrai telefono da URL usando browser headless (clicca "Mostra numero")
  app.post("/api/scrape/extract-phone", async (req, res) => {
    try {
      const { url } = req.body;
      
      if (!url) {
        return res.status(400).json({ error: "URL richiesto" });
      }

      console.log('[ExtractPhone] Avvio estrazione telefono per:', url);
      
      const { extractPhoneFromUrl } = await import('./phone-scraper');
      const result = await extractPhoneFromUrl(url);
      
      if (result.phone) {
        console.log('[ExtractPhone] Telefono trovato:', result.phone, 'metodo:', result.method);
        res.json({ 
          phone: result.phone, 
          found: true, 
          method: result.method 
        });
      } else {
        console.log('[ExtractPhone] Nessun telefono trovato');
        res.json({ phone: null, found: false });
      }
    } catch (error: any) {
      console.error("Extract phone error:", error);
      res.status(500).json({ error: error.message || "Errore durante l'estrazione telefono" });
    }
  });

  // Aggiorna telefono di un immobile esterno
  app.post("/api/immobili-esterni/:id/extract-phone", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }

      if (!immobile.urlAnnuncio) {
        return res.status(400).json({ error: "Immobile senza URL annuncio" });
      }

      console.log('[ExtractPhone] Estrazione telefono per immobile', id, ':', immobile.urlAnnuncio);
      
      const { extractPhoneFromUrl } = await import('./phone-scraper');
      const result = await extractPhoneFromUrl(immobile.urlAnnuncio);
      
      if (result.phone) {
        await storage.updateImmobileEsterno(id, { 
          contattoTelefono: result.phone 
        });
        console.log('[ExtractPhone] Telefono aggiornato:', result.phone);
        res.json({ 
          phone: result.phone, 
          found: true, 
          method: result.method,
          updated: true
        });
      } else {
        res.json({ phone: null, found: false, updated: false });
      }
    } catch (error: any) {
      console.error("Extract phone for immobile error:", error);
      res.status(500).json({ error: error.message || "Errore durante l'estrazione telefono" });
    }
  });

  // Check for duplicate/similar properties before saving
  app.post("/api/scrape/check-duplicate", async (req, res) => {
    try {
      const { indirizzo, titolo, zona, mq, prezzo, urlAnnuncio } = req.body;
      
      // First check exact URL match
      if (urlAnnuncio) {
        const existingByUrl = await storage.getImmobileEsternoByUrl(urlAnnuncio);
        if (existingByUrl) {
          return res.json({
            isDuplicate: true,
            exactMatch: true,
            existing: existingByUrl,
            message: "Immobile già presente con lo stesso URL"
          });
        }
      }
      
      // Then check for similar properties by address/characteristics
      const addressToCheck = indirizzo || titolo || zona || null;
      const similarProperties = await storage.findSimilarImmobiliEsterni(
        addressToCheck,
        mq || null,
        prezzo || null
      );
      
      if (similarProperties.length > 0) {
        return res.json({
          isDuplicate: false,
          hasSimilar: true,
          similar: similarProperties.slice(0, 5), // Max 5 similar
          message: `Trovati ${similarProperties.length} immobili simili`
        });
      }
      
      res.json({
        isDuplicate: false,
        hasSimilar: false,
        message: "Nessun duplicato trovato"
      });
    } catch (error: any) {
      console.error("Check duplicate error:", error);
      res.status(500).json({ error: error.message || "Errore durante il controllo duplicati" });
    }
  });

  app.post("/api/scrape/save", async (req, res) => {
    try {
      const data = req.body;
      
      if (!data.urlAnnuncio) {
        return res.status(400).json({ error: "Dati immobile mancanti" });
      }

      // Check if phone number was already contacted for another property
      if (data.contattoTelefono) {
        const normalizedPhone = data.contattoTelefono.replace(/\D/g, '');
        const allProperties = await storage.getImmobiliEsterni();
        const existingWithSamePhone = allProperties.find(p => 
          p.contattoTelefono && 
          p.contattoTelefono.replace(/\D/g, '') === normalizedPhone &&
          p.statoContatto === "contattato"
        );
        
        if (existingWithSamePhone) {
          return res.status(400).json({ 
            error: `Questo numero di telefono è già stato contattato per l'immobile: ${existingWithSamePhone.indirizzo || existingWithSamePhone.titolo}`,
            alreadyContacted: true,
            existingPropertyId: existingWithSamePhone.id
          });
        }
        
        // Also check for exact URL duplicate
        const existingByUrl = await storage.getImmobileEsternoByUrl(data.urlAnnuncio);
        if (existingByUrl) {
          return res.status(400).json({ 
            error: "Questo annuncio è già stato importato",
            isDuplicate: true,
            existingPropertyId: existingByUrl.id
          });
        }
      }

      // Crea cliente proprietario
      const cliente = await storage.createCliente({
        nome: "Proprietario",
        cognome: data.indirizzo || data.zona || "da URL",
        telefono: data.contattoTelefono || null,
        email: data.contattoEmail || null,
        tipoCliente: "venditore",
        ratingCliente: 3,
        attivo: true
      });

      // Crea immobile esterno con dati contatto
      const immobileEsterno = await storage.createImmobileEsterno({
        titolo: data.titolo || "Immobile da " + data.portale,
        descrizione: data.descrizione || "",
        indirizzo: data.indirizzo || "",
        zona: data.zona || "",
        citta: data.citta || "Milano",
        prezzo: data.prezzo ? String(data.prezzo) : null,
        mq: data.mq || null,
        camere: data.camere || null,
        bagni: data.bagni || null,
        piano: data.piano || null,
        ascensore: data.ascensore || false,
        balcone: data.balcone || false,
        terrazzo: data.terrazzo || false,
        box: data.box || false,
        cantina: data.cantina || false,
        giardino: data.giardino || false,
        arredato: data.arredato || false,
        classeEnergetica: data.classeEnergetica || null,
        urlAnnuncio: data.urlAnnuncio,
        riferimentoAnnuncio: data.riferimentoAnnuncio || null,
        portale: data.portale || "Web",
        fonte: "privato",
        statoContatto: "nuovo",
        immagini: data.immagini || [],
        testoOriginale: JSON.stringify(data.raw || {}),
        clienteId: cliente.id,
        contattoNome: data.contattoNome || null,
        contattoTelefono: data.contattoTelefono || null,
        contattoEmail: data.contattoEmail || null,
        attivo: true
      });

      res.json({ 
        success: true, 
        immobileEsternoId: immobileEsterno.id,
        clienteId: cliente.id,
        message: "Immobile salvato con successo"
      });
    } catch (error: any) {
      console.error("Save scraped property error:", error);
      res.status(500).json({ error: error.message || "Errore durante il salvataggio" });
    }
  });

  // ==================== OPPORTUNITA MERCATO ====================

  // Lista opportunità con filtri
  app.get("/api/mercato", async (req, res) => {
    try {
      const { stato, zona, prezzoMin, prezzoMax } = req.query;
      const opportunita = await storage.getOpportunitaMercato({
        stato: stato as string,
        zona: zona as string,
        prezzoMin: prezzoMin ? Number(prezzoMin) : undefined,
        prezzoMax: prezzoMax ? Number(prezzoMax) : undefined,
      });
      res.json(opportunita);
    } catch (error: any) {
      console.error("Get opportunita mercato error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Dettaglio opportunità
  app.get("/api/mercato/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const opportunita = await storage.getOpportunitaMercatoById(id);
      if (!opportunita) {
        return res.status(404).json({ error: "Opportunità non trovata" });
      }
      
      // Carica dati correlati
      const [pubblicizzatoDa, attivita, documenti, matchingList] = await Promise.all([
        storage.getPubblicizzatoDa(id),
        storage.getAttivitaOpportunita(id),
        storage.getDocumentiOpportunita(id),
        storage.getMatchingOpportunita(id),
      ]);
      
      // Enrich matching with cliente and richiesta data
      const enrichedMatching = await Promise.all(
        matchingList.map(async (match) => {
          const richiesta = await storage.getRichiesta(match.richiestaId);
          const cliente = richiesta ? await storage.getCliente(richiesta.clienteId) : null;
          return {
            ...match,
            richiesta,
            cliente,
          };
        })
      );
      
      res.json({
        ...opportunita,
        pubblicizzatoDa,
        attivita,
        documenti,
        matching: enrichedMatching,
      });
    } catch (error: any) {
      console.error("Get opportunita mercato detail error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Crea opportunità
  app.post("/api/mercato", async (req, res) => {
    try {
      const opportunita = await storage.createOpportunitaMercato(req.body);
      
      // Se c'è richiestaOrigineId, calcola matching specifico
      if (req.body.richiestaOrigineId) {
        const richiesta = await storage.getRichiesta(req.body.richiestaOrigineId);
        if (richiesta) {
          await storage.createMatchingOpportunita({
            opportunitaId: opportunita.id,
            richiestaId: richiesta.id,
            punteggio: 80, // Score alto perché collegato manualmente
          });
        }
      }
      
      // Auto-generate matching for all other richieste in background
      generateMatchingForOpportunita(opportunita.id).catch(e => 
        console.error("[Auto-Matching] Error for opportunita:", e)
      );
      
      res.json(opportunita);
    } catch (error: any) {
      console.error("Create opportunita mercato error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Aggiorna opportunità
  app.patch("/api/mercato/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const opportunita = await storage.updateOpportunitaMercato(id, req.body);
      if (!opportunita) {
        return res.status(404).json({ error: "Opportunità non trovata" });
      }
      res.json(opportunita);
    } catch (error: any) {
      console.error("Update opportunita mercato error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cambia stato opportunità
  app.patch("/api/mercato/:id/stato", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { stato, motivoScarto, noteScarto } = req.body;
      
      const updateData: any = { stato };
      if (stato === "scartato") {
        updateData.motivoScarto = motivoScarto;
        updateData.noteScarto = noteScarto;
      }
      if (stato === "acquisito") {
        updateData.dataAcquisizione = new Date();
      }
      
      const opportunita = await storage.updateOpportunitaMercato(id, updateData);
      if (!opportunita) {
        return res.status(404).json({ error: "Opportunità non trovata" });
      }
      res.json(opportunita);
    } catch (error: any) {
      console.error("Update opportunita stato error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Elimina opportunità
  app.delete("/api/mercato/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteOpportunitaMercato(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete opportunita mercato error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Opportunità collegate a una richiesta
  app.get("/api/richieste/:id/opportunita", async (req, res) => {
    try {
      const richiestaId = Number(req.params.id);
      const opportunita = await storage.getOpportunitaMercatoByRichiesta(richiestaId);
      res.json(opportunita);
    } catch (error: any) {
      console.error("Get opportunita by richiesta error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Aggiungi opportunità da richiesta (con link automatico)
  app.post("/api/richieste/:id/add-opportunita", async (req, res) => {
    try {
      const richiestaId = Number(req.params.id);
      const richiesta = await storage.getRichiesta(richiestaId);
      if (!richiesta) {
        return res.status(404).json({ error: "Richiesta non trovata" });
      }

      const opportunita = await storage.createOpportunitaMercato({
        ...req.body,
        richiestaOrigineId: richiestaId,
        stato: "in_valutazione",
      });

      // Crea matching con la richiesta
      await storage.createMatchingOpportunita({
        opportunitaId: opportunita.id,
        richiestaId: richiestaId,
        punteggio: 80, // Score alto - collegamento manuale
      });

      // Aggiorna contatori match
      await storage.updateOpportunitaMercato(opportunita.id, {
        matchCount: 1,
        matchAlti: 1,
      });

      res.json({ 
        success: true, 
        opportunita,
        message: "Opportunità aggiunta e collegata alla richiesta"
      });
    } catch (error: any) {
      console.error("Add opportunita from richiesta error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Pubblicizzato Da - CRUD
  app.post("/api/mercato/:id/pubblicizzato-da", async (req, res) => {
    try {
      const opportunitaId = Number(req.params.id);
      const pub = await storage.createPubblicizzatoDa({
        ...req.body,
        opportunitaId,
      });
      res.json(pub);
    } catch (error: any) {
      console.error("Create pubblicizzato da error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/mercato/pubblicizzato-da/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deletePubblicizzatoDa(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete pubblicizzato da error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Attività Opportunità - CRUD
  app.post("/api/mercato/:id/attivita", async (req, res) => {
    try {
      const opportunitaId = Number(req.params.id);
      const attivita = await storage.createAttivitaOpportunita({
        ...req.body,
        opportunitaId,
      });
      res.json(attivita);
    } catch (error: any) {
      console.error("Create attivita opportunita error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/mercato/attivita/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteAttivitaOpportunita(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete attivita opportunita error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Documenti Opportunità - CRUD
  app.post("/api/mercato/:id/documenti", async (req, res) => {
    try {
      const opportunitaId = Number(req.params.id);
      const doc = await storage.createDocumentoOpportunita({
        ...req.body,
        opportunitaId,
      });
      res.json(doc);
    } catch (error: any) {
      console.error("Create documento opportunita error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/mercato/documenti/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteDocumentoOpportunita(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete documento opportunita error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Matching Opportunità
  app.get("/api/mercato/:id/matching", async (req, res) => {
    try {
      const opportunitaId = Number(req.params.id);
      const matching = await storage.getMatchingOpportunita(opportunitaId);
      
      // Arricchisci con dati richiesta e cliente
      const enrichedMatching = await Promise.all(matching.map(async (m) => {
        const richiesta = await storage.getRichiesta(m.richiestaId);
        const cliente = richiesta ? await storage.getCliente(richiesta.clienteId) : null;
        return {
          ...m,
          richiesta,
          cliente,
        };
      }));
      
      res.json(enrichedMatching);
    } catch (error: any) {
      console.error("Get matching opportunita error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Aggiorna matching (es. segna messaggio inviato)
  app.patch("/api/mercato/matching/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const matching = await storage.updateMatchingOpportunita(id, req.body);
      if (!matching) {
        return res.status(404).json({ error: "Matching non trovato" });
      }
      res.json(matching);
    } catch (error: any) {
      console.error("Update matching opportunita error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Genera matching per opportunità mercato
  app.post("/api/mercato/matching/generate", async (req, res) => {
    try {
      const { opportunitaId } = req.body;
      
      // Get all opportunita or just one
      let opportunitaList = opportunitaId 
        ? [await storage.getOpportunitaMercatoById(opportunitaId)].filter(Boolean)
        : await storage.getOpportunitaMercato();
      
      // Filter only active ones (not scartato)
      opportunitaList = opportunitaList.filter((o: any) => o && o.stato !== "scartato");
      
      // Get all active richieste
      const richieste = (await storage.getRichieste()).filter(r => r.attiva);
      
      const newMatches = [];
      
      for (const opportunita of opportunitaList) {
        if (!opportunita) continue;
        
        // Delete existing matches for this opportunità
        const existingMatching = await storage.getMatchingOpportunita(opportunita.id);
        for (const m of existingMatching) {
          await storage.deleteMatchingOpportunita(m.id);
        }
        
        for (const richiesta of richieste) {
          const punteggio = calculateMatchScoreMercato(richiesta, opportunita);
          
          // Only create matches with score >= 30
          if (punteggio >= 30) {
            const match = await storage.createMatchingOpportunita({
              opportunitaId: opportunita.id,
              richiestaId: richiesta.id,
              punteggio,
            });
            newMatches.push(match);
          }
        }
      }
      
      res.json({ 
        message: "Matching mercato generati con successo", 
        count: newMatches.length,
        matches: newMatches 
      });
    } catch (error: any) {
      console.error("Generate matching mercato error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get matching by richiesta (per mostrare opportunità interessanti nella scheda cliente)
  app.get("/api/richieste/:id/matching-mercato", async (req, res) => {
    try {
      const richiestaId = Number(req.params.id);
      const matching = await storage.getMatchingOpportunitaByRichiesta(richiestaId);
      
      // Arricchisci con dati opportunità
      const enrichedMatching = await Promise.all(matching.map(async (m) => {
        const opportunita = await storage.getOpportunitaMercatoById(m.opportunitaId);
        return {
          ...m,
          opportunita,
        };
      }));
      
      // Filtra solo opportunità esistenti e ordina per punteggio
      const filtered = enrichedMatching
        .filter(m => m.opportunita)
        .sort((a, b) => (b.punteggio || 0) - (a.punteggio || 0));
      
      res.json(filtered);
    } catch (error: any) {
      console.error("Get matching mercato by richiesta error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get matching immobili by richiesta (per mostrare immobili interessanti nella scheda cliente)
  app.get("/api/richieste/:id/matching-immobili", async (req, res) => {
    try {
      const richiestaId = Number(req.params.id);
      const matching = await storage.getMatching(richiestaId);
      
      // Arricchisci con dati immobile
      const enrichedMatching = await Promise.all(matching.map(async (m) => {
        const immobile = await storage.getImmobile(m.immobileId);
        return {
          ...m,
          immobile,
        };
      }));
      
      // Filtra solo immobili esistenti e attivi, ordina per punteggio
      const filtered = enrichedMatching
        .filter(m => m.immobile && m.immobile.attivo)
        .sort((a, b) => (b.punteggio || 0) - (a.punteggio || 0));
      
      res.json(filtered);
    } catch (error: any) {
      console.error("Get matching immobili by richiesta error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Comunicazioni relative a un'opportunità mercato
  app.get("/api/mercato/:id/comunicazioni", async (req, res) => {
    try {
      const opportunitaId = Number(req.params.id);
      const opportunita = await storage.getOpportunitaMercatoById(opportunitaId);
      if (!opportunita) {
        return res.status(404).json({ error: "Opportunità non trovata" });
      }

      // Cerca le comunicazioni legate all'opportunità tramite matching
      const matching = await storage.getMatchingOpportunita(opportunitaId);
      const richiestaIds = matching.map(m => m.richiestaId);
      
      // Recupera i clienti da ciascuna richiesta
      const clienteIds: number[] = [];
      for (const richiestaId of richiestaIds) {
        const richiesta = await storage.getRichiesta(richiestaId);
        if (richiesta) {
          clienteIds.push(richiesta.clienteId);
        }
      }

      // Recupera comunicazioni di questi clienti
      const comunicazioni = [];
      for (const clienteId of clienteIds) {
        const cliente = await storage.getCliente(clienteId);
        const comms = await storage.getComunicazioni(clienteId);
        for (const com of comms) {
          comunicazioni.push({
            ...com,
            clienteNome: cliente ? `${cliente.nome} ${cliente.cognome || ""}`.trim() : "Cliente",
          });
        }
      }

      // Ordina per data
      comunicazioni.sort((a, b) => new Date(b.dataOra).getTime() - new Date(a.dataOra).getTime());
      
      res.json(comunicazioni);
    } catch (error: any) {
      console.error("Get comunicazioni opportunita error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Converti opportunità in immobile portafoglio
  app.post("/api/mercato/:id/converti-portafoglio", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const opportunita = await storage.getOpportunitaMercatoById(id);
      if (!opportunita) {
        return res.status(404).json({ error: "Opportunità non trovata" });
      }

      // Crea nuovo immobile nel portafoglio con i dati dell'opportunità
      const immobile = await storage.createImmobile({
        titolo: opportunita.titolo,
        descrizione: opportunita.descrizione,
        indirizzo: opportunita.indirizzo,
        zona: opportunita.zona,
        citta: opportunita.citta,
        mq: opportunita.mq,
        prezzo: opportunita.prezzo,
        piano: opportunita.piano,
        pianiEdificio: opportunita.pianiEdificio,
        camere: opportunita.camere,
        bagni: opportunita.bagni,
        ascensore: opportunita.ascensore,
        balcone: opportunita.balcone,
        terrazzo: opportunita.terrazzo,
        box: opportunita.box,
        cantina: opportunita.cantina,
        giardino: opportunita.giardino,
        arredato: opportunita.arredato,
        statoNuovo: opportunita.statoNuovo,
        statoRistrutturato: opportunita.statoRistrutturato,
        statoBuono: opportunita.statoBuono,
        statoDaRistrutturare: opportunita.statoDaRistrutturare,
        classeEnergetica: opportunita.classeEnergetica,
        prestazioneEnergetica: opportunita.prestazioneEnergetica,
        speseCondominiali: opportunita.speseCondominiali,
        riscaldamento: opportunita.riscaldamento,
        esposizione: opportunita.esposizione,
        annoCostruzione: opportunita.annoCostruzione,
        urlAnnuncio: opportunita.urlAnnuncio,
        immagini: opportunita.immagini as string[],
        caratteristiche: opportunita.caratteristiche as Record<string, any>,
        origine: "acquisizione",
        statoVendita: "disponibile",
        attivo: true,
      });

      // Aggiorna opportunità con riferimento al nuovo immobile
      await storage.updateOpportunitaMercato(id, {
        stato: "acquisito",
        immobilePortafoglioId: immobile.id,
        dataAcquisizione: new Date(),
      });

      // Log attività
      await storage.createAttivitaOpportunita({
        opportunitaId: id,
        tipo: "nota",
        titolo: "Convertito in portafoglio",
        descrizione: `Immobile aggiunto al portafoglio con ID ${immobile.id}`,
        esito: "positivo",
      });

      res.json({ 
        success: true, 
        immobile,
        message: "Opportunità convertita in immobile di portafoglio"
      });
    } catch (error: any) {
      console.error("Convert to portafoglio error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Proponi clienti matchati per opportunità acquisita
  app.get("/api/mercato/:id/proponi-clienti", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const opportunita = await storage.getOpportunitaMercatoById(id);
      if (!opportunita) {
        return res.status(404).json({ error: "Opportunità non trovata" });
      }

      // Recupera tutti i matching
      const matchingList = await storage.getMatchingOpportunita(id);
      
      // Arricchisci con dati cliente e genera bozze messaggi
      const proposte = await Promise.all(matchingList.map(async (m) => {
        const richiesta = await storage.getRichiesta(m.richiestaId);
        if (!richiesta) return null;
        
        const cliente = await storage.getCliente(richiesta.clienteId);
        if (!cliente) return null;

        // Genera bozza messaggio se non esiste
        let bozzaMessaggio = m.bozzaMessaggio;
        if (!bozzaMessaggio) {
          bozzaMessaggio = `Gentile ${cliente.nome || 'Cliente'}, abbiamo un immobile che potrebbe interessarle: ${opportunita.titolo} in ${opportunita.zona}. ${opportunita.mq ? opportunita.mq + ' mq' : ''} ${opportunita.prezzo ? '€' + Number(opportunita.prezzo).toLocaleString('it-IT') : ''}. Le interessa fissare una visita?`;
        }

        return {
          matchingId: m.id,
          richiesta,
          cliente,
          punteggio: m.punteggio,
          bozzaMessaggio,
          messaggioInviato: m.messaggioInviato,
        };
      }));

      res.json(proposte.filter(Boolean));
    } catch (error: any) {
      console.error("Get proponi clienti error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== IDEALISTA CONVERSATIONS ====================

  // Check if Idealista integration is configured
  app.get("/api/idealista/status", async (req, res) => {
    try {
      res.json({
        configured: isIdealistaConfigured(),
        hasApifyToken: !!process.env.APIFY_API_TOKEN,
        hasCredentials: !!(process.env.IDEALISTA_EMAIL && process.env.IDEALISTA_PASSWORD)
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Preview conversations from Idealista (dry run - no changes)
  app.post("/api/idealista/preview", async (req, res) => {
    try {
      if (!isIdealistaConfigured()) {
        return res.status(400).json({ 
          error: "Integrazione Idealista non configurata. Servono APIFY_API_TOKEN, IDEALISTA_EMAIL e IDEALISTA_PASSWORD" 
        });
      }

      console.log("[API] Starting Idealista conversations preview (dry run)...");
      const result = await previewIdealistaConversations();
      
      res.json({
        message: "Anteprima completata - nessun dato salvato",
        summary: {
          conversationsFound: result.conversations.length,
          totalMessages: result.totalMessages,
          clientsMatched: result.conversations.filter(c => c.matchedClient).length,
          wouldCreateClients: result.conversations.filter(c => c.wouldCreateClient).length,
          propertiesMatched: result.conversations.filter(c => c.matchedProperty).length
        },
        conversations: result.conversations,
        errors: result.errors
      });
    } catch (error: any) {
      console.error("Idealista preview error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Handle CORS preflight for Idealista extension
  app.options("/api/idealista/import-from-extension", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(200);
  });

  // Import conversations from browser extension
  app.post("/api/idealista/import-from-extension", async (req, res) => {
    // Set CORS headers for response
    res.header("Access-Control-Allow-Origin", "*");
    try {
      const { conversations, extractedAt, sourceUrl } = req.body;
      
      if (!conversations || !Array.isArray(conversations)) {
        return res.status(400).json({ error: "Dati conversazioni non validi" });
      }

      console.log(`[Idealista Extension] Received ${conversations.length} conversations`);
      
      let imported = 0;
      let matched = 0;
      const errors: string[] = [];

      for (const conv of conversations) {
        try {
          // Try to match client by name
          const clienti = await storage.getClienti();
          let matchedCliente = null;
          
          // Try phone match
          if (conv.contactPhone) {
            const normalizedPhone = conv.contactPhone.replace(/\D/g, '');
            matchedCliente = clienti.find(c => {
              const clientPhone = c.telefono?.replace(/\D/g, '') || '';
              return clientPhone && (clientPhone.endsWith(normalizedPhone) || normalizedPhone.endsWith(clientPhone));
            });
          }
          
          // Try email match
          if (!matchedCliente && conv.contactEmail) {
            matchedCliente = clienti.find(c => 
              c.email?.toLowerCase() === conv.contactEmail.toLowerCase()
            );
          }
          
          // Try name match (fuzzy)
          if (!matchedCliente && conv.contactName) {
            const nameParts = conv.contactName.toLowerCase().split(/\s+/).filter((p: string) => p.length > 2);
            if (nameParts.length > 0) {
              matchedCliente = clienti.find(c => {
                const clientName = `${c.nome || ''} ${c.cognome || ''}`.toLowerCase();
                return nameParts.some((part: string) => clientName.includes(part));
              });
            }
          }

          // Try to match immobile from propertyRef or message content
          let matchedImmobile = null;
          const immobili = await storage.getImmobili();
          const searchText = `${conv.propertyRef || ''} ${conv.lastMessage || ''}`.toLowerCase();
          
          // Extract street names from message (Via/Viale/Piazza + name)
          const streetMatch = searchText.match(/(via|viale|piazza|corso|largo)\s+([a-zàèéìòù\s]+)/i);
          if (streetMatch) {
            const streetName = streetMatch[2].trim().toLowerCase();
            // Only match if street name is at least 4 chars (avoid false positives)
            if (streetName.length >= 4) {
              matchedImmobile = immobili.find(imm => {
                const immIndirizzo = (imm.indirizzo || '').toLowerCase();
                const immTitolo = (imm.titolo || '').toLowerCase();
                // Require exact street name match (not partial)
                return immIndirizzo.includes(streetName) || immTitolo.includes(streetName);
              });
            }
          }
          
          // Also try matching by idPortale if present in propertyRef
          if (!matchedImmobile && conv.propertyRef) {
            const refClean = conv.propertyRef.trim();
            if (refClean.length >= 3) {
              matchedImmobile = immobili.find(imm => 
                imm.idPortale?.toLowerCase() === refClean.toLowerCase() ||
                imm.riferimentoAnnuncio?.toLowerCase() === refClean.toLowerCase()
              );
            }
          }

          if (matchedCliente) {
            matched++;
            
            // Check if we already have this message
            const existingComms = await storage.getComunicazioni(matchedCliente.id);
            const isDuplicate = existingComms.some(c => 
              c.testo?.includes(conv.lastMessage?.slice(0, 30) || 'xxx')
            );
            
            if (!isDuplicate && conv.lastMessage) {
              await storage.createComunicazione({
                clienteId: matchedCliente.id,
                immobileId: matchedImmobile?.id || undefined,
                tipo: 'messaggio',
                testo: `[Idealista] ${conv.lastMessage}${conv.date ? ` (${conv.date})` : ''}`,
                canale: 'idealista',
                creatoDA: 'cliente'
              });
              imported++;
              if (matchedImmobile) {
                console.log(`[Idealista Extension] Linked to immobile: ${matchedImmobile.titolo || matchedImmobile.indirizzo}`);
              }
            }
          } else {
            // Create new client if we have enough info
            if (conv.contactName && conv.contactName.length > 2) {
              const nameParts = conv.contactName.split(/\s+/);
              const nome = nameParts[0] || 'Contatto';
              const cognome = nameParts.slice(1).join(' ') || 'Idealista';
              
              const newCliente = await storage.createCliente({
                nome,
                cognome,
                telefono: conv.contactPhone || undefined,
                email: conv.contactEmail || undefined,
                tipoCliente: 'lead',
                note: `Importato da conversazione Idealista. Ref: ${conv.propertyRef || '-'}`
              });
              
              if (conv.lastMessage) {
                await storage.createComunicazione({
                  clienteId: newCliente.id,
                  immobileId: matchedImmobile?.id || undefined,
                  tipo: 'messaggio',
                  testo: `[Idealista] ${conv.lastMessage}${conv.date ? ` (${conv.date})` : ''}`,
                  canale: 'idealista',
                  creatoDA: 'cliente'
                });
                if (matchedImmobile) {
                  console.log(`[Idealista Extension] Linked new client to immobile: ${matchedImmobile.titolo || matchedImmobile.indirizzo}`);
                }
              }
              
              imported++;
              matched++;
            }
          }
        } catch (convError: any) {
          errors.push(`${conv.contactName}: ${convError.message}`);
        }
      }

      // Create notification
      if (imported > 0) {
        await storage.createNotifica({
          tipo: 'sistema',
          titolo: 'Conversazioni Idealista importate',
          messaggio: `Importate ${imported} conversazioni da ${matched} contatti`,
          priorita: 2,
          letta: false
        });
      }

      res.json({
        success: true,
        imported,
        matched,
        total: conversations.length,
        errors
      });
    } catch (error: any) {
      console.error("Idealista extension import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Import conversations from Idealista (manual trigger)
  app.post("/api/idealista/import", async (req, res) => {
    try {
      if (!isIdealistaConfigured()) {
        return res.status(400).json({ 
          error: "Integrazione Idealista non configurata. Servono APIFY_API_TOKEN, IDEALISTA_EMAIL e IDEALISTA_PASSWORD" 
        });
      }

      console.log("[API] Starting Idealista conversations import...");
      const result = await importIdealistaConversations();
      
      res.json({
        success: result.success,
        message: result.success 
          ? `Importate ${result.messagesImported} messaggi da ${result.clientsMatched} conversazioni`
          : "Importazione fallita",
        details: result
      });
    } catch (error: any) {
      console.error("Idealista import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== ANALYTICS OUTREACH (Cavour-Meta data) ====================
  // GET /api/analytics/outreach -> aggregati per canale x scenario x variant, top obiezioni
  app.get("/api/analytics/outreach", async (req, res) => {
    try {
      const daysParam = parseInt((req.query.days as string) || "60", 10);
      const days = Math.max(1, Math.min(365, daysParam || 60));

      // 1. Conteggi base per canale (tipo)
      const perCanale = await pool.query(`
        SELECT
          COALESCE(tipo, 'unknown') AS canale,
          COUNT(*) FILTER (WHERE stato = 'inviato' OR stato = 'risposto') AS inviati,
          COUNT(*) FILTER (WHERE stato = 'risposto') AS risposti,
          COUNT(*) FILTER (WHERE esito_classificato = 'positivo') AS positivi,
          COUNT(*) FILTER (WHERE esito_classificato = 'negativo') AS negativi,
          COUNT(*) FILTER (WHERE esito_classificato = 'nulla') AS nulli
        FROM casafari_outreach
        WHERE COALESCE(inviato_at, created_at) > NOW() - ($1 || ' days')::interval
        GROUP BY canale
        ORDER BY inviati DESC
      `, [String(days)]);

      // 2. Per scenario
      const perScenario = await pool.query(`
        SELECT
          COALESCE(scenario::text, 'unknown') AS scenario,
          COUNT(*) FILTER (WHERE stato IN ('inviato','risposto')) AS inviati,
          COUNT(*) FILTER (WHERE stato = 'risposto') AS risposti,
          COUNT(*) FILTER (WHERE esito_classificato = 'positivo') AS positivi
        FROM casafari_outreach
        WHERE COALESCE(inviato_at, created_at) > NOW() - ($1 || ' days')::interval
        GROUP BY scenario
        ORDER BY inviati DESC
      `, [String(days)]);

      // 3. Per variant_label (template)
      const perVariant = await pool.query(`
        SELECT
          COALESCE(variant_label, 'unknown') AS variant,
          COUNT(*) FILTER (WHERE stato IN ('inviato','risposto')) AS inviati,
          COUNT(*) FILTER (WHERE stato = 'risposto') AS risposti,
          COUNT(*) FILTER (WHERE esito_classificato = 'positivo') AS positivi
        FROM casafari_outreach
        WHERE COALESCE(inviato_at, created_at) > NOW() - ($1 || ' days')::interval
        GROUP BY variant
        ORDER BY inviati DESC
      `, [String(days)]);

      // 4. Top obiezioni (tema_risposta) con esempi
      const topObiezioni = await pool.query(`
        SELECT
          tema_risposta AS tema,
          COUNT(*) AS n,
          COUNT(*) FILTER (WHERE esito_classificato = 'positivo') AS positivi,
          COUNT(*) FILTER (WHERE esito_classificato = 'negativo') AS negativi,
          (
            SELECT array_agg(testo_obiezione)
            FROM (
              SELECT DISTINCT testo_obiezione FROM casafari_outreach
              WHERE tema_risposta = co.tema_risposta
                AND testo_obiezione IS NOT NULL AND testo_obiezione != ''
              LIMIT 3
            ) sub
          ) AS esempi
        FROM casafari_outreach co
        WHERE COALESCE(risposto_at, inviato_at) > NOW() - ($1 || ' days')::interval
          AND tema_risposta IS NOT NULL
        GROUP BY tema_risposta
        ORDER BY n DESC
        LIMIT 10
      `, [String(days)]);

      // 5. Totali generali
      const totali = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE stato IN ('inviato','risposto')) AS inviati,
          COUNT(*) FILTER (WHERE stato = 'risposto') AS risposti,
          COUNT(*) FILTER (WHERE esito_classificato = 'positivo') AS positivi,
          COUNT(*) FILTER (WHERE stato = 'fallito') AS falliti,
          COUNT(*) FILTER (WHERE stato = 'saltato_duplicato') AS saltati_dup
        FROM casafari_outreach
        WHERE COALESCE(inviato_at, created_at) > NOW() - ($1 || ' days')::interval
      `, [String(days)]);

      // 6. Mandati firmati nel periodo (da casafari_target_immobili)
      const mandati = await pool.query(`
        SELECT COUNT(*) AS n
        FROM casafari_target_immobili
        WHERE mandato_status = 'firmato'
          AND mandato_status_updated_at > NOW() - ($1 || ' days')::interval
      `, [String(days)]);

      res.json({
        periodo_giorni: days,
        totali: totali.rows[0] || {},
        mandati_firmati: parseInt(mandati.rows[0]?.n || "0"),
        per_canale: perCanale.rows,
        per_scenario: perScenario.rows,
        per_variant: perVariant.rows,
        top_obiezioni: topObiezioni.rows,
      });
    } catch (error: any) {
      console.error("Analytics outreach error:", error);
      res.status(500).json({ error: "Errore lettura analytics", detail: error.message });
    }
  });

  // ==================== PIPELINE CASAFARI PRIVATI (Kanban) ====================
  // Funnel A: scouting target Casafari -> mandato firmato.
  // Sorgente dati: casafari_target_immobili (mandato_status) + casafari_outreach (ultimo stato).
  // Endpoint:
  //   GET   /api/pipeline/casafari-privati                  -> {colonne, metrics}
  //   PATCH /api/pipeline/casafari-privati/:id/sposta       -> {nuova_colonna}
  //   POST  /api/pipeline/casafari-privati/:id/marca-perso  -> {motivo?}

  app.get("/api/pipeline/casafari-privati", async (_req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          t.id::text AS id, 'casafari' AS source,
          t.indirizzo, t.civico, t.zona, t.mq, t.locali, t.prezzo_corrente,
          t.scenario, t.url_casafari,
          t.mandato_status, t.mandato_status_updated_at,
          t.contatto_proprietario_telefono, t.contatto_proprietario_email,
          t.created_at, t.updated_at,
          (
            SELECT row_to_json(x) FROM (
              SELECT o.id::text AS id, o.stato, o.tipo, o.testo_proposto,
                     o.inviato_at, o.risposto_at, o.created_at,
                     o.destinatario_nome, o.destinatario_telefono, o.destinatario_email,
                     o.risposta_destinatario
              FROM casafari_outreach o
              WHERE o.target_immobile_id = t.id
              ORDER BY o.created_at DESC
              LIMIT 1
            ) x
          ) AS ultimo_outreach
        FROM casafari_target_immobili t
        ORDER BY COALESCE(t.mandato_status_updated_at, t.updated_at, t.created_at) DESC NULLS LAST
        LIMIT 500
      `);

      // UNION: immobili_esterni "contattati" che NON hanno gia outreach corrispondente
      const externalRes = await pool.query(`
        SELECT
          ie.id::text AS id, 'immobili_esterni' AS source,
          COALESCE(ie.indirizzo, ie.titolo) AS indirizzo,
          NULL::text AS civico,
          ie.zona, ie.mq, ie.camere AS locali, ie.prezzo AS prezzo_corrente,
          NULL::int AS scenario, ie.url_annuncio AS url_casafari,
          ie.stato_contatto AS mandato_status,
          ie.data_contatto AS mandato_status_updated_at,
          ie.contatto_telefono AS contatto_proprietario_telefono,
          ie.contatto_email AS contatto_proprietario_email,
          ie.created_at, ie.updated_at,
          (
            SELECT row_to_json(x) FROM (
              SELECT o.id::text AS id, o.stato, o.tipo, o.testo_proposto,
                     o.inviato_at, o.risposto_at, o.created_at,
                     o.destinatario_nome, o.destinatario_telefono, o.destinatario_email,
                     o.risposta_destinatario
              FROM casafari_outreach o
              WHERE o.immobile_esterno_id = ie.id
              ORDER BY o.created_at DESC LIMIT 1
            ) x
          ) AS ultimo_outreach
        FROM immobili_esterni ie
        WHERE ie.attivo = true
          AND ie.stato_contatto IN ('contattato','inviato','risposto','interessato','in_negoziazione')
          AND NOT EXISTS (
            SELECT 1 FROM casafari_outreach co WHERE co.immobile_esterno_id = ie.id
          )
        ORDER BY ie.data_contatto DESC NULLS LAST
        LIMIT 500
      `);
      const allRows = [...result.rows, ...externalRes.rows];

      const colonne: Record<string, any[]> = {
        target: [], bozza: [], inviato: [], risposto: [],
        appuntamento: [], negoziazione: [], mandato: [], perso: [],
      };

      const classificaColonna = (t: any, ultOut: any): string => {
        if (t.mandato_status === 'firmato') return 'mandato';
        if (t.mandato_status === 'perso')   return 'perso';
        if (t.mandato_status === 'negoziazione' || t.mandato_status === 'in_negoziazione') return 'negoziazione';
        if (t.mandato_status === 'appuntamento') return 'appuntamento';
        if (t.source === 'immobili_esterni') {
          if (t.mandato_status === 'risposto' || t.mandato_status === 'interessato') return 'risposto';
          if (t.mandato_status === 'contattato' || t.mandato_status === 'inviato') return 'inviato';
          if (t.mandato_status === 'nuovo' || !t.mandato_status) return 'target';
        }
        if (!ultOut || ultOut.stato === 'scartato') return 'target';
        if (ultOut.stato === 'proposto') return 'bozza';
        if (['approvato','attesa_invio','inviato'].includes(ultOut.stato)) return 'inviato';
        if (ultOut.stato === 'risposto') return 'risposto';
        return 'target';
      };

      const now = Date.now();
      for (const t of allRows) {
        const ultOut = t.ultimo_outreach;
        const colonna = classificaColonna(t, ultOut);
        const ref = t.mandato_status_updated_at || ultOut?.risposto_at || ultOut?.inviato_at || ultOut?.created_at || t.created_at;
        let gg = 0;
        try { gg = Math.floor((now - new Date(ref).getTime()) / 86400000); } catch {}
        const stallo = gg >= 14 ? 'rosso' : gg >= 7 ? 'giallo' : 'verde';

        colonne[colonna].push({
          id: t.id,
          source: t.source || 'casafari',
          indirizzo: t.indirizzo,
          civico: t.civico,
          zona: t.zona,
          mq: t.mq,
          locali: t.locali,
          prezzo: t.prezzo_corrente,
          scenario: t.scenario,
          url_casafari: t.url_casafari,
          mandato_status: t.mandato_status,
          destinatario_nome: ultOut?.destinatario_nome || null,
          destinatario_telefono: ultOut?.destinatario_telefono || t.contatto_proprietario_telefono || null,
          destinatario_email: ultOut?.destinatario_email || t.contatto_proprietario_email || null,
          outreach_id: ultOut?.id || null,
          outreach_stato: ultOut?.stato || null,
          outreach_testo: ultOut?.testo_proposto || null,
          outreach_inviato_at: ultOut?.inviato_at || null,
          outreach_risposto_at: ultOut?.risposto_at || null,
          risposta_testo: ultOut?.risposta_destinatario || null,
          gg_in_colonna: gg,
          stallo,
        });
      }

      // Metriche header (mese corrente)
      const inizioMese = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const m = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE mandato_status = 'firmato' AND mandato_status_updated_at >= $1) AS mandati_mese,
          COUNT(*) FILTER (WHERE mandato_status = 'negoziazione') AS in_negoziazione,
          COUNT(*) FILTER (WHERE mandato_status = 'appuntamento') AS appuntamenti_aperti
        FROM casafari_target_immobili
      `, [inizioMese]);
      const oQuery = await pool.query(`
        SELECT COUNT(*) AS risposte_da_gestire
        FROM casafari_outreach
        WHERE stato = 'risposto'
      `);

      res.json({
        colonne,
        metrics: {
          mandati_mese: parseInt(m.rows[0].mandati_mese) || 0,
          in_negoziazione: parseInt(m.rows[0].in_negoziazione) || 0,
          appuntamenti_aperti: parseInt(m.rows[0].appuntamenti_aperti) || 0,
          risposte_da_gestire: parseInt(oQuery.rows[0].risposte_da_gestire) || 0,
        },
      });
    } catch (error: any) {
      console.error("Pipeline casafari-privati GET error:", error);
      res.status(500).json({ error: "Errore lettura pipeline", detail: error.message });
    }
  });

  app.patch("/api/pipeline/casafari-privati/:id/sposta", async (req, res) => {
    try {
      const { id } = req.params;
      const { nuova_colonna } = req.body || {};
      const consentite = ['target', 'appuntamento', 'negoziazione', 'mandato', 'perso'];
      if (!nuova_colonna || !consentite.includes(nuova_colonna)) {
        return res.status(400).json({ error: `nuova_colonna obbligatoria (${consentite.join(', ')})` });
      }
      const mandatoStatus = nuova_colonna === 'target' ? null
        : nuova_colonna === 'mandato' ? 'firmato'
        : nuova_colonna;
      const r = await pool.query(
        `UPDATE casafari_target_immobili
         SET mandato_status = $1, mandato_status_updated_at = now(), updated_at = now()
         WHERE id::text = $2
         RETURNING id, mandato_status`,
        [mandatoStatus, id],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: "Target non trovato" });
      res.json({ ok: true, id: r.rows[0].id, mandato_status: r.rows[0].mandato_status, colonna: nuova_colonna });
    } catch (error: any) {
      console.error("Pipeline sposta error:", error);
      res.status(500).json({ error: "Errore spostamento", detail: error.message });
    }
  });

  app.post("/api/pipeline/casafari-privati/:id/marca-perso", async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body || {};
      const oggi = new Date().toISOString().slice(0, 10);
      const noteAdd = ` | [${oggi}: perso${motivo ? ' - ' + String(motivo).slice(0, 200) : ''}]`;
      const r = await pool.query(
        `UPDATE casafari_target_immobili
         SET mandato_status = 'perso', mandato_status_updated_at = now(),
             mandato_note = COALESCE(mandato_note, '') || $1,
             updated_at = now()
         WHERE id::text = $2
         RETURNING id`,
        [noteAdd, id],
      );
      if (r.rowCount === 0) return res.status(404).json({ error: "Target non trovato" });
      res.json({ ok: true, id: r.rows[0].id });
    } catch (error: any) {
      console.error("Pipeline marca-perso error:", error);
      res.status(500).json({ error: "Errore marca-perso", detail: error.message });
    }
  });

  // ==================== PROXY a Cavour-Meta /api/operativo/* (#36-39) ====================
  // Forwarda chiamate dal client React al backend Python su Railway,
  // tenendo X-Admin-Token solo server-side per non esporlo nel browser.
  const cavourBase = (process.env.CAVOUR_META_BASE_URL || "https://go.cavourimmobiliare.online").replace(/\/$/, "");
  const cavourToken = process.env.CAVOUR_META_ADMIN_TOKEN || "";

  async function proxyCavour(path: string, res: any) {
    if (!cavourToken) {
      return res.status(500).json({ error: "CAVOUR_META_ADMIN_TOKEN non configurato su Replit" });
    }
    try {
      const r = await fetch(`${cavourBase}${path}`, {
        method: "GET",
        headers: { "X-Admin-Token": cavourToken, "Accept": "application/json" },
      });
      const txt = await r.text();
      res.status(r.status);
      try {
        res.json(JSON.parse(txt));
      } catch {
        res.send(txt);
      }
    } catch (err: any) {
      console.error("[proxyCavour] fail", path, err?.message);
      res.status(502).json({ error: "Cavour-Meta non raggiungibile", detail: err?.message });
    }
  }

  app.get("/api/cavour/dashboard", async (_req, res) => {
    await proxyCavour("/api/operativo/dashboard", res);
  });
  app.get("/api/cavour/cliente/:id", async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "id non valido" });
    await proxyCavour(`/api/operativo/cliente/${id}`, res);
  });
  app.get("/api/cavour/liste", async (req, res) => {
    const tab = (req.query.tab as string) || "clienti";
    const limit = parseInt((req.query.limit as string) || "100", 10);
    await proxyCavour(`/api/operativo/liste?tab=${encodeURIComponent(tab)}&limit=${limit}`, res);
  });
}
