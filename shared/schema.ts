import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, decimal, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Conversations & Messages for AI Chat (from integration)
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// CLIENTI - Clients table
export const clienti = pgTable("clienti", {
  id: serial("id").primaryKey(),
  appellativo: text("appellativo"),
  nome: text("nome"),
  cognome: text("cognome"),
  telefono: text("telefono"),
  email: text("email"),
  compleanno: text("compleanno"),
  religione: text("religione"),
  linguaPreferita: text("lingua_preferita"),
  note: text("note"),
  ruolo: text("ruolo"),
  fonteAcquisizione: text("fonte_acquisizione"),
  statoTrattativa: text("stato_trattativa"),
  rating: integer("rating").default(3),
  clienteAmico: boolean("cliente_amico").default(false),
  attivo: boolean("attivo").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdByUserId: integer("created_by_user_id"),
  createdByApiKeyId: integer("created_by_api_key_id"),
});

// RICHIESTE - Buyer requests
export const richieste = pgTable("richieste", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clienti.id, { onDelete: "cascade" }),
  descrizioneLibera: text("descrizione_libera"), // free text AI will parse
  budgetMassimo: decimal("budget_massimo", { precision: 12, scale: 2 }),
  mqMinimi: integer("mq_minimi"),
  zona: text("zona"), // testo libero inserito dall'utente
  zonaNormalizzata: text("zona_normalizzata"), // lowercase, punteggiatura rimossa, separatori normalizzati
  poligonoGeografico: json("poligono_geografico"), // GeoJSON
  pianoTutti: boolean("piano_tutti").default(false),
  pianoTerra: boolean("piano_terra").default(false),
  pianoIntermedi: boolean("piano_intermedi").default(false),
  pianoUltimo: boolean("piano_ultimo").default(false),
  statoNuovo: boolean("stato_nuovo").default(false),
  statoRistrutturato: boolean("stato_ristrutturato").default(false),
  statoBuono: boolean("stato_buono").default(false),
  statoDaRistrutturare: boolean("stato_da_ristrutturare").default(false),
  balcone: boolean("balcone").default(false),
  terrazzo: boolean("terrazzo").default(false),
  ascensore: boolean("ascensore").default(false),
  box: boolean("box").default(false),
  caratteristicheObbligatorie: json("caratteristiche_obbligatorie").$type<string[]>().default([]),
  caratteristicheGradite: json("caratteristiche_gradite").$type<string[]>().default([]),
  camereMinime: integer("camere_minime"),
  bagniMinimi: integer("bagni_minimi"),
  priorita: integer("priorita").default(2), // 1=alta, 2=media, 3=bassa
  ratingRichiesta: integer("rating_richiesta").default(3), // 1-5
  linkRicerca: text("link_ricerca"), // Link personalizzato ricerca immobili
  attiva: boolean("attiva").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// IMMOBILI - Properties (unificato: mandato + acquisizione)
// Aggiornato 2026-05-21: schema allineato al DB Paolo reale (49 colonne).
// Aggiunte colonne DB-only: tipoContratto, riferimentoInterno, rating, categoria, canoneMensile, buonauscita, faq.
// Rimosse colonne ghost: idWeb, idPortale, esclusiva, multiagenzia, fonte, origine, contattoNome/Telefono/Email, urlAnnuncio, testoOriginale, riferimentoAnnuncio, dataPubblicazione, statoContatto, messaggioInviato, dataContatto, contattoMetodo, formUrl, ultimoTentativoForm, rispostaRicevuta.
export const immobili = pgTable("immobili", {
  id: serial("id").primaryKey(),
  proprietarioId: integer("proprietario_id").references(() => clienti.id, { onDelete: "set null" }),
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  riferimentoInterno: text("riferimento_interno"),
  tipoContratto: text("tipo_contratto"), // vendita | affitto | mandato | locazione_commerciale
  indirizzo: text("indirizzo"),
  zona: text("zona"),
  citta: text("citta"),
  latitudine: decimal("latitudine", { precision: 10, scale: 7 }),
  longitudine: decimal("longitudine", { precision: 10, scale: 7 }),
  mq: integer("mq"),
  piano: integer("piano"),
  pianiEdificio: integer("piani_edificio"),
  camere: integer("camere"),
  bagni: integer("bagni"),
  prezzo: decimal("prezzo", { precision: 12, scale: 2 }),
  ascensore: boolean("ascensore").default(false),
  balcone: boolean("balcone").default(false),
  terrazzo: boolean("terrazzo").default(false),
  box: boolean("box").default(false),
  cantina: boolean("cantina").default(false),
  giardino: boolean("giardino").default(false),
  arredato: boolean("arredato").default(false),
  statoNuovo: boolean("stato_nuovo").default(false),
  statoRistrutturato: boolean("stato_ristrutturato").default(false),
  statoBuono: boolean("stato_buono").default(false),
  statoDaRistrutturare: boolean("stato_da_ristrutturare").default(false),
  classeEnergetica: text("classe_energetica"),
  prestazioneEnergetica: text("prestazione_energetica"),
  speseCondominiali: decimal("spese_condominiali", { precision: 10, scale: 2 }),
  riscaldamento: text("riscaldamento"),
  esposizione: text("esposizione"),
  annoCostruzione: integer("anno_costruzione"),
  statoVendita: text("stato_vendita").default("disponibile"), // disponibile | in_trattativa | venduto | ritirato
  immagini: json("immagini").$type<string[]>().default([]),
  noteInterne: text("note_interne"),
  caratteristiche: json("caratteristiche").$type<Record<string, any>>().default({}),
  preferito: boolean("preferito").default(false),
  attivo: boolean("attivo").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  rating: integer("rating"),
  categoria: text("categoria"), // residenziale | commerciale | ufficio | box | terreno
  canoneMensile: decimal("canone_mensile", { precision: 10, scale: 2 }),
  buonauscita: decimal("buonauscita", { precision: 12, scale: 2 }),
  faq: jsonb("faq").$type<Record<string, any>>(),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdByApiKeyId: integer("created_by_api_key_id").references(() => apiKeys.id, { onDelete: "set null" }),
});

