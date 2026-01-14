import { 
  clienti, richieste, immobili, comunicazioni, appuntamenti, matching, immobiliEsterni,
  attivitaImmobile, attivitaCliente, documentiImmobile, portaliImmobile, storicoPrezzo,
  whatsappCampaigns, campaignMessages, botConversationLogs, scheduledBotMessages,
  whatsappConversations, whatsappMessages, annunciImmobile,
  oauthTokens, calendarEvents, appointmentConfirmations, notifiche,
  type Cliente, type InsertCliente,
  type Richiesta, type InsertRichiesta,
  type Immobile, type InsertImmobile,
  type Comunicazione, type InsertComunicazione,
  type Appuntamento, type InsertAppuntamento,
  type Matching, type InsertMatching,
  type ImmobileEsterno, type InsertImmobileEsterno,
  type AttivitaImmobile, type InsertAttivitaImmobile,
  type AttivitaCliente, type InsertAttivitaCliente,
  type DocumentoImmobile, type InsertDocumentoImmobile,
  type PortaleImmobile, type InsertPortaleImmobile,
  type StoricoPrezzo, type InsertStoricoPrezzo,
  type WhatsappCampaign, type InsertWhatsappCampaign,
  type CampaignMessage, type InsertCampaignMessage,
  type BotConversationLog, type InsertBotConversationLog,
  type ScheduledBotMessage, type InsertScheduledBotMessage,
  type WhatsappConversation, type InsertWhatsappConversation,
  type WhatsappMessage, type InsertWhatsappMessage,
  type OauthToken, type InsertOauthToken,
  type CalendarEvent, type InsertCalendarEvent,
  type AppointmentConfirmation, type InsertAppointmentConfirmation,
  type Notifica, type InsertNotifica,
  type AnnuncioImmobile, type InsertAnnuncioImmobile,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, lte } from "drizzle-orm";

export interface IStorage {
  // Clienti
  getClienti(): Promise<Cliente[]>;
  getCliente(id: number): Promise<Cliente | undefined>;
  createCliente(data: InsertCliente): Promise<Cliente>;
  updateCliente(id: number, data: Partial<InsertCliente>): Promise<Cliente | undefined>;
  deleteCliente(id: number): Promise<boolean>;

  // Richieste
  getRichieste(clienteId?: number): Promise<Richiesta[]>;
  getRichiesta(id: number): Promise<Richiesta | undefined>;
  createRichiesta(data: InsertRichiesta): Promise<Richiesta>;
  updateRichiesta(id: number, data: Partial<InsertRichiesta>): Promise<Richiesta | undefined>;
  deleteRichiesta(id: number): Promise<boolean>;

  // Immobili
  getImmobili(proprietarioId?: number): Promise<Immobile[]>;
  getImmobile(id: number): Promise<Immobile | undefined>;
  createImmobile(data: InsertImmobile): Promise<Immobile>;
  updateImmobile(id: number, data: Partial<InsertImmobile>): Promise<Immobile | undefined>;
  deleteImmobile(id: number): Promise<boolean>;

  // Comunicazioni
  getComunicazioni(clienteId?: number): Promise<Comunicazione[]>;
  getComunicazioniByImmobile(immobileId: number): Promise<Comunicazione[]>;
  createComunicazione(data: InsertComunicazione): Promise<Comunicazione>;
  updateComunicazione(id: number, data: Partial<InsertComunicazione>): Promise<Comunicazione | undefined>;

  // Appuntamenti
  getAppuntamenti(clienteId?: number): Promise<Appuntamento[]>;
  getAppuntamento(id: number): Promise<Appuntamento | undefined>;
  createAppuntamento(data: InsertAppuntamento): Promise<Appuntamento>;
  updateAppuntamento(id: number, data: Partial<InsertAppuntamento>): Promise<Appuntamento | undefined>;
  deleteAppuntamento(id: number): Promise<boolean>;

  // Matching
  getMatching(richiestaId?: number): Promise<Matching[]>;
  getMatchById(id: number): Promise<Matching | undefined>;
  createMatching(data: InsertMatching): Promise<Matching>;
  updateMatching(id: number, data: Partial<InsertMatching>): Promise<Matching | undefined>;
  deleteMatchingByRichiesta(richiestaId: number): Promise<boolean>;

  // Immobili Esterni (Acquisizione)
  getImmobiliEsterni(preferiti?: boolean): Promise<ImmobileEsterno[]>;
  getImmobileEsterno(id: number): Promise<ImmobileEsterno | undefined>;
  getImmobileEsternoByUrl(url: string): Promise<ImmobileEsterno | undefined>;
  getImmobiliEsterniByCliente(clienteId: number): Promise<ImmobileEsterno[]>;
  getImmobiliEsterniByRichiesta(richiestaId: number): Promise<ImmobileEsterno[]>;
  createImmobileEsterno(data: InsertImmobileEsterno): Promise<ImmobileEsterno>;
  updateImmobileEsterno(id: number, data: Partial<InsertImmobileEsterno>): Promise<ImmobileEsterno | undefined>;
  deleteImmobileEsterno(id: number): Promise<boolean>;

