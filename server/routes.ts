import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { 
  insertClienteSchema, insertRichiestaSchema, insertImmobileSchema,
  insertComunicazioneSchema, insertAppuntamentoSchema, insertMatchingSchema,
  insertImmobileEsternoSchema, insertWhatsappCampaignSchema, insertCampaignMessageSchema
} from "@shared/schema";
import { parseRequestWithAI, calculateMatchScore, generateAICoachMessage, parsePropertyListingWithAI, parsePropertyImageWithAI, generateAcquisitionMessage } from "./ai-service";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
const execAsync = promisify(exec);

export async function registerRoutes(server: Server, app: Express): Promise<void> {
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
      const [clienti, appuntamenti] = await Promise.all([
        storage.getClienti(),
        storage.getAppuntamenti(),
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
          };
        });

      res.json([...appuntamentiImminenti, ...compleanni].sort((a, b) => 
        new Date(a.data).getTime() - new Date(b.data).getTime()
      ));
    } catch (error) {
      console.error("Notifiche error:", error);
      res.status(500).json({ error: "Errore nel recupero delle notifiche" });
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

  // Matching per Immobile
  app.get("/api/immobili/:id/matching", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const matchingList = await storage.getMatchingByImmobile(id);
      res.json(matchingList);
    } catch (error) {
      console.error("Get matching by immobile error:", error);
      res.status(500).json({ error: "Errore nel recupero dei matching" });
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

  // ==================== ACQUISIZIONE (Immobili Esterni) ====================
  
  // Get all external properties
  app.get("/api/acquisizione", async (req, res) => {
    try {
      const preferiti = req.query.preferiti === 'true' ? true : req.query.preferiti === 'false' ? false : undefined;
      const immobili = await storage.getImmobiliEsterni(preferiti);
      res.json(immobili);
    } catch (error) {
      console.error("Get acquisizione error:", error);
      res.status(500).json({ error: "Errore nel recupero degli immobili esterni" });
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
        contattoTelefono: parsedData.contattoTelefono ? String(parsedData.contattoTelefono).substring(0, 50) : undefined,
        contattoEmail: parsedData.contattoEmail ? String(parsedData.contattoEmail).substring(0, 200) : undefined,
        urlAnnuncio: parsedData.url ? String(parsedData.url).substring(0, 1000) : undefined,
        testoOriginale: parsedData.testoCompleto ? String(parsedData.testoCompleto).substring(0, 5000) : undefined,
        fonte: parsedData.fonte || (parsedData.url ? new URL(String(parsedData.url)).hostname.replace("www.", "") : "estensione"),
        caratteristiche: typeof parsedData.caratteristiche === "object" ? parsedData.caratteristiche : undefined,
      };
      
      // Validate with schema
      const validated = insertImmobileEsternoSchema.safeParse(immobileData);
      if (!validated.success) {
        console.error("Extension data validation failed:", validated.error);
        return res.status(400).json({ error: "Dati non validi", details: validated.error.flatten() });
      }
      
      const immobile = await storage.createImmobileEsterno(validated.data);
      res.status(201).json({ success: true, id: immobile.id, message: "Annuncio importato con successo" });
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
      
      // Create immobile with clienteId if we have a prospect
      const immobileData = clienteProspect 
        ? { ...parsed.data, clienteId: clienteProspect.id }
        : parsed.data;
      
      const immobile = await storage.createImmobileEsterno(immobileData);
      
      res.status(201).json({ immobile, clienteProspect });
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
      const immobile = await storage.updateImmobileEsterno(id, parsed.data);
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

  // Generate personalized acquisition message with automatic mirroring
  app.post("/api/acquisizione/:id/generate-message", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { template } = req.body;
      
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }

      // First, generate mirroring phrases from the listing
      const { MIRRORING_PROMPT } = await import("./bot-config");
      
      let context = `Testo annuncio:\n"${immobile.descrizione || immobile.titolo || 'Nessun testo disponibile'}"`;
      
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
      
      if (campiEstratti.length > 0) {
        context += `\n\nCampi già estratti:\n${campiEstratti.join("\n")}`;
      }

      const OpenAI = (await import("openai")).default;
      const openaiClient = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      const mirroringResponse = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: MIRRORING_PROMPT },
          { role: "user", content: context }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const mirroringText = mirroringResponse.choices[0]?.message?.content?.trim() || "";

      // Now generate the full message with mirroring included
      const message = await generateAcquisitionMessage(immobile, template, mirroringText);
      res.json({ message });
    } catch (error) {
      console.error("Generate message error:", error);
      res.status(500).json({ error: "Errore nella generazione del messaggio" });
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
      
      if (campiEstratti.length > 0) {
        context += `\n\nCampi già estratti:\n${campiEstratti.join("\n")}`;
      }

      const OpenAI = (await import("openai")).default;
      const openaiClient = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: MIRRORING_PROMPT },
          { role: "user", content: context }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const mirroring = response.choices[0]?.message?.content?.trim() || "";
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

  // Generate initial message with AI mirroring for simulation
  app.post("/api/bot/generate-initial-message", async (req, res) => {
    try {
      const { testoAnnuncio, titolo } = req.body;
      
      if (!testoAnnuncio) {
        return res.status(400).json({ error: "Testo annuncio richiesto" });
      }

      const { MIRRORING_PROMPT } = await import("./bot-config");
      
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
      
      // Generate mirroring phrases
      const mirroringResponse = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: MIRRORING_PROMPT },
          { role: "user", content: context }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const mirroringText = mirroringResponse.choices[0]?.message?.content?.trim() || "";

      // Extract address from testoAnnuncio
      const viaMatch = testoAnnuncio.match(/(?:via|viale|piazza|corso)\s+[A-Za-zÀ-ÿ\s]+(?:\d+)?/i);
      const via = viaMatch ? viaMatch[0].trim() : titolo || "zona";

      // Build the complete message with mirroring
      const message = `Gentile Proprietario,
sono l'assistente del Dott. Ilan Boni.

Il Dott. Boni è agente immobiliare da oltre trent'anni, proprietario di due agenzie a Milano e Vicepresidente della Comunità Ebraica di Milano. La sua attività lo porta ogni giorno a confrontarsi con investitori italiani e stranieri che guardano a Milano come a un'opportunità concreta, spesso legata alla flat tax.

Ha notato il suo immobile in ${via}.
${mirroringText}

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l'immobile: una decina di minuti per ascoltare la sua situazione, vedere l'appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni`;

      res.json({ message });
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
}
