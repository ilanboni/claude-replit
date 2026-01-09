import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { 
  insertClienteSchema, insertRichiestaSchema, insertImmobileSchema,
  insertComunicazioneSchema, insertAppuntamentoSchema, insertMatchingSchema,
  insertImmobileEsternoSchema, insertWhatsappCampaignSchema, insertCampaignMessageSchema,
  insertAttivitaClienteSchema, sendCommunicationSchema
} from "@shared/schema";
import { parseRequestWithAI, calculateMatchScore, generateAICoachMessage, parsePropertyListingWithAI, parsePropertyImageWithAI, generateAcquisitionMessage, generateMirroring, extractPropertyFacts } from "./ai-service";
import { whatsappWS } from "./websocket";
import { sendWhatsAppMessage, isUltraMsgConfigured, normalizeItalianPhone } from "./ultramsg";
import { getUnreadEmails, searchPortalEmails, parsePortalEmail, markAsRead, EmailMessage, sendEmail, isGmailConfigured } from "./gmail-service";
import { processChatbotMessage } from "./services/chatbotService";
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

  // Get comunicazioni for immobile esterno
  app.get("/api/acquisizione/:id/comunicazioni", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const comunicazioni = await storage.getComunicazioniByImmobileEsterno(id);
      res.json(comunicazioni);
    } catch (error) {
      console.error("Get comunicazioni by immobile esterno error:", error);
      res.status(500).json({ error: "Errore nel recupero delle comunicazioni" });
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
      const { MIRRORING_PROMPT, MIRRORING_CONFIG, DEFAULT_ACQUISITION_MESSAGE } = await import("./bot-config");
      
      // Build mirroring context using the new schema
      const testoAnnuncio = immobile.descrizione || immobile.titolo || 'Nessun testo disponibile';
      
      // Determine tipo_unita from camere count
      let tipoUnita: string | null = null;
      if (immobile.camere) {
        const camereNum = Number(immobile.camere);
        if (camereNum === 1) tipoUnita = "monolocale";
        else if (camereNum === 2) tipoUnita = "bilocale";
        else if (camereNum === 3) tipoUnita = "trilocale";
        else if (camereNum >= 4) tipoUnita = "quadrilocale";
      }
      
      // Determine zona_o_via
      const zonaOVia = immobile.zona || immobile.indirizzo || null;
      
      // Build context message for AI
      let context = `Testo annuncio:\n"${testoAnnuncio}"`;
      if (tipoUnita) context += `\n\nTipo unità: ${tipoUnita}`;
      if (zonaOVia) context += `\nZona o via: ${zonaOVia}`;
      
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

      // Build the complete message using the unified template
      const message = DEFAULT_ACQUISITION_MESSAGE.replace(/\{\{mirroring\}\}/g, mirroringText);
      res.json({ message });
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

      // Helper to normalize phone numbers for comparison
      const normalizePhone = (p: string) => p?.replace(/\D/g, '').replace(/^(0039|39)/, '') || '';
      const normalizedPhone = normalizePhone(phone);
      
      // Create or find client "Proprietario di [indirizzo]"
      const indirizzo = immobile.indirizzo || immobile.zona || "Immobile";
      
      // Check if client already exists by phone
      const clienti = await storage.getClienti();
      let cliente = clienti.find(c => normalizePhone(c.telefono || '') === normalizedPhone);
      
      if (!cliente) {
        // Create new client
        cliente = await storage.createCliente({
          nome: "Proprietario",
          cognome: indirizzo,
          telefono: normalizedPhone,
          email: immobile.contattoEmail || "",
          tipoCliente: "venditore",
          ratingCliente: 1,
          note: `Prospect da acquisizione: ${immobile.titolo || indirizzo}`,
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

      res.json({ 
        success: true, 
        messageId: result.messageId,
        cliente: cliente,
      });
    } catch (error) {
      console.error("Send WhatsApp error:", error);
      res.status(500).json({ success: false, error: "Errore nell'invio del messaggio" });
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

Ha notato il suo immobile in {{via}}.
Caratteristiche come {{caratteristiche}} sono oggi molto richieste da chi cerca immobili con potenzialità immediate, sia in termini di rendimento sia di stabilità del valore nel tempo.

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l'immobile: una decina di minuti per ascoltare la sua situazione, vedere l'appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
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

Ha notato il suo immobile in {{via}}.
{{mirroring}}

Il Dott. Boni vorrebbe capire se il suo immobile può inserirsi in un percorso di lavoro molto preciso.
Nel 2025 ha concluso 14 vendite e, negli ultimi anni, il suo metodo gli ha permesso di chiudere positivamente il 94% dei mandati affidati, mettendo gli acquirenti in concorrenza tra loro e non al ribasso contro il proprietario.

Se per Lei può essere utile, il Dott. Boni è disponibile per un breve incontro direttamente presso l'immobile: una decina di minuti per ascoltare la sua situazione, vedere l'appartamento e mostrarle la domanda reale sulla zona.

Nel frattempo può trovare informazioni sulla sua attività immobiliare e istituzionale anche online.

Può rispondere direttamente a questo messaggio, oppure contattarci allo 02 35981509 o a info@cavourimmobiliare.it.

Un cordiale saluto,

Sara
Assistente del Dott. Ilan Boni`;

      // Send messages with rate limiting
      let sentCount = 0;
      let failedCount = 0;
      const results: { phoneNumber: string; indirizzo: string; success: boolean; error?: string; mirroring?: string }[] = [];

      for (const property of uniquePropertiesToContact) {
        try {
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
  app.post("/api/bot/generate-initial-message", async (req, res) => {
    try {
      const { testoAnnuncio, titolo } = req.body;
      
      if (!testoAnnuncio) {
        return res.status(400).json({ error: "Testo annuncio richiesto" });
      }

      const { MIRRORING_PROMPT, MIRRORING_CONFIG, DEFAULT_ACQUISITION_MESSAGE } = await import("./bot-config");
      
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

      // Build the complete message using the unified template
      const message = DEFAULT_ACQUISITION_MESSAGE.replace(/\{\{mirroring\}\}/g, mirroringText);

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
        if (existingConv && messageId) {
          const existingMessages = await storage.getWhatsappMessages(existingConv.id);
          const alreadyExists = existingMessages.some(m => m.whatsappMessageId === messageId);
          if (alreadyExists) {
            return res.status(200).json({ status: "ignored", reason: "duplicate message" });
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

        // === BOT IA ACQUISIZIONE: Risposta automatica ===
        // Solo per messaggi IN ENTRATA (non outbound)
        if (!isOutbound && body) {
          try {
            // Cerca se esiste un campaign_message attivo per questo numero
            const normalizedPhone = normalizeItalianPhone(phoneNumber);
            const campaignMessages = await storage.getCampaignMessagesByPhone(normalizedPhone);
            
            // Trova il campaign message più recente con conversazione attiva
            const activeCampaignMessage = campaignMessages.find(cm => 
              cm.conversationActive !== false && cm.sentAt
            );

            if (activeCampaignMessage) {
              console.log(`[Bot IA] Found active campaign message ${activeCampaignMessage.id} for ${normalizedPhone}`);
              
              // Genera risposta del bot
              const botResponse = await processChatbotMessage(
                activeCampaignMessage.id,
                normalizedPhone,
                body
              );

              if (botResponse) {
                console.log(`[Bot IA] Generated response for ${normalizedPhone}: ${botResponse.substring(0, 100)}...`);
                
                // Invia la risposta via UltraMsg
                const sendResult = await sendWhatsAppMessage(normalizedPhone, botResponse);
                
                if (sendResult.success) {
                  console.log(`[Bot IA] Response sent successfully to ${normalizedPhone}`);
                  
                  // Salva il messaggio del bot nella conversazione
                  const botMessage = await storage.createWhatsappMessage({
                    conversationId: conversation.id,
                    whatsappMessageId: sendResult.messageId || null,
                    direction: "outbound",
                    messageType: "chat",
                    content: botResponse,
                    mediaUrl: null,
                    status: "sent"
                  });

                  // Aggiorna la conversazione con l'ultimo messaggio del bot
                  await storage.updateWhatsappConversation(conversation.id, {
                    ultimoMessaggio: botResponse.substring(0, 100),
                    ultimoMessaggioData: new Date()
                  });

                  // Notifica WebSocket
                  const finalConversation = await storage.getWhatsappConversation(conversation.id);
                  whatsappWS.notifyNewMessage(conversation.id, { ...botMessage, conversationId: conversation.id });
                  if (finalConversation) {
                    whatsappWS.notifyConversationUpdate({ ...finalConversation, conversationId: finalConversation.id });
                  }
                } else {
                  console.error(`[Bot IA] Failed to send response: ${sendResult.error}`);
                }
              }
            } else {
              console.log(`[Bot IA] No active campaign message for ${normalizedPhone}, skipping bot response`);
            }
          } catch (botError) {
            console.error("[Bot IA] Error processing bot response:", botError);
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
}