  // Attività Immobile
  getAttivitaImmobile(immobileId: number): Promise<AttivitaImmobile[]>;
  getAllAttivitaImmobile(stato?: string): Promise<AttivitaImmobile[]>;
  createAttivitaImmobile(data: InsertAttivitaImmobile): Promise<AttivitaImmobile>;
  updateAttivitaImmobile(id: number, data: Partial<InsertAttivitaImmobile>): Promise<AttivitaImmobile | undefined>;
  deleteAttivitaImmobile(id: number): Promise<boolean>;

  // Attività Cliente
  getAttivitaCliente(clienteId: number): Promise<AttivitaCliente[]>;
  getAllAttivitaCliente(stato?: string, immobileId?: number): Promise<AttivitaCliente[]>;
  createAttivitaCliente(data: InsertAttivitaCliente): Promise<AttivitaCliente>;
  updateAttivitaCliente(id: number, data: Partial<InsertAttivitaCliente>): Promise<AttivitaCliente | undefined>;
  deleteAttivitaCliente(id: number): Promise<boolean>;

  // Documenti Immobile
  getDocumentiImmobile(immobileId: number): Promise<DocumentoImmobile[]>;
  createDocumentoImmobile(data: InsertDocumentoImmobile): Promise<DocumentoImmobile>;
  deleteDocumentoImmobile(id: number): Promise<boolean>;

  // Portali Immobile
  getPortaliImmobile(immobileId: number): Promise<PortaleImmobile[]>;
  createPortaleImmobile(data: InsertPortaleImmobile): Promise<PortaleImmobile>;
  updatePortaleImmobile(id: number, data: Partial<InsertPortaleImmobile>): Promise<PortaleImmobile | undefined>;
  deletePortaleImmobile(id: number): Promise<boolean>;

  // Storico Prezzo
  getStoricoPrezzo(immobileId: number): Promise<StoricoPrezzo[]>;
  createStoricoPrezzo(data: InsertStoricoPrezzo): Promise<StoricoPrezzo>;

  // Comunicazioni per Immobile
  getComunicazioniByImmobile(immobileId: number): Promise<Comunicazione[]>;
  getComunicazioniByImmobileEsterno(immobileEsternoId: number): Promise<Comunicazione[]>;

  // Appuntamenti per Immobile
  getAppuntamentiByImmobile(immobileId: number): Promise<Appuntamento[]>;
  getAppuntamentiByImmobileEsterno(immobileEsternoId: number): Promise<Appuntamento[]>;

  // Matching per Immobile
  getMatchingByImmobile(immobileId: number): Promise<Matching[]>;

  // WhatsApp Campaigns
  getWhatsappCampaigns(): Promise<WhatsappCampaign[]>;
  getWhatsappCampaign(id: number): Promise<WhatsappCampaign | undefined>;
  createWhatsappCampaign(data: InsertWhatsappCampaign): Promise<WhatsappCampaign>;
  updateWhatsappCampaign(id: number, data: Partial<InsertWhatsappCampaign>): Promise<WhatsappCampaign | undefined>;
  deleteWhatsappCampaign(id: number): Promise<boolean>;

  // Campaign Messages
  getCampaignMessages(campaignId?: number): Promise<CampaignMessage[]>;
  getCampaignMessage(id: number): Promise<CampaignMessage | undefined>;
  getCampaignMessagesByPhone(phoneNumber: string): Promise<CampaignMessage[]>;
  createCampaignMessage(data: InsertCampaignMessage): Promise<CampaignMessage>;
  updateCampaignMessage(id: number, data: Partial<InsertCampaignMessage>): Promise<CampaignMessage | undefined>;

  // Bot Conversation Logs
  getBotConversationLogs(campaignMessageId: number): Promise<BotConversationLog[]>;
  createBotConversationLog(data: InsertBotConversationLog): Promise<BotConversationLog>;

  // Scheduled Bot Messages (for delayed responses)
  getScheduledBotMessages(): Promise<ScheduledBotMessage[]>;
  getPendingScheduledMessages(): Promise<ScheduledBotMessage[]>;
  createScheduledBotMessage(data: InsertScheduledBotMessage): Promise<ScheduledBotMessage>;
  updateScheduledBotMessage(id: number, data: Partial<InsertScheduledBotMessage>): Promise<ScheduledBotMessage | undefined>;

