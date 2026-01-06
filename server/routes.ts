import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { 
  insertClienteSchema, insertRichiestaSchema, insertImmobileSchema,
  insertComunicazioneSchema, insertAppuntamentoSchema, insertMatchingSchema,
  insertImmobileEsternoSchema
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

  // Parse PDF with text extraction + AI
  app.post("/api/acquisizione/parse-pdf", async (req, res) => {
    try {
      const { pdfBase64, pdfText } = req.body;
      
      // If frontend already extracted text (preferred)
      if (pdfText && typeof pdfText === "string" && pdfText.trim().length > 50) {
        const parsed = await parsePropertyListingWithAI(pdfText);
        return res.json(flattenAIResponse(parsed));
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
        res.json(flattenAIResponse(parsed));
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
      const normalizedPhone = contattoTelefono?.replace(/\s+/g, '').trim();
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

  // Generate personalized acquisition message
  app.post("/api/acquisizione/:id/generate-message", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { template } = req.body;
      
      const immobile = await storage.getImmobileEsterno(id);
      if (!immobile) {
        return res.status(404).json({ error: "Immobile non trovato" });
      }

      const message = await generateAcquisitionMessage(immobile, template);
      res.json({ message });
    } catch (error) {
      console.error("Generate message error:", error);
      res.status(500).json({ error: "Errore nella generazione del messaggio" });
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
}
