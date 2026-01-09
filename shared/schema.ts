import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, boolean, timestamp, decimal, json } from "drizzle-orm/pg-core";
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
  appellativo: text("appellativo"), // Gent.mo Sig., Egr. Dott., Egr. Avv.to, Gent.ma Sig.ra, Ciao
  nome: text("nome"), // opzionale
  cognome: text("cognome"), // opzionale
  telefono: text("telefono"),
  email: text("email"),
  compleanno: text("compleanno"), // stored as string for simplicity
  religione: text("religione"),
  note: text("note"),
  tipoCliente: text("tipo_cliente").notNull().default("compratore"), // compratore, venditore, entrambi
  ratingCliente: integer("rating_cliente").default(3), // 1-5
  clienteAmico: boolean("cliente_amico").default(false), // Per tono messaggi: amico = informale, non amico = formale
  linkImmobile: text("link_immobile"), // Link all'annuncio immobile per proprietari
  attivo: boolean("attivo").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// RICHIESTE - Buyer requests
export const richieste = pgTable("richieste", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").notNull().references(() => clienti.id, { onDelete: "cascade" }),
  descrizioneLibera: text("descrizione_libera"), // free text AI will parse
  budgetMassimo: decimal("budget_massimo", { precision: 12, scale: 2 }),
  mqMinimi: integer("mq_minimi"),
  zona: text("zona"),
  poligonoGeografico: json("poligono_geografico"), // GeoJSON
  pianoTutti: boolean("piano_tutti").default(false),
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
export const immobili = pgTable("immobili", {
  id: serial("id").primaryKey(),
  idWeb: text("id_web").unique(), // ID univoco per identificazione via email/web
  idPortale: text("id_portale"), // ID breve per matching richieste portali (es. "Prima" per Primaticcio)
  proprietarioId: integer("proprietario_id").references(() => clienti.id, { onDelete: "set null" }),
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  indirizzo: text("indirizzo"),
  zona: text("zona"),
  citta: text("citta"),
  mq: integer("mq"),
  prezzo: decimal("prezzo", { precision: 12, scale: 2 }),
  piano: integer("piano"),
  pianiEdificio: integer("piani_edificio"),
  statoVendita: text("stato_vendita").default("disponibile"), // disponibile, in_trattativa, venduto, ritirato
  statoNuovo: boolean("stato_nuovo").default(false),
  statoRistrutturato: boolean("stato_ristrutturato").default(false),
  statoBuono: boolean("stato_buono").default(false),
  statoDaRistrutturare: boolean("stato_da_ristrutturare").default(false),
  balcone: boolean("balcone").default(false),
  terrazzo: boolean("terrazzo").default(false),
  ascensore: boolean("ascensore").default(false),
  box: boolean("box").default(false),
  cantina: boolean("cantina").default(false),
  giardino: boolean("giardino").default(false),
  arredato: boolean("arredato").default(false),
  camere: integer("camere"),
  bagni: integer("bagni"),
  // Informazioni aggiuntive
  classeEnergetica: text("classe_energetica"),
  prestazioneEnergetica: text("prestazione_energetica"),
  speseCondominiali: decimal("spese_condominiali", { precision: 10, scale: 2 }),
  riscaldamento: text("riscaldamento"),
  esposizione: text("esposizione"),
  annoCostruzione: integer("anno_costruzione"),
  // Contatto proprietario (per acquisizioni)
  contattoNome: text("contatto_nome"),
  contattoTelefono: text("contatto_telefono"),
  contattoEmail: text("contatto_email"),
  // Meta acquisizione
  urlAnnuncio: text("url_annuncio"),
  testoOriginale: text("testo_originale"),
  riferimentoAnnuncio: text("riferimento_annuncio"),
  dataPubblicazione: text("data_pubblicazione"),
  // Stato contatto acquisizione
  statoContatto: text("stato_contatto").default("nuovo"), // nuovo, contattato, interessato, scartato
  messaggioInviato: text("messaggio_inviato"),
  dataContatto: timestamp("data_contatto"),
  preferito: boolean("preferito").default(false),
  // Origine e gestione
  origine: text("origine").default("mandato"), // mandato, acquisizione
  noteInterne: text("note_interne"),
  latitudine: decimal("latitudine", { precision: 10, scale: 7 }),
  longitudine: decimal("longitudine", { precision: 10, scale: 7 }),
  esclusiva: boolean("esclusiva").default(false),
  multiagenzia: boolean("multiagenzia").default(false),
  fonte: text("fonte").default("privato"), // privato, agenzia, immobiliare.it, idealista, etc.
  immagini: json("immagini").$type<string[]>().default([]),
  caratteristiche: json("caratteristiche").$type<Record<string, any>>().default({}),
  attivo: boolean("attivo").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
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

// IMMOBILI ESTERNI - External properties (scraped/manual from portals)
export const immobiliEsterni = pgTable("immobili_esterni", {
  id: serial("id").primaryKey(),
  idWeb: text("id_web").unique(), // ID univoco per identificazione via email/web
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "set null" }),
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
  attivo: boolean("attivo").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
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
  userMessage: text("user_message").notNull(), // Il messaggio del cliente a cui rispondere
  scheduledAt: timestamp("scheduled_at").notNull(), // Quando inviare la risposta
  status: text("status").default("pending").notNull(), // pending, processing, sent, failed
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at"),
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

export type AttivitaImmobile = typeof attivitaImmobile.$inferSelect;
export type InsertAttivitaImmobile = z.infer<typeof insertAttivitaImmobileSchema>;

export type AttivitaCliente = typeof attivitaCliente.$inferSelect;
export type InsertAttivitaCliente = z.infer<typeof insertAttivitaClienteSchema>;

export type DocumentoImmobile = typeof documentiImmobile.$inferSelect;
export type InsertDocumentoImmobile = z.infer<typeof insertDocumentoImmobileSchema>;

export type PortaleImmobile = typeof portaliImmobile.$inferSelect;
export type InsertPortaleImmobile = z.infer<typeof insertPortaleImmobileSchema>;

export type StoricoPrezzo = typeof storicoPrezzo.$inferSelect;
export type InsertStoricoPrezzo = z.infer<typeof insertStoricoPrezzoSchema>;

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