  // WhatsApp Conversations
  getWhatsappConversations(): Promise<WhatsappConversation[]>;
  getWhatsappConversation(id: number): Promise<WhatsappConversation | undefined>;
  getWhatsappConversationByPhone(phoneNumber: string): Promise<WhatsappConversation | undefined>;
  createWhatsappConversation(data: InsertWhatsappConversation): Promise<WhatsappConversation>;
  updateWhatsappConversation(id: number, data: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation | undefined>;
  deleteWhatsappConversation(id: number): Promise<boolean>;

  // WhatsApp Messages
  getWhatsappMessages(conversationId: number): Promise<WhatsappMessage[]>;
  getWhatsappMessage(id: number): Promise<WhatsappMessage | undefined>;
  createWhatsappMessage(data: InsertWhatsappMessage): Promise<WhatsappMessage>;
  updateWhatsappMessage(id: number, data: Partial<InsertWhatsappMessage>): Promise<WhatsappMessage | undefined>;
  updateWhatsappMessageStatus(id: number, status: string): Promise<WhatsappMessage | undefined>;

  // Annunci Immobile (multi-agenzia)
  getAnnunciImmobile(immobileEsternoId: number): Promise<AnnuncioImmobile[]>;
  createAnnuncioImmobile(data: InsertAnnuncioImmobile): Promise<AnnuncioImmobile>;
  deleteAnnuncioImmobile(id: number): Promise<boolean>;
  updateMultiAgenziaStatus(immobileEsternoId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Clienti
  async getClienti(): Promise<Cliente[]> {
    return db.select().from(clienti).orderBy(desc(clienti.createdAt));
  }

  async getCliente(id: number): Promise<Cliente | undefined> {
    const [cliente] = await db.select().from(clienti).where(eq(clienti.id, id));
    return cliente;
  }

  async createCliente(data: InsertCliente): Promise<Cliente> {
    const [cliente] = await db.insert(clienti).values(data).returning();
    return cliente;
  }

  async updateCliente(id: number, data: Partial<InsertCliente>): Promise<Cliente | undefined> {
    const [cliente] = await db
      .update(clienti)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clienti.id, id))
      .returning();
    return cliente;
  }

  async deleteCliente(id: number): Promise<boolean> {
    const result = await db.delete(clienti).where(eq(clienti.id, id));
    return true;
  }

  // Richieste
  async getRichieste(clienteId?: number): Promise<Richiesta[]> {
    if (clienteId) {
      return db.select().from(richieste).where(eq(richieste.clienteId, clienteId)).orderBy(desc(richieste.createdAt));
    }
    return db.select().from(richieste).orderBy(desc(richieste.createdAt));
  }

  async getRichiesta(id: number): Promise<Richiesta | undefined> {
    const [richiesta] = await db.select().from(richieste).where(eq(richieste.id, id));
    return richiesta;
  }

  async createRichiesta(data: InsertRichiesta): Promise<Richiesta> {
    const [richiesta] = await db.insert(richieste).values(data).returning();
    return richiesta;
  }