// WHATSAPP CONVERSATIONS - Conversazioni WhatsApp per numero
export const whatsappConversations = pgTable("whatsapp_conversations", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull().unique(),
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "set null" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "set null" }),
  nome: text("nome"),
  ultimoMessaggio: text("ultimo_messaggio"),
  ultimoMessaggioData: timestamp("ultimo_messaggio_data").default(sql`CURRENT_TIMESTAMP`),
  nonLetti: integer("non_letti").default(0),
  stato: text("stato").default("attivo"), // attivo, archiviato, bloccato
  botDisattivato: boolean("bot_disattivato").default(false), // true = gestione manuale, no risposte automatiche
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// WHATSAPP MESSAGES - Messaggi WhatsApp
export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => whatsappConversations.id, { onDelete: "cascade" }),
  whatsappMessageId: text("whatsapp_message_id"),
  direction: text("direction").notNull(), // inbound, outbound
  messageType: text("message_type").default("text"), // text, image, document, audio, video
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  status: text("status").default("sent"), // pending, sent, delivered, read, failed
  statusTimestamp: timestamp("status_timestamp"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// COMUNICAZIONI - Communications
export const comunicazioni = pgTable("comunicazioni", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "cascade" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "set null" }),
  immobileEsternoId: integer("immobile_esterno_id").references(() => immobiliEsterni.id, { onDelete: "set null" }),
  whatsappMessageId: integer("whatsapp_message_id").references(() => whatsappMessages.id, { onDelete: "set null" }),
  tipo: text("tipo").notNull().default("nota"), // proposta, richiesta, risposta, followup, auguri, nota
  testo: text("testo").notNull(),
  canale: text("canale").default("sistema"), // whatsapp, email, telefono, sistema
  creatoDA: text("creato_da").default("sistema"), // sistema, agente, cliente
  esito: text("esito"), // interessato, da_richiamare, non_interessato, in_attesa
  dataOra: timestamp("data_ora").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// APPUNTAMENTI - Appointments
export const appuntamenti = pgTable("appuntamenti", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clienti.id, { onDelete: "cascade" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "set null" }),
  dataOra: timestamp("data_ora").notNull(),
  luogo: text("luogo"),
  note: text("note"),
  esito: text("esito"), // interessato, da_richiamare, non_interessato
  confermato: boolean("confermato").default(false),
  completato: boolean("completato").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ATTIVITA IMMOBILE - Property tasks/todos
