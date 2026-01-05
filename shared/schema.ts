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
  appellativo: text("appellativo"), // Mr, Mrs, Dr, etc.
  nome: text("nome").notNull(),
  cognome: text("cognome").notNull(),
  telefono: text("telefono"),
  email: text("email"),
  compleanno: text("compleanno"), // stored as string for simplicity
  religione: text("religione"),
  note: text("note"),
  tipoCliente: text("tipo_cliente").notNull().default("compratore"), // compratore, venditore, entrambi
  ratingCliente: integer("rating_cliente").default(3), // 1-5
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
  attiva: boolean("attiva").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// IMMOBILI - Properties
export const immobili = pgTable("immobili", {
  id: serial("id").primaryKey(),
  proprietarioId: integer("proprietario_id").references(() => clienti.id, { onDelete: "set null" }),
  titolo: text("titolo").notNull(),
  descrizione: text("descrizione"),
  indirizzo: text("indirizzo"),
  zona: text("zona"),
  mq: integer("mq"),
  prezzo: decimal("prezzo", { precision: 12, scale: 2 }),
  piano: integer("piano"),
  statoNuovo: boolean("stato_nuovo").default(false),
  statoRistrutturato: boolean("stato_ristrutturato").default(false),
  statoBuono: boolean("stato_buono").default(false),
  statoDaRistrutturare: boolean("stato_da_ristrutturare").default(false),
  balcone: boolean("balcone").default(false),
  terrazzo: boolean("terrazzo").default(false),
  ascensore: boolean("ascensore").default(false),
  box: boolean("box").default(false),
  camere: integer("camere"),
  bagni: integer("bagni"),
  latitudine: decimal("latitudine", { precision: 10, scale: 7 }),
  longitudine: decimal("longitudine", { precision: 10, scale: 7 }),
  esclusiva: boolean("esclusiva").default(false),
  multiagenzia: boolean("multiagenzia").default(false),
  fonte: text("fonte").default("privato"), // privato, agenzia, scraping
  immagini: json("immagini").$type<string[]>().default([]),
  attivo: boolean("attivo").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// COMUNICAZIONI - Communications
export const comunicazioni = pgTable("comunicazioni", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").references(() => clienti.id, { onDelete: "cascade" }),
  immobileId: integer("immobile_id").references(() => immobili.id, { onDelete: "set null" }),
  tipo: text("tipo").notNull().default("nota"), // matching, richiesta, risposta, followup, auguri, nota
  testo: text("testo").notNull(),
  canale: text("canale").default("sistema"), // whatsapp, email, telefono, sistema
  creatoDA: text("creato_da").default("sistema"), // sistema, agente, cliente
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
  confermato: boolean("confermato").default(false),
  completato: boolean("completato").default(false),
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
}));

export const comunicazioniRelations = relations(comunicazioni, ({ one }) => ({
  cliente: one(clienti, { fields: [comunicazioni.clienteId], references: [clienti.id] }),
  immobile: one(immobili, { fields: [comunicazioni.immobileId], references: [immobili.id] }),
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
  createdAt: true,
  updatedAt: true,
}).extend({
  prezzo: coerceOptionalDecimal,
  mq: coerceOptionalNumber,
  piano: coerceOptionalNumber,
  camere: coerceOptionalNumber,
  bagni: coerceOptionalNumber,
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

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
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