  async updateRichiesta(id: number, data: Partial<InsertRichiesta>): Promise<Richiesta | undefined> {
    const [richiesta] = await db
      .update(richieste)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(richieste.id, id))
      .returning();
    return richiesta;
  }

  async deleteRichiesta(id: number): Promise<boolean> {
    await db.delete(richieste).where(eq(richieste.id, id));
    return true;
  }

  // Immobili
  async getImmobili(proprietarioId?: number): Promise<Immobile[]> {
    if (proprietarioId) {
      return db.select().from(immobili).where(eq(immobili.proprietarioId, proprietarioId)).orderBy(desc(immobili.createdAt));
    }
    return db.select().from(immobili).orderBy(desc(immobili.createdAt));
  }

  async getImmobile(id: number): Promise<Immobile | undefined> {
    const [immobile] = await db.select().from(immobili).where(eq(immobili.id, id));
    return immobile;
  }

  async createImmobile(data: InsertImmobile): Promise<Immobile> {
    // Generate unique idWeb automatically
    const idWeb = `IMM-${Date.now().toString(36).toUpperCase()}`;
    const [immobile] = await db.insert(immobili).values({ ...data, idWeb }).returning();
    return immobile;
  }

  async updateImmobile(id: number, data: Partial<InsertImmobile>): Promise<Immobile | undefined> {
    const [immobile] = await db
      .update(immobili)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(immobili.id, id))
      .returning();
    return immobile;
  }

  async deleteImmobile(id: number): Promise<boolean> {
    await db.delete(immobili).where(eq(immobili.id, id));
    return true;
  }

  // Comunicazioni
  async getComunicazioni(clienteId?: number): Promise<Comunicazione[]> {
    if (clienteId) {
      return db.select().from(comunicazioni).where(eq(comunicazioni.clienteId, clienteId)).orderBy(desc(comunicazioni.dataOra));
    }
    return db.select().from(comunicazioni).orderBy(desc(comunicazioni.dataOra));
  }

  async createComunicazione(data: InsertComunicazione): Promise<Comunicazione> {
    const [comunicazione] = await db.insert(comunicazioni).values(data).returning();
    return comunicazione;
  }

  async getComunicazioniByImmobile(immobileId: number): Promise<Comunicazione[]> {
    return db.select().from(comunicazioni).where(eq(comunicazioni.immobileId, immobileId)).orderBy(desc(comunicazioni.dataOra));
  }

  async getComunicazioniByImmobileEsterno(immobileEsternoId: number): Promise<Comunicazione[]> {
    return db.select().from(comunicazioni).where(eq(comunicazioni.immobileEsternoId, immobileEsternoId)).orderBy(desc(comunicazioni.dataOra));
  }

  async updateComunicazione(id: number, data: Partial<InsertComunicazione>): Promise<Comunicazione | undefined> {
    const [comunicazione] = await db
      .update(comunicazioni)
      .set(data)
      .where(eq(comunicazioni.id, id))
      .returning();
    return comunicazione;
  }

  // Appuntamenti
  async getAppuntamenti(clienteId?: number): Promise<Appuntamento[]> {
    if (clienteId) {
      return db.select().from(appuntamenti).where(eq(appuntamenti.clienteId, clienteId)).orderBy(desc(appuntamenti.dataOra));
    }
    return db.select().from(appuntamenti).orderBy(desc(appuntamenti.dataOra));
  }

  async getAppuntamento(id: number): Promise<Appuntamento | undefined> {
    const [appuntamento] = await db.select().from(appuntamenti).where(eq(appuntamenti.id, id));
    return appuntamento;
  }

  async createAppuntamento(data: InsertAppuntamento): Promise<Appuntamento> {
    const [appuntamento] = await db.insert(appuntamenti).values(data).returning();
    return appuntamento;
  }

  async updateAppuntamento(id: number, data: Partial<InsertAppuntamento>): Promise<Appuntamento | undefined> {
    const [appuntamento] = await db
      .update(appuntamenti)
      .set(data)
      .where(eq(appuntamenti.id, id))
      .returning();
    return appuntamento;
  }

  async deleteAppuntamento(id: number): Promise<boolean> {
    await db.delete(appuntamenti).where(eq(appuntamenti.id, id));
    return true;
  }

  // Matching
  async getMatching(richiestaId?: number): Promise<Matching[]> {
    if (richiestaId) {
      return db.select().from(matching).where(eq(matching.richiestaId, richiestaId)).orderBy(desc(matching.punteggio));
    }
    return db.select().from(matching).orderBy(desc(matching.punteggio));
  }

  async getMatchById(id: number): Promise<Matching | undefined> {
    const [match] = await db.select().from(matching).where(eq(matching.id, id));
    return match;
  }

  async createMatching(data: InsertMatching): Promise<Matching> {
    const [match] = await db.insert(matching).values(data as any).returning();
    return match;
  }

  async updateMatching(id: number, data: Partial<InsertMatching>): Promise<Matching | undefined> {
    const [match] = await db
      .update(matching)
      .set(data as any)
      .where(eq(matching.id, id))
      .returning();
    return match;
  }

  async deleteMatchingByRichiesta(richiestaId: number): Promise<boolean> {
    await db.delete(matching).where(eq(matching.richiestaId, richiestaId));
    return true;
  }

  // Immobili Esterni (Acquisizione)
  async getImmobiliEsterni(preferiti?: boolean): Promise<ImmobileEsterno[]> {
    if (preferiti !== undefined) {
      return db.select().from(immobiliEsterni).where(eq(immobiliEsterni.preferito, preferiti)).orderBy(desc(immobiliEsterni.createdAt));
    }
    return db.select().from(immobiliEsterni).orderBy(desc(immobiliEsterni.createdAt));
  }

  async getImmobileEsterno(id: number): Promise<ImmobileEsterno | undefined> {
    const [immobile] = await db.select().from(immobiliEsterni).where(eq(immobiliEsterni.id, id));
    return immobile;
  }

  async getImmobileEsternoByUrl(url: string): Promise<ImmobileEsterno | undefined> {
    // Match by urlAnnuncio or formUrl
    const [immobile] = await db.select().from(immobiliEsterni).where(
      or(
        eq(immobiliEsterni.urlAnnuncio, url),
        eq(immobiliEsterni.formUrl, url)
      )
    );
    return immobile;
  }

  async getImmobiliEsterniByCliente(clienteId: number): Promise<ImmobileEsterno[]> {
    return db.select().from(immobiliEsterni).where(eq(immobiliEsterni.clienteId, clienteId)).orderBy(desc(immobiliEsterni.createdAt));
  }

  async getImmobiliEsterniByRichiesta(richiestaId: number): Promise<ImmobileEsterno[]> {
    return db.select().from(immobiliEsterni).where(eq(immobiliEsterni.richiestaId, richiestaId)).orderBy(desc(immobiliEsterni.createdAt));
  }

  async createImmobileEsterno(data: InsertImmobileEsterno): Promise<ImmobileEsterno> {
    // Generate unique idWeb automatically
    const idWeb = `ACQ-${Date.now().toString(36).toUpperCase()}`;
    const [immobile] = await db.insert(immobiliEsterni).values({ ...data, idWeb }).returning();
    return immobile;
  }

  async updateImmobileEsterno(id: number, data: Partial<InsertImmobileEsterno>): Promise<ImmobileEsterno | undefined> {
    const [immobile] = await db
      .update(immobiliEsterni)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(immobiliEsterni.id, id))
      .returning();
    return immobile;
  }

  async deleteImmobileEsterno(id: number): Promise<boolean> {
    await db.delete(immobiliEsterni).where(eq(immobiliEsterni.id, id));
    return true;
  }

  // Attività Immobile
  async getAttivitaImmobile(immobileId: number): Promise<AttivitaImmobile[]> {
    return db.select().from(attivitaImmobile).where(eq(attivitaImmobile.immobileId, immobileId)).orderBy(desc(attivitaImmobile.createdAt));
  }

  async getAllAttivitaImmobile(stato?: string): Promise<AttivitaImmobile[]> {
    if (stato) {
      return db.select().from(attivitaImmobile).where(eq(attivitaImmobile.stato, stato)).orderBy(desc(attivitaImmobile.createdAt));
    }
    return db.select().from(attivitaImmobile).orderBy(desc(attivitaImmobile.createdAt));
  }

  async createAttivitaImmobile(data: InsertAttivitaImmobile): Promise<AttivitaImmobile> {
    const [attivita] = await db.insert(attivitaImmobile).values(data).returning();
    return attivita;
  }

  async updateAttivitaImmobile(id: number, data: Partial<InsertAttivitaImmobile>): Promise<AttivitaImmobile | undefined> {
    const [attivita] = await db.update(attivitaImmobile).set(data).where(eq(attivitaImmobile.id, id)).returning();
    return attivita;
  }

  async deleteAttivitaImmobile(id: number): Promise<boolean> {
    await db.delete(attivitaImmobile).where(eq(attivitaImmobile.id, id));
    return true;
  }

  // Attività Cliente
  async getAttivitaCliente(clienteId: number): Promise<AttivitaCliente[]> {
    return db.select().from(attivitaCliente).where(eq(attivitaCliente.clienteId, clienteId)).orderBy(desc(attivitaCliente.createdAt));
  }

  async getAllAttivitaCliente(stato?: string, immobileId?: number): Promise<AttivitaCliente[]> {
    const conditions = [];
    if (stato) {
      conditions.push(eq(attivitaCliente.stato, stato));
    }
    if (immobileId) {
      conditions.push(eq(attivitaCliente.immobileId, immobileId));
    }
    if (conditions.length > 0) {
      return db.select().from(attivitaCliente).where(and(...conditions)).orderBy(desc(attivitaCliente.createdAt));
    }
    return db.select().from(attivitaCliente).orderBy(desc(attivitaCliente.createdAt));
  }

  async createAttivitaCliente(data: InsertAttivitaCliente): Promise<AttivitaCliente> {
    const [attivita] = await db.insert(attivitaCliente).values(data).returning();
    return attivita;
  }

  async updateAttivitaCliente(id: number, data: Partial<InsertAttivitaCliente>): Promise<AttivitaCliente | undefined> {
    const [attivita] = await db.update(attivitaCliente).set(data).where(eq(attivitaCliente.id, id)).returning();
    return attivita;
  }

  async deleteAttivitaCliente(id: number): Promise<boolean> {
    await db.delete(attivitaCliente).where(eq(attivitaCliente.id, id));
    return true;
  }

  // Documenti Immobile
  async getDocumentiImmobile(immobileId: number): Promise<DocumentoImmobile[]> {
    return db.select().from(documentiImmobile).where(eq(documentiImmobile.immobileId, immobileId)).orderBy(desc(documentiImmobile.createdAt));
  }

  async createDocumentoImmobile(data: InsertDocumentoImmobile): Promise<DocumentoImmobile> {
    const [documento] = await db.insert(documentiImmobile).values(data).returning();
    return documento;
  }

  async deleteDocumentoImmobile(id: number): Promise<boolean> {
    await db.delete(documentiImmobile).where(eq(documentiImmobile.id, id));
    return true;
  }

  // Portali Immobile
  async getPortaliImmobile(immobileId: number): Promise<PortaleImmobile[]> {
    return db.select().from(portaliImmobile).where(eq(portaliImmobile.immobileId, immobileId)).orderBy(desc(portaliImmobile.createdAt));
  }

  async createPortaleImmobile(data: InsertPortaleImmobile): Promise<PortaleImmobile> {
    const [portale] = await db.insert(portaliImmobile).values(data).returning();
    return portale;
  }

  async updatePortaleImmobile(id: number, data: Partial<InsertPortaleImmobile>): Promise<PortaleImmobile | undefined> {
    const [portale] = await db.update(portaliImmobile).set(data).where(eq(portaliImmobile.id, id)).returning();
    return portale;
  }

  async deletePortaleImmobile(id: number): Promise<boolean> {
    await db.delete(portaliImmobile).where(eq(portaliImmobile.id, id));
    return true;
  }

  // Storico Prezzo
  async getStoricoPrezzo(immobileId: number): Promise<StoricoPrezzo[]> {
    return db.select().from(storicoPrezzo).where(eq(storicoPrezzo.immobileId, immobileId)).orderBy(desc(storicoPrezzo.dataModifica));
  }

  async createStoricoPrezzo(data: InsertStoricoPrezzo): Promise<StoricoPrezzo> {
    const [storico] = await db.insert(storicoPrezzo).values(data).returning();
    return storico;
  }

  // Appuntamenti per Immobile
  async getAppuntamentiByImmobile(immobileId: number): Promise<Appuntamento[]> {
    return db.select().from(appuntamenti).where(eq(appuntamenti.immobileId, immobileId)).orderBy(desc(appuntamenti.dataOra));
  }

  async getAppuntamentiByImmobileEsterno(immobileEsternoId: number): Promise<Appuntamento[]> {
    return db.select().from(appuntamenti).where(eq(appuntamenti.immobileEsternoId, immobileEsternoId)).orderBy(desc(appuntamenti.dataOra));
  }

  // Matching per Immobile
  async getMatchingByImmobile(immobileId: number): Promise<Matching[]> {
    return db.select().from(matching).where(eq(matching.immobileId, immobileId)).orderBy(desc(matching.punteggio));
  }

  // WhatsApp Campaigns
  async getWhatsappCampaigns(): Promise<WhatsappCampaign[]> {
    return db.select().from(whatsappCampaigns).orderBy(desc(whatsappCampaigns.createdAt));
  }

  async getWhatsappCampaign(id: number): Promise<WhatsappCampaign | undefined> {
    const [campaign] = await db.select().from(whatsappCampaigns).where(eq(whatsappCampaigns.id, id));
    return campaign;
  }

  async createWhatsappCampaign(data: InsertWhatsappCampaign): Promise<WhatsappCampaign> {
    const [campaign] = await db.insert(whatsappCampaigns).values(data).returning();
    return campaign;
  }

  async updateWhatsappCampaign(id: number, data: Partial<InsertWhatsappCampaign>): Promise<WhatsappCampaign | undefined> {
    const [campaign] = await db.update(whatsappCampaigns).set(data).where(eq(whatsappCampaigns.id, id)).returning();
    return campaign;
  }

  async deleteWhatsappCampaign(id: number): Promise<boolean> {
    await db.delete(whatsappCampaigns).where(eq(whatsappCampaigns.id, id));
    return true;
  }

  // Campaign Messages
  async getCampaignMessages(campaignId?: number): Promise<CampaignMessage[]> {
    if (campaignId) {
      return db.select().from(campaignMessages).where(eq(campaignMessages.campaignId, campaignId)).orderBy(desc(campaignMessages.createdAt));
    }
    return db.select().from(campaignMessages).orderBy(desc(campaignMessages.createdAt));
  }

  async getCampaignMessage(id: number): Promise<CampaignMessage | undefined> {
    const [message] = await db.select().from(campaignMessages).where(eq(campaignMessages.id, id));
    return message;
  }

  async getCampaignMessagesByPhone(phoneNumber: string): Promise<CampaignMessage[]> {
    return db.select().from(campaignMessages).where(eq(campaignMessages.phoneNumber, phoneNumber)).orderBy(desc(campaignMessages.createdAt));
  }

  async createCampaignMessage(data: InsertCampaignMessage): Promise<CampaignMessage> {
    const [message] = await db.insert(campaignMessages).values(data).returning();
    return message;
  }

  async updateCampaignMessage(id: number, data: Partial<InsertCampaignMessage>): Promise<CampaignMessage | undefined> {
    const [message] = await db.update(campaignMessages).set(data).where(eq(campaignMessages.id, id)).returning();
    return message;
  }

  // Bot Conversation Logs
  async getBotConversationLogs(campaignMessageId: number): Promise<BotConversationLog[]> {
    return db.select().from(botConversationLogs).where(eq(botConversationLogs.campaignMessageId, campaignMessageId)).orderBy(desc(botConversationLogs.createdAt));
  }

  async createBotConversationLog(data: InsertBotConversationLog): Promise<BotConversationLog> {
    const [log] = await db.insert(botConversationLogs).values(data).returning();
    return log;
  }

  // Scheduled Bot Messages
  async getScheduledBotMessages(): Promise<ScheduledBotMessage[]> {
    return db.select().from(scheduledBotMessages).orderBy(desc(scheduledBotMessages.createdAt));
  }

  async getPendingScheduledMessages(): Promise<ScheduledBotMessage[]> {
    // Get messages that are due (scheduledAt <= now) and still pending
    return db.select()
      .from(scheduledBotMessages)
      .where(
        and(
          eq(scheduledBotMessages.status, "pending"),
          lte(scheduledBotMessages.scheduledAt, new Date())
        )
      )
      .orderBy(scheduledBotMessages.scheduledAt);
  }

  async createScheduledBotMessage(data: InsertScheduledBotMessage): Promise<ScheduledBotMessage> {
    const [message] = await db.insert(scheduledBotMessages).values(data).returning();
    return message;
  }

  async updateScheduledBotMessage(id: number, data: Partial<InsertScheduledBotMessage>): Promise<ScheduledBotMessage | undefined> {
    const [message] = await db.update(scheduledBotMessages).set(data).where(eq(scheduledBotMessages.id, id)).returning();
    return message;
  }

  // WhatsApp Conversations
  async getWhatsappConversations(): Promise<WhatsappConversation[]> {
    return db.select().from(whatsappConversations).orderBy(desc(whatsappConversations.ultimoMessaggioData));
  }

  async getWhatsappConversation(id: number): Promise<WhatsappConversation | undefined> {
    const [conversation] = await db.select().from(whatsappConversations).where(eq(whatsappConversations.id, id));
    return conversation;
  }

  async getWhatsappConversationByPhone(phoneNumber: string): Promise<WhatsappConversation | undefined> {
    const [conversation] = await db.select().from(whatsappConversations).where(eq(whatsappConversations.phoneNumber, phoneNumber));
    return conversation;
  }

  async createWhatsappConversation(data: InsertWhatsappConversation): Promise<WhatsappConversation> {
    const [conversation] = await db.insert(whatsappConversations).values(data).returning();
    return conversation;
  }

  async updateWhatsappConversation(id: number, data: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation | undefined> {
    const [conversation] = await db.update(whatsappConversations).set({ ...data, updatedAt: new Date() }).where(eq(whatsappConversations.id, id)).returning();
    return conversation;
  }

  async deleteWhatsappConversation(id: number): Promise<boolean> {
    await db.delete(whatsappMessages).where(eq(whatsappMessages.conversationId, id));
    await db.delete(whatsappConversations).where(eq(whatsappConversations.id, id));
    return true;
  }

  // WhatsApp Messages
  async getWhatsappMessages(conversationId: number): Promise<WhatsappMessage[]> {
    return db.select().from(whatsappMessages).where(eq(whatsappMessages.conversationId, conversationId)).orderBy(whatsappMessages.createdAt);
  }

  async getWhatsappMessage(id: number): Promise<WhatsappMessage | undefined> {
    const [message] = await db.select().from(whatsappMessages).where(eq(whatsappMessages.id, id));
    return message;
  }

  async createWhatsappMessage(data: InsertWhatsappMessage): Promise<WhatsappMessage> {
    const [message] = await db.insert(whatsappMessages).values(data).returning();
    return message;
  }

  async updateWhatsappMessage(id: number, data: Partial<InsertWhatsappMessage>): Promise<WhatsappMessage | undefined> {
    const [message] = await db.update(whatsappMessages).set(data).where(eq(whatsappMessages.id, id)).returning();
    return message;
  }

  async updateWhatsappMessageStatus(id: number, status: string): Promise<WhatsappMessage | undefined> {
    const [message] = await db.update(whatsappMessages).set({ status, statusTimestamp: new Date() }).where(eq(whatsappMessages.id, id)).returning();
    return message;
  }

  // OAuth Tokens
  async getOauthToken(provider: string): Promise<OauthToken | undefined> {
    const [token] = await db.select().from(oauthTokens).where(eq(oauthTokens.provider, provider));
    return token;
  }

  async createOauthToken(data: InsertOauthToken): Promise<OauthToken> {
    const [token] = await db.insert(oauthTokens).values(data).returning();
    return token;
  }

  async updateOauthToken(id: number, data: Partial<InsertOauthToken>): Promise<OauthToken | undefined> {
    const [token] = await db.update(oauthTokens).set({ ...data, updatedAt: new Date() }).where(eq(oauthTokens.id, id)).returning();
    return token;
  }

  async upsertOauthToken(provider: string, data: Omit<InsertOauthToken, 'provider'>): Promise<OauthToken> {
    const existing = await this.getOauthToken(provider);
    if (existing) {
      const updated = await this.updateOauthToken(existing.id, { ...data, provider });
      return updated!;
    }
    return this.createOauthToken({ ...data, provider });
  }

  // Calendar Events
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return db.select().from(calendarEvents).orderBy(desc(calendarEvents.startDate));
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event;
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db.insert(calendarEvents).values(data).returning();
    return event;
  }

  async updateCalendarEvent(id: number, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const [event] = await db.update(calendarEvents).set(data).where(eq(calendarEvents.id, id)).returning();
    return event;
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    return true;
  }

  // Appointment Confirmations
  async getAppointmentConfirmations(): Promise<AppointmentConfirmation[]> {
    return db.select().from(appointmentConfirmations).orderBy(desc(appointmentConfirmations.createdAt));
  }

  async getAppointmentConfirmation(id: number): Promise<AppointmentConfirmation | undefined> {
    const [conf] = await db.select().from(appointmentConfirmations).where(eq(appointmentConfirmations.id, id));
    return conf;
  }

  async createAppointmentConfirmation(data: InsertAppointmentConfirmation): Promise<AppointmentConfirmation> {
    const [conf] = await db.insert(appointmentConfirmations).values(data).returning();
    return conf;
  }

  async updateAppointmentConfirmation(id: number, data: Partial<InsertAppointmentConfirmation>): Promise<AppointmentConfirmation | undefined> {
    const [conf] = await db.update(appointmentConfirmations).set(data).where(eq(appointmentConfirmations.id, id)).returning();
    return conf;
  }

  async deleteAppointmentConfirmation(id: number): Promise<boolean> {
    await db.delete(appointmentConfirmations).where(eq(appointmentConfirmations.id, id));
    return true;
  }

  // Notifiche
  async getNotifiche(includeArchived: boolean = false): Promise<Notifica[]> {
    if (includeArchived) {
      return db.select().from(notifiche).orderBy(desc(notifiche.createdAt));
    }
    return db.select().from(notifiche).where(eq(notifiche.archiviata, false)).orderBy(desc(notifiche.createdAt));
  }

  async getNotificheNonLette(): Promise<Notifica[]> {
    return db.select().from(notifiche)
      .where(and(eq(notifiche.letta, false), eq(notifiche.archiviata, false)))
      .orderBy(desc(notifiche.createdAt));
  }

  async getNotificaByEmailId(emailId: string): Promise<Notifica | undefined> {
    const [notifica] = await db.select().from(notifiche).where(eq(notifiche.emailId, emailId));
    return notifica;
  }

  async createNotifica(data: InsertNotifica): Promise<Notifica> {
    const [notifica] = await db.insert(notifiche).values(data).returning();
    return notifica;
  }

  async updateNotifica(id: number, data: Partial<InsertNotifica>): Promise<Notifica | undefined> {
    const [notifica] = await db.update(notifiche).set(data).where(eq(notifiche.id, id)).returning();
    return notifica;
  }

  async deleteNotifica(id: number): Promise<boolean> {
    await db.delete(notifiche).where(eq(notifiche.id, id));
    return true;
  }

  async getClienteByEmailOrPhone(email?: string, telefono?: string): Promise<Cliente | undefined> {
    if (email) {
      const [cliente] = await db.select().from(clienti).where(eq(clienti.email, email));
      if (cliente) return cliente;
    }
    if (telefono) {
      const [cliente] = await db.select().from(clienti).where(eq(clienti.telefono, telefono));
      if (cliente) return cliente;
    }
    return undefined;
  }

  async getImmobileByIdPortale(idPortale: string): Promise<Immobile | undefined> {
    const [immobile] = await db.select().from(immobili).where(eq(immobili.idPortale, idPortale));
    return immobile;
  }

  // Annunci Immobile (multi-agenzia)
  async getAnnunciImmobile(immobileEsternoId: number): Promise<AnnuncioImmobile[]> {
    return db.select().from(annunciImmobile)
      .where(eq(annunciImmobile.immobileEsternoId, immobileEsternoId))
      .orderBy(desc(annunciImmobile.dataRilevazione));
  }

  async createAnnuncioImmobile(data: InsertAnnuncioImmobile): Promise<AnnuncioImmobile> {
    const [annuncio] = await db.insert(annunciImmobile).values(data).returning();
    // Dopo aver creato l'annuncio, aggiorna lo stato multi-agenzia
    await this.updateMultiAgenziaStatus(data.immobileEsternoId);
    return annuncio;
  }

  async deleteAnnuncioImmobile(id: number): Promise<boolean> {
    // Prima recupera l'ID dell'immobile per aggiornare lo stato
    const [annuncio] = await db.select().from(annunciImmobile).where(eq(annunciImmobile.id, id));
    if (annuncio) {
      await db.delete(annunciImmobile).where(eq(annunciImmobile.id, id));
      await this.updateMultiAgenziaStatus(annuncio.immobileEsternoId);
    }
    return true;
  }

  async updateMultiAgenziaStatus(immobileEsternoId: number): Promise<boolean> {
    // Conta le agenzie uniche (nomi diversi e non nulli)
    const annunci = await db.select().from(annunciImmobile)
      .where(eq(annunciImmobile.immobileEsternoId, immobileEsternoId));
    
    const agenzieUniche = new Set(
      annunci
        .map(a => a.nomeAgenzia?.toLowerCase().trim())
        .filter(nome => nome && nome !== 'privato')
    );
    
    const isMultiAgenzia = agenzieUniche.size >= 2;
    
    await db.update(immobiliEsterni)
      .set({ multiAgenzia: isMultiAgenzia })
      .where(eq(immobiliEsterni.id, immobileEsternoId));
    
    return isMultiAgenzia;
  }
}

export const storage = new DatabaseStorage();
