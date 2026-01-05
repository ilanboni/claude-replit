import { 
  clienti, richieste, immobili, comunicazioni, appuntamenti, matching,
  type Cliente, type InsertCliente,
  type Richiesta, type InsertRichiesta,
  type Immobile, type InsertImmobile,
  type Comunicazione, type InsertComunicazione,
  type Appuntamento, type InsertAppuntamento,
  type Matching, type InsertMatching,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

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
  createComunicazione(data: InsertComunicazione): Promise<Comunicazione>;

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
    const [immobile] = await db.insert(immobili).values(data).returning();
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
    const [match] = await db.insert(matching).values(data).returning();
    return match;
  }

  async updateMatching(id: number, data: Partial<InsertMatching>): Promise<Matching | undefined> {
    const [match] = await db
      .update(matching)
      .set(data)
      .where(eq(matching.id, id))
      .returning();
    return match;
  }

  async deleteMatchingByRichiesta(richiestaId: number): Promise<boolean> {
    await db.delete(matching).where(eq(matching.richiestaId, richiestaId));
    return true;
  }
}

export const storage = new DatabaseStorage();
