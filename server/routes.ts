import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { 
  insertClienteSchema, insertRichiestaSchema, insertImmobileSchema,
  insertComunicazioneSchema, insertAppuntamentoSchema, insertMatchingSchema
} from "@shared/schema";
import { parseRequestWithAI, calculateMatchScore, generateAICoachMessage } from "./ai-service";

export async function registerRoutes(server: Server, app: Express): Promise<void> {
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

  app.post("/api/richieste", async (req, res) => {
    try {
      const parsed = insertRichiestaSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dati non validi", details: parsed.error });
      }
      const richiesta = await storage.createRichiesta(parsed.data);
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
      const richiesta = await storage.updateRichiesta(id, parsed.data);
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

  // ==================== COMUNICAZIONI ====================
  app.get("/api/comunicazioni", async (req, res) => {
    try {
      const clienteId = req.query.clienteId ? parseInt(req.query.clienteId as string) : undefined;
      const comunicazioni = await storage.getComunicazioni(clienteId);
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
      const comunicazione = await storage.createComunicazione(parsed.data);
      res.status(201).json(comunicazione);
    } catch (error) {
      console.error("Create comunicazione error:", error);
      res.status(500).json({ error: "Errore nella creazione della comunicazione" });
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
}