export const attivitaImmobile = pgTable("attivita_immobile", {
  id: serial("id").primaryKey(),
  immobileId: integer("immobile_id").notNull().references(() => immobili.id, { onDelete: "cascade" }),
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  scadenza: timestamp("scadenza"),
  stato: text("stato").default("da_fare"), // da_fare, in_corso, fatto
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ATTIVITA CLIENTE - Client tasks/todos
export const attivitaCliente = pgTable("attivita_cliente", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clienti.id, { onDelete: "cascade" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "set null" }),
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  fonte: text("fonte"), // immobiliare.it, idealista, email, telefono
  scadenza: timestamp("scadenza"),
  stato: text("stato").default("da_fare"), // da_fare, in_corso, fatto
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ATTIVITA IMMOBILE ESTERNO - External property tasks (acquisizione)
export const attivitaImmobileEsterno = pgTable("attivita_immobile_esterno", {
  id: serial("id").primaryKey(),
  immobileEsternoId: integer("immobile_esterno_id").notNull().references(() => immobiliEsterni.id, { onDelete: "cascade" }),
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  scadenza: timestamp("scadenza"),
  stato: text("stato").default("da_fare"), // da_fare, in_corso, fatto
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// DOCUMENTI IMMOBILE - Property documents
export const documentiImmobile = pgTable("documenti_immobile", {
  id: serial("id").primaryKey(),
  immobileId: integer("immobile_id").notNull().references(() => immobili.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo"), // ape, planimetria, visura, contratto, foto, altro
  url: text("url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// PORTALI IMMOBILE - Marketing portals
export const portaliImmobile = pgTable("portali_immobile", {
  id: serial("id").primaryKey(),
  immobileId: integer("immobile_id").notNull().references(() => immobili.id, { onDelete: "cascade" }),
  nomePortale: text("nome_portale").notNull(), // immobiliare.it, idealista, casa.it, sito_agenzia
  urlAnnuncio: text("url_annuncio"),
  stato: text("stato").default("online"), // online, offline
  dataPubblicazione: timestamp("data_pubblicazione"),
  note: text("note"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// STORICO PREZZO - Price history
export const storicoPrezzo = pgTable("storico_prezzo", {
  id: serial("id").primaryKey(),
  immobileId: integer("immobile_id").notNull().references(() => immobili.id, { onDelete: "cascade" }),
  prezzo: decimal("prezzo", { precision: 12, scale: 2 }).notNull(),
  dataModifica: timestamp("data_modifica").default(sql`CURRENT_TIMESTAMP`).notNull(),
  note: text("note"),
});

// CONTATTI PORTALE - Log tentativi contatto via form portali
export const contattiPortale = pgTable("contatti_portale", {
  id: serial("id").primaryKey(),
  immobileId: integer("immobile_id").notNull().references(() => immobili.id, { onDelete: "cascade" }),
  portale: text("portale").notNull(), // clickcase.it, immobiliare.it, ecc.
  formUrl: text("form_url"),
  messaggioInviato: text("messaggio_inviato"),
  dataInvio: timestamp("data_invio").default(sql`CURRENT_TIMESTAMP`).notNull(),
  stato: text("stato").default("inviato"), // inviato, risposta_ricevuta, nessuna_risposta
  emailRisposta: text("email_risposta"), // ID email di risposta se ricevuta
  dataRisposta: timestamp("data_risposta"),
  note: text("note"),
});

// IMMOBILI ESTERNI - External properties (scraped/manual from portals)
export const immobiliEsterni = pgTable("immobili_esterni", {
  id: serial("id").primaryKey(),
  idWeb: text("id_web").unique(), // ID univoco per identificazione via email/web
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "set null" }),
  richiestaId: integer("richiesta_id").references(() => richieste.id, { onDelete: "set null" }), // Immobile suggerito per questa richiesta specifica
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  indirizzo: text("indirizzo"),
  zona: text("zona"),
  citta: text("citta"),
  mq: integer("mq"),
  prezzo: decimal("prezzo", { precision: 12, scale: 2 }),
  piano: integer("piano"),
  pianiEdificio: integer("piani_edificio"),
  camere: integer("camere"),
  bagni: integer("bagni"),
  // Caratteristiche booleane
  ascensore: boolean("ascensore").default(false),
  balcone: boolean("balcone").default(false),
  terrazzo: boolean("terrazzo").default(false),
  box: boolean("box").default(false),
  cantina: boolean("cantina").default(false),
  giardino: boolean("giardino").default(false),
  arredato: boolean("arredato").default(false),
  // Stato immobile
  statoNuovo: boolean("stato_nuovo").default(false),
  statoRistrutturato: boolean("stato_ristrutturato").default(false),
  statoBuono: boolean("stato_buono").default(false),
  statoDaRistrutturare: boolean("stato_da_ristrutturare").default(false),
  // Info aggiuntive
  classeEnergetica: text("classe_energetica"),
  prestazioneEnergetica: text("prestazione_energetica"),
  speseCondominiali: decimal("spese_condominiali", { precision: 10, scale: 2 }),
  riscaldamento: text("riscaldamento"),
  esposizione: text("esposizione"),
  annoCostruzione: integer("anno_costruzione"),
  riferimentoAnnuncio: text("riferimento_annuncio"),
  // Contatti
  contattoNome: text("contatto_nome"),
  contattoTelefono: text("contatto_telefono"),
  contattoEmail: text("contatto_email"),
  urlAnnuncio: text("url_annuncio"),
  fonte: text("fonte").default("manuale"), // immobiliare.it, idealista, subito, manuale
  testoOriginale: text("testo_originale"), // original pasted text for reference
  caratteristiche: json("caratteristiche").$type<Record<string, any>>().default({}),
  immagini: json("immagini").$type<string[]>().default([]),
  dataPubblicazione: text("data_pubblicazione"),
  preferito: boolean("preferito").default(false),
  statoContatto: text("stato_contatto").default("nuovo"), // nuovo, contattato, interessato, scartato
  messaggioInviato: text("messaggio_inviato"),
  dataContatto: timestamp("data_contatto"),
  note: text("note"),
  // Contatto via form (quando non c'è telefono)
  contattoMetodo: text("contatto_metodo").default("telefono"), // telefono, email, form, whatsapp
  formUrl: text("form_url"), // URL del form di contatto sul portale
  ultimoTentativoForm: timestamp("ultimo_tentativo_form"),
  rispostaRicevuta: boolean("risposta_ricevuta").default(false),
  portale: text("portale"), // clickcase.it, immobiliare.it, ecc.
  attivo: boolean("attivo").default(true),
  // Multi-agenzia
  multiAgenzia: boolean("multi_agenzia").default(false), // Automatico: true se ≥2 annunci con agenzie diverse
  multiAgenziaConfermata: boolean("multi_agenzia_confermata").default(false), // Conferma manuale
  clienteTrigger: integer("cliente_trigger").references(() => clienti.id, { onDelete: "set null" }), // Cliente che ha generato la ricerca
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ANNUNCI IMMOBILE - Annunci collegati a immobili esterni (multi-agenzia)
export const annunciImmobile = pgTable("annunci_immobile", {
  id: serial("id").primaryKey(),
  immobileEsternoId: integer("immobile_esterno_id").notNull().references(() => immobiliEsterni.id, { onDelete: "cascade" }),
  nomeAgenzia: text("nome_agenzia"), // Nome agenzia o "Privato"
  portale: text("portale").notNull(), // immobiliare.it, idealista, subito, altro
  urlAnnuncio: text("url_annuncio"),
  codiceAnnuncio: text("codice_annuncio"), // Riferimento annuncio sul portale
  prezzo: decimal("prezzo", { precision: 12, scale: 2 }), // Prezzo su questo annuncio (può variare)
  dataRilevazione: timestamp("data_rilevazione").default(sql`CURRENT_TIMESTAMP`).notNull(),
  note: text("note"),
  attivo: boolean("attivo").default(true), // Se l'annuncio è ancora online
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// MATCHING - Match results between requests and properties
export const matching = pgTable("matching", {
  id: serial("id").primaryKey(),
  richiestaId: integer("richiesta_id").notNull().references(() => richieste.id, { onDelete: "cascade" }),
  immobileId: integer("immobile_id").notNull().references(() => immobili.id, { onDelete: "cascade" }),
  punteggio: integer("punteggio").notNull().default(0), // 0-100
  proposto: boolean("proposto").default(false),
  accettato: boolean("accettato"),
  note: text("note"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// WHATSAPP CAMPAIGNS - Campagne di messaggistica per acquisizione
export const whatsappCampaigns = pgTable("whatsapp_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  template: text("template").notNull(),
  instructions: text("instructions"),
  objectionHandling: json("objection_handling").$type<Record<string, any>>(),
  followUpTemplate: text("followup_template"),
  followUpDelayDays: integer("followup_delay_days").default(3),
  useAiPersonalization: boolean("use_ai_personalization").default(false),
  status: text("status").default("draft").notNull(), // draft, active, paused, completed
  totalTargets: integer("total_targets").default(0),
  sentCount: integer("sent_count").default(0),
  respondedCount: integer("responded_count").default(0),
  convertedCount: integer("converted_count").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// CAMPAIGN MESSAGES - Messaggi individuali delle campagne
export const campaignMessages = pgTable("campaign_messages", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => whatsappCampaigns.id, { onDelete: "cascade" }),
  immobileEsternoId: integer("immobile_esterno_id").references(() => immobiliEsterni.id, { onDelete: "set null" }),
  phoneNumber: text("phone_number").notNull(),
  ownerName: text("owner_name"),
  messageContent: text("message_content").notNull(),
  status: text("status").default("pending").notNull(), // pending, sent, delivered, read, responded, failed
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  respondedAt: timestamp("responded_at"),
  response: text("response"),
  followUpSent: boolean("followup_sent").default(false),
  followUpSentAt: timestamp("followup_sent_at"),
  followUpResponse: text("followup_response"),
  conversationActive: boolean("conversation_active").default(false),
  lastBotMessage: text("last_bot_message"),
  lastBotMessageAt: timestamp("last_bot_message_at"),
  errorMessage: text("error_message"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// BOT CONVERSATION LOGS - Log delle conversazioni bot
export const botConversationLogs = pgTable("bot_conversation_logs", {
  id: serial("id").primaryKey(),
  campaignMessageId: integer("campaign_message_id").notNull().references(() => campaignMessages.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull(),
  userMessage: text("user_message").notNull(),
  botResponse: text("bot_response").notNull(),
  intent: text("intent"), // schedule_visit, ask_price, not_interested, etc.
  confidence: integer("confidence"), // 0-100
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// SCHEDULED BOT MESSAGES - Messaggi bot programmati (per delay umano)
export const scheduledBotMessages = pgTable("scheduled_bot_messages", {
  id: serial("id").primaryKey(),
  campaignMessageId: integer("campaign_message_id").notNull().references(() => campaignMessages.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").notNull().references(() => whatsappConversations.id, { onDelete: "cascade" }),
  phoneNumber: text("phone_number").notNull(),
  userMessage: text("user_message").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: text("status").default("pending").notNull(), // pending, processing, sent, failed, pending_approval, rejected
  botResponse: text("bot_response"),
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// OPPORTUNITA MERCATO - External market opportunities (multi-agency properties)
export const opportunitaMercato = pgTable("opportunita_mercato", {
  id: serial("id").primaryKey(),
  idWeb: text("id_web").unique(), // ID univoco
  richiestaOrigineId: integer("richiesta_origine_id").references(() => richieste.id, { onDelete: "set null" }), // Richiesta che ha originato l'interesse
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  indirizzo: text("indirizzo"),
  zona: text("zona"),
  citta: text("citta"),
  mq: integer("mq"),
  prezzo: decimal("prezzo", { precision: 12, scale: 2 }),
  piano: integer("piano"),
  pianiEdificio: integer("piani_edificio"),
  camere: integer("camere"),
  bagni: integer("bagni"),
  // Caratteristiche booleane
  ascensore: boolean("ascensore").default(false),
  balcone: boolean("balcone").default(false),
  terrazzo: boolean("terrazzo").default(false),
  box: boolean("box").default(false),
  cantina: boolean("cantina").default(false),
  giardino: boolean("giardino").default(false),
  arredato: boolean("arredato").default(false),
  // Stato immobile
  statoNuovo: boolean("stato_nuovo").default(false),
  statoRistrutturato: boolean("stato_ristrutturato").default(false),
  statoBuono: boolean("stato_buono").default(false),
  statoDaRistrutturare: boolean("stato_da_ristrutturare").default(false),
  // Info aggiuntive
  classeEnergetica: text("classe_energetica"),
  prestazioneEnergetica: text("prestazione_energetica"),
  speseCondominiali: decimal("spese_condominiali", { precision: 10, scale: 2 }),
  riscaldamento: text("riscaldamento"),
  esposizione: text("esposizione"),
  annoCostruzione: integer("anno_costruzione"),
  riferimentoAnnuncio: text("riferimento_annuncio"),
  // URL e fonte
  urlAnnuncio: text("url_annuncio"),
  testoOriginale: text("testo_originale"),
  caratteristiche: json("caratteristiche").$type<Record<string, any>>().default({}),
  immagini: json("immagini").$type<string[]>().default([]),
  dataPubblicazione: text("data_pubblicazione"),
  // Stati workflow: in_valutazione, iter_proprietario, acquisito, scartato
  stato: text("stato").default("in_valutazione").notNull(),
  motivoScarto: text("motivo_scarto"), // prezzo_alto, zona_non_interessante, gia_venduto, altro
  noteScarto: text("note_scarto"),
  // Matching cache
  matchCount: integer("match_count").default(0),
  matchAlti: integer("match_alti").default(0), // score >= 70
  matchMedi: integer("match_medi").default(0), // score >= 50 < 70
  // Transizione a portafoglio
  immobilePortafoglioId: integer("immobile_portafoglio_id").references(() => immobili.id, { onDelete: "set null" }), // Quando acquisito
  dataAcquisizione: timestamp("data_acquisizione"),
  note: text("note"),
  preferito: boolean("preferito").default(false),
  attivo: boolean("attivo").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// PUBBLICIZZATO DA - Agenzie che pubblicizzano l'opportunità
export const pubblicizzatoDa = pgTable("pubblicizzato_da", {
  id: serial("id").primaryKey(),
  opportunitaId: integer("opportunita_id").notNull().references(() => opportunitaMercato.id, { onDelete: "cascade" }),
  nomeAgenzia: text("nome_agenzia").notNull(), // Nome agenzia o "Privato"
  portale: text("portale"), // immobiliare.it, idealista, subito
  urlAnnuncio: text("url_annuncio"),
  codiceAnnuncio: text("codice_annuncio"),
  prezzo: decimal("prezzo", { precision: 12, scale: 2 }),
  telefono: text("telefono"),
  email: text("email"),
  dataRilevazione: timestamp("data_rilevazione").default(sql`CURRENT_TIMESTAMP`).notNull(),
  note: text("note"),
  attivo: boolean("attivo").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ATTIVITA OPPORTUNITA - Log operativo per iter proprietario
export const attivitaOpportunita = pgTable("attivita_opportunita", {
  id: serial("id").primaryKey(),
  opportunitaId: integer("opportunita_id").notNull().references(() => opportunitaMercato.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(), // contatto, nota, telefonata, email, sopralluogo, documento
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  esito: text("esito"), // positivo, negativo, in_attesa
  dataAttivita: timestamp("data_attivita").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// DOCUMENTI OPPORTUNITA - Documenti allegati all'opportunità
export const documentiOpportunita = pgTable("documenti_opportunita", {
  id: serial("id").primaryKey(),
  opportunitaId: integer("opportunita_id").notNull().references(() => opportunitaMercato.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo"), // planimetria, visura, certificato, foto, altro
  url: text("url"),
  contenuto: text("contenuto"), // Per note testuali
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// MATCHING OPPORTUNITA - Match tra opportunità e richieste clienti
export const matchingOpportunita = pgTable("matching_opportunita", {
  id: serial("id").primaryKey(),
  opportunitaId: integer("opportunita_id").notNull().references(() => opportunitaMercato.id, { onDelete: "cascade" }),
  richiestaId: integer("richiesta_id").notNull().references(() => richieste.id, { onDelete: "cascade" }),
  punteggio: integer("punteggio").notNull().default(0), // 0-100
  bozzaMessaggio: text("bozza_messaggio"), // Bozza generata per proposta cliente
  messaggioInviato: boolean("messaggio_inviato").default(false),
  dataInvio: timestamp("data_invio"),
  risposta: text("risposta"), // interessato, non_interessato, da_valutare
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// OAUTH TOKENS - Token OAuth per servizi esterni (Google Calendar, etc.)
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // google_calendar, gmail, etc.
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  scope: text("scope"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// CALENDAR EVENTS - Eventi calendario (sincronizzati con Google Calendar)
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  location: text("location"),
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "set null" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "set null" }),
  appointmentConfirmationId: integer("appointment_confirmation_id"),
  googleEventId: text("google_event_id"), // ID ritornato da Google
  dedupeKey: text("dedupe_key"), // Hash anti-duplicazione
  syncStatus: text("sync_status").default("pending"), // pending, synced, failed, needs_auth
  syncError: text("sync_error"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// APPOINTMENT CONFIRMATIONS - Conferme appuntamenti estratte da messaggi WhatsApp
export const appointmentConfirmations = pgTable("appointment_confirmations", {
  id: serial("id").primaryKey(),
  whatsappMessageId: integer("whatsapp_message_id").references(() => whatsappMessages.id, { onDelete: "set null" }),
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "set null" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "set null" }),
  clientName: text("client_name"),
  clientPhone: text("client_phone"),
  salutation: text("salutation"), // Dott., Sig., Sig.ra, etc.
  appointmentDate: timestamp("appointment_date").notNull(),
  address: text("address"),
  originalMessage: text("original_message"),
  status: text("status").default("pending"), // pending, confirmed, synced, cancelled
  calendarEventId: integer("calendar_event_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// NOTIFICHE - Persistent notifications/alerts
export const notifiche = pgTable("notifiche", {
  id: serial("id").primaryKey(),
  tipo: text("tipo").notNull(), // richiesta_visita, nuovo_cliente, follow_up, scadenza, sistema
  titolo: text("titolo").notNull(),
  messaggio: text("messaggio"),
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "cascade" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "cascade" }),
  emailId: text("email_id"), // Gmail message ID to prevent duplicates
  letta: boolean("letta").default(false),
  archiviata: boolean("archiviata").default(false),
  priorita: integer("priorita").default(2), // 1=alta, 2=media, 3=bassa
  scadenza: timestamp("scadenza"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// TASKS - Personal task/reminder management with calendar sync
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  stato: text("stato").notNull().default("da_fare"), // da_fare, in_corso, completato
  priorita: integer("priorita").default(2), // 1=alta, 2=media, 3=bassa
  scadenza: timestamp("scadenza"), // optional due date
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "set null" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "set null" }),
  comunicazioneId: integer("comunicazione_id").references(() => comunicazioni.id, { onDelete: "set null" }),
  whatsappMessageId: integer("whatsapp_message_id").references(() => whatsappMessages.id, { onDelete: "set null" }),
  calendarEventId: text("calendar_event_id"), // Google Calendar event ID for sync
  calendarSyncStatus: text("calendar_sync_status").default("not_synced"), // not_synced, synced, failed
  completatoAt: timestamp("completato_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Relations
export const clientiRelations = relations(clienti, ({ many }) => ({
  richieste: many(richieste),
  immobili: many(immobili),
  comunicazioni: many(comunicazioni),
  appuntamenti: many(appuntamenti),
}));

export const richiesteRelations = relations(richieste, ({ one, many }) => ({
  cliente: one(clienti, { fields: [richieste.clienteId], references: [clienti.id] }),
  matching: many(matching),
}));

export const immobiliRelations = relations(immobili, ({ one, many }) => ({
  proprietario: one(clienti, { fields: [immobili.proprietarioId], references: [clienti.id] }),
  comunicazioni: many(comunicazioni),
  appuntamenti: many(appuntamenti),
  matching: many(matching),
  attivita: many(attivitaImmobile),
  documenti: many(documentiImmobile),
  portali: many(portaliImmobile),
  storicoPrezzo: many(storicoPrezzo),
}));

export const attivitaImmobileRelations = relations(attivitaImmobile, ({ one }) => ({
  immobile: one(immobili, { fields: [attivitaImmobile.immobileId], references: [immobili.id] }),
}));

export const documentiImmobileRelations = relations(documentiImmobile, ({ one }) => ({
  immobile: one(immobili, { fields: [documentiImmobile.immobileId], references: [immobili.id] }),
}));

export const portaliImmobileRelations = relations(portaliImmobile, ({ one }) => ({
  immobile: one(immobili, { fields: [portaliImmobile.immobileId], references: [immobili.id] }),
}));

export const storicoPrezzoRelations = relations(storicoPrezzo, ({ one }) => ({
  immobile: one(immobili, { fields: [storicoPrezzo.immobileId], references: [immobili.id] }),
}));

export const comunicazioniRelations = relations(comunicazioni, ({ one }) => ({
  cliente: one(clienti, { fields: [comunicazioni.clienteId], references: [clienti.id] }),
  immobile: one(immobili, { fields: [comunicazioni.immobileId], references: [immobili.id] }),
  whatsappMessage: one(whatsappMessages, { fields: [comunicazioni.whatsappMessageId], references: [whatsappMessages.id] }),
}));

export const whatsappConversationsRelations = relations(whatsappConversations, ({ one, many }) => ({
  cliente: one(clienti, { fields: [whatsappConversations.clienteId], references: [clienti.id] }),
  immobile: one(immobili, { fields: [whatsappConversations.immobileId], references: [immobili.id] }),
  messages: many(whatsappMessages),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  conversation: one(whatsappConversations, { fields: [whatsappMessages.conversationId], references: [whatsappConversations.id] }),
}));

export const appuntamentiRelations = relations(appuntamenti, ({ one }) => ({
  cliente: one(clienti, { fields: [appuntamenti.clienteId], references: [clienti.id] }),
  immobile: one(immobili, { fields: [appuntamenti.immobileId], references: [immobili.id] }),
}));

export const matchingRelations = relations(matching, ({ one }) => ({
  richiesta: one(richieste, { fields: [matching.richiestaId], references: [richieste.id] }),
  immobile: one(immobili, { fields: [matching.immobileId], references: [immobili.id] }),
}));

// Opportunita Mercato relations
export const opportunitaMercatoRelations = relations(opportunitaMercato, ({ one, many }) => ({
  richiestaOrigine: one(richieste, { fields: [opportunitaMercato.richiestaOrigineId], references: [richieste.id] }),
  immobilePortafoglio: one(immobili, { fields: [opportunitaMercato.immobilePortafoglioId], references: [immobili.id] }),
  pubblicizzatoDa: many(pubblicizzatoDa),
  attivita: many(attivitaOpportunita),
  documenti: many(documentiOpportunita),
  matching: many(matchingOpportunita),
}));

export const pubblicizzatoDaRelations = relations(pubblicizzatoDa, ({ one }) => ({
  opportunita: one(opportunitaMercato, { fields: [pubblicizzatoDa.opportunitaId], references: [opportunitaMercato.id] }),
}));

export const attivitaOpportunitaRelations = relations(attivitaOpportunita, ({ one }) => ({
  opportunita: one(opportunitaMercato, { fields: [attivitaOpportunita.opportunitaId], references: [opportunitaMercato.id] }),
}));

export const documentiOpportunitaRelations = relations(documentiOpportunita, ({ one }) => ({
  opportunita: one(opportunitaMercato, { fields: [documentiOpportunita.opportunitaId], references: [opportunitaMercato.id] }),
}));

export const matchingOpportunitaRelations = relations(matchingOpportunita, ({ one }) => ({
  opportunita: one(opportunitaMercato, { fields: [matchingOpportunita.opportunitaId], references: [opportunitaMercato.id] }),
  richiesta: one(richieste, { fields: [matchingOpportunita.richiestaId], references: [richieste.id] }),
}));

// Helper to coerce numeric strings to numbers - handles empty strings, null, undefined, NaN
const coerceOptionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number().optional().nullable()
);

// Helper to coerce values to strings for decimal fields (database stores as string)
const coerceOptionalDecimal = z.preprocess(
  (val) => {
    if (val === "" || val === null || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : String(num);
  },
  z.string().optional().nullable()
);

// Insert schemas with coercion for numeric/string inputs
export const insertClienteSchema = createInsertSchema(clienti).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  ratingCliente: coerceOptionalNumber,
});

export const insertRichiestaSchema = createInsertSchema(richieste).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  budgetMassimo: coerceOptionalDecimal,
  mqMinimi: coerceOptionalNumber,
  camereMinime: coerceOptionalNumber,
  bagniMinimi: coerceOptionalNumber,
  priorita: coerceOptionalNumber,
  ratingRichiesta: coerceOptionalNumber,
});

export const insertImmobileSchema = createInsertSchema(immobili).omit({
  id: true,
  idWeb: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  prezzo: coerceOptionalDecimal,
  mq: coerceOptionalNumber,
  piano: coerceOptionalNumber,
  pianiEdificio: coerceOptionalNumber,
  camere: coerceOptionalNumber,
  bagni: coerceOptionalNumber,
  speseCondominiali: coerceOptionalDecimal,
  annoCostruzione: coerceOptionalNumber,
  latitudine: coerceOptionalDecimal,
  longitudine: coerceOptionalDecimal,
});

export const insertComunicazioneSchema = createInsertSchema(comunicazioni).omit({
  id: true,
  dataOra: true,
});

export const insertAppuntamentoSchema = createInsertSchema(appuntamenti).omit({
  id: true,
  createdAt: true,
});

export const insertMatchingSchema = createInsertSchema(matching).omit({
  id: true,
  createdAt: true,
}).extend({
  punteggio: coerceOptionalNumber,
});

export const insertImmobileEsternoSchema = createInsertSchema(immobiliEsterni).omit({
  id: true,
  idWeb: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  prezzo: coerceOptionalDecimal,
  mq: coerceOptionalNumber,
  piano: coerceOptionalNumber,
  pianiEdificio: coerceOptionalNumber,
  camere: coerceOptionalNumber,
  bagni: coerceOptionalNumber,
  speseCondominiali: coerceOptionalDecimal,
  annoCostruzione: coerceOptionalNumber,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertAttivitaImmobileSchema = createInsertSchema(attivitaImmobile).omit({
  id: true,
  createdAt: true,
});

export const insertAttivitaClienteSchema = createInsertSchema(attivitaCliente).omit({
  id: true,
  createdAt: true,
});

export const insertAttivitaImmobileEsternoSchema = createInsertSchema(attivitaImmobileEsterno).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentoImmobileSchema = createInsertSchema(documentiImmobile).omit({
  id: true,
  createdAt: true,
});

export const insertPortaleImmobileSchema = createInsertSchema(portaliImmobile).omit({
  id: true,
  createdAt: true,
});

export const insertStoricoPrezzoSchema = createInsertSchema(storicoPrezzo).omit({
  id: true,
}).extend({
  prezzo: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : String(num);
    },
    z.string()
  ),
});

// Types
export type Cliente = typeof clienti.$inferSelect;
export type InsertCliente = z.infer<typeof insertClienteSchema>;

export type Richiesta = typeof richieste.$inferSelect;
export type InsertRichiesta = z.infer<typeof insertRichiestaSchema>;

export type Immobile = typeof immobili.$inferSelect;
export type InsertImmobile = z.infer<typeof insertImmobileSchema>;

export type Comunicazione = typeof comunicazioni.$inferSelect;
export type InsertComunicazione = z.infer<typeof insertComunicazioneSchema>;

export type Appuntamento = typeof appuntamenti.$inferSelect;
export type InsertAppuntamento = z.infer<typeof insertAppuntamentoSchema>;

export type Matching = typeof matching.$inferSelect;
export type InsertMatching = z.infer<typeof insertMatchingSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type ImmobileEsterno = typeof immobiliEsterni.$inferSelect;
export type InsertImmobileEsterno = z.infer<typeof insertImmobileEsternoSchema>;

// Annunci Immobile types
export const insertAnnuncioImmobileSchema = createInsertSchema(annunciImmobile).omit({
  id: true,
  createdAt: true,
}).extend({
  prezzo: coerceOptionalDecimal,
});
export type AnnuncioImmobile = typeof annunciImmobile.$inferSelect;
export type InsertAnnuncioImmobile = z.infer<typeof insertAnnuncioImmobileSchema>;

export type AttivitaImmobile = typeof attivitaImmobile.$inferSelect;
export type InsertAttivitaImmobile = z.infer<typeof insertAttivitaImmobileSchema>;

export type AttivitaCliente = typeof attivitaCliente.$inferSelect;
export type InsertAttivitaCliente = z.infer<typeof insertAttivitaClienteSchema>;

export type AttivitaImmobileEsterno = typeof attivitaImmobileEsterno.$inferSelect;
export type InsertAttivitaImmobileEsterno = z.infer<typeof insertAttivitaImmobileEsternoSchema>;

export type DocumentoImmobile = typeof documentiImmobile.$inferSelect;
export type InsertDocumentoImmobile = z.infer<typeof insertDocumentoImmobileSchema>;

export type PortaleImmobile = typeof portaliImmobile.$inferSelect;
export type InsertPortaleImmobile = z.infer<typeof insertPortaleImmobileSchema>;

export type StoricoPrezzo = typeof storicoPrezzo.$inferSelect;
export type InsertStoricoPrezzo = z.infer<typeof insertStoricoPrezzoSchema>;

// Contatti Portale types
export const insertContattoPortaleSchema = createInsertSchema(contattiPortale).omit({
  id: true,
});
export type ContattoPortale = typeof contattiPortale.$inferSelect;
export type InsertContattoPortale = z.infer<typeof insertContattoPortaleSchema>;

// WhatsApp Campaign types
export const insertWhatsappCampaignSchema = createInsertSchema(whatsappCampaigns).omit({ id: true, createdAt: true });
export type WhatsappCampaign = typeof whatsappCampaigns.$inferSelect;
export type InsertWhatsappCampaign = z.infer<typeof insertWhatsappCampaignSchema>;

export const insertCampaignMessageSchema = createInsertSchema(campaignMessages).omit({ id: true, createdAt: true });
export type CampaignMessage = typeof campaignMessages.$inferSelect;
export type InsertCampaignMessage = z.infer<typeof insertCampaignMessageSchema>;

export const insertBotConversationLogSchema = createInsertSchema(botConversationLogs).omit({ id: true, createdAt: true });
export type BotConversationLog = typeof botConversationLogs.$inferSelect;
export type InsertBotConversationLog = z.infer<typeof insertBotConversationLogSchema>;

export const insertScheduledBotMessageSchema = createInsertSchema(scheduledBotMessages).omit({ id: true, createdAt: true });
export type ScheduledBotMessage = typeof scheduledBotMessages.$inferSelect;
export type InsertScheduledBotMessage = z.infer<typeof insertScheduledBotMessageSchema>;

// WhatsApp Chat types
export const insertWhatsappConversationSchema = createInsertSchema(whatsappConversations).omit({ id: true, createdAt: true, updatedAt: true });
export type WhatsappConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsappConversation = z.infer<typeof insertWhatsappConversationSchema>;

export const insertWhatsappMessageSchema = createInsertSchema(whatsappMessages).omit({ id: true, createdAt: true });
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessageSchema>;

// Schema per invio comunicazione da scheda cliente
export const sendCommunicationSchema = z.object({
  canale: z.enum(["whatsapp", "email"]),
  messaggio: z.string().min(1, "Il messaggio è obbligatorio"),
  immobileId: z.number().optional().nullable(),
  tipo: z.enum(["proposta", "richiesta", "risposta", "followup", "auguri", "nota"]).default("risposta"),
  attivitaClienteId: z.number().optional().nullable(),
});
export type SendCommunicationInput = z.infer<typeof sendCommunicationSchema>;

// OAuth Tokens types
export const insertOauthTokenSchema = createInsertSchema(oauthTokens).omit({ id: true, createdAt: true, updatedAt: true });
export type OauthToken = typeof oauthTokens.$inferSelect;
export type InsertOauthToken = z.infer<typeof insertOauthTokenSchema>;

// Calendar Events types
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true });
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

// Appointment Confirmations types
export const insertAppointmentConfirmationSchema = createInsertSchema(appointmentConfirmations).omit({ id: true, createdAt: true });
export type AppointmentConfirmation = typeof appointmentConfirmations.$inferSelect;
export type InsertAppointmentConfirmation = z.infer<typeof insertAppointmentConfirmationSchema>;

// Notifiche types
export const insertNotificaSchema = createInsertSchema(notifiche).omit({ id: true, createdAt: true });
export type Notifica = typeof notifiche.$inferSelect;
export type InsertNotifica = z.infer<typeof insertNotificaSchema>;

// Task types
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Opportunita Mercato types
export const insertOpportunitaMercatoSchema = createInsertSchema(opportunitaMercato).omit({
  id: true,
  idWeb: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  prezzo: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : String(num);
    },
    z.string().optional().nullable()
  ),
  mq: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional().nullable()
  ),
  piano: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional().nullable()
  ),
  camere: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional().nullable()
  ),
  bagni: z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().optional().nullable()
  ),
});
export type OpportunitaMercato = typeof opportunitaMercato.$inferSelect;
export type InsertOpportunitaMercato = z.infer<typeof insertOpportunitaMercatoSchema>;

// Pubblicizzato Da types
export const insertPubblicizzatoDaSchema = createInsertSchema(pubblicizzatoDa).omit({ id: true, createdAt: true });
export type PubblicizzatoDa = typeof pubblicizzatoDa.$inferSelect;
export type InsertPubblicizzatoDa = z.infer<typeof insertPubblicizzatoDaSchema>;

// Attivita Opportunita types
export const insertAttivitaOpportunitaSchema = createInsertSchema(attivitaOpportunita).omit({ id: true, createdAt: true });
export type AttivitaOpportunita = typeof attivitaOpportunita.$inferSelect;
export type InsertAttivitaOpportunita = z.infer<typeof insertAttivitaOpportunitaSchema>;

// Documenti Opportunita types
export const insertDocumentiOpportunitaSchema = createInsertSchema(documentiOpportunita).omit({ id: true, createdAt: true });
export type DocumentoOpportunita = typeof documentiOpportunita.$inferSelect;
export type InsertDocumentoOpportunita = z.infer<typeof insertDocumentiOpportunitaSchema>;

// Matching Opportunita types
export const insertMatchingOpportunitaSchema = createInsertSchema(matchingOpportunita).omit({ id: true, createdAt: true });
export type MatchingOpportunita = typeof matchingOpportunita.$inferSelect;
export type InsertMatchingOpportunita = z.infer<typeof insertMatchingOpportunitaSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — utenti (Google SSO) e service accounts (API key per Paolo agent)
// Aggiunte 2026-05-21, compatibili con schema_update.sql applicato su Supabase
// ═══════════════════════════════════════════════════════════════════════════

// USERS — login Google SSO
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleSub: text("google_sub").unique(),
  email: text("email").notNull().unique(),
  nome: text("nome"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("viewer"), // admin | agent | viewer
  attivo: boolean("attivo").notNull().default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// API KEYS — service accounts (es. Paolo agent)
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  role: text("role").notNull().default("agent"),
  attivo: boolean("attivo").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
});
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// Auth principal: rappresenta chi sta facendo la richiesta (utente OAuth o service account API key)
export type AuthPrincipal =
  | { type: "user"; userId: number; email: string; role: string }
  | { type: "api_key"; apiKeyId: number; nome: string; role: string };

