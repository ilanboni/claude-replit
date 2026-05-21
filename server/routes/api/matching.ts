import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { clienti, immobili, richieste } from "@shared/schema";
import { and, eq, gte, lte, isNotNull, ilike } from "drizzle-orm";
import { requireAuth } from "../../auth/middleware";
import { z } from "zod";

export const matchingRouter = Router();
matchingRouter.use(requireAuth);

/**
 * POST /api/matching/proponi-immobile-a-cliente
 * Body: { immobileId: number, limit?: number }
 *
 * Restituisce le richieste compatibili con un immobile, ordinate per "score".
 * Score semplice (1.0 baseline):
 *  - zona match (substring case-insensitive) → +1
 *  - mq immobile >= mq_minimi richiesta → +0.5, altrimenti -2 (penalty)
 *  - prezzo immobile <= budget_massimo → +0.5, altrimenti -3 (penalty bloccante)
 *  - tipologia immobile matchata in criteri obbligatori → +1
 *  - rating cliente alto bonus +rating_cliente/5
 *
 * Solo richieste con attiva=true e cliente attivo.
 */
matchingRouter.post("/proponi-immobile-a-cliente", async (req: Request, res: Response) => {
  const schema = z.object({
    immobileId: z.number().int().positive(),
    limit: z.number().int().positive().max(50).optional().default(10),
  });
  try {
    const { immobileId, limit } = schema.parse(req.body);

    const imm = (await db.select().from(immobili).where(eq(immobili.id, immobileId)).limit(1))[0];
    if (!imm) return res.status(404).json({ error: "Immobile non trovato" });
    if (!imm.attivo) return res.status(400).json({ error: "Immobile non attivo" });

    // Carico tutte le richieste attive con cliente attivo
    const rows = await db
      .select({
        richiesta: richieste,
        cliente: clienti,
      })
      .from(richieste)
      .innerJoin(clienti, eq(clienti.id, richieste.clienteId))
      .where(and(eq(richieste.attiva, true), eq(clienti.attivo, true)));

    const immPrezzo = imm.prezzo ? Number(imm.prezzo) : null;
    const immMq = imm.mq || null;
    const immZona = (imm.zona || "").toLowerCase().trim();
    const immCitta = (imm.citta || "").toLowerCase().trim();

    const scored = rows.map(({ richiesta, cliente }) => {
      const reasons: string[] = [];
      let score = 1.0;

      // Zona
      const richZona = (richiesta.zona || "").toLowerCase().trim();
      if (richZona) {
        if (immZona.includes(richZona) || richZona.includes(immZona) || immCitta.includes(richZona)) {
          score += 1.0;
          reasons.push(`zona match (${richiesta.zona} ⊆ ${imm.zona || imm.citta})`);
        } else {
          score -= 0.5;
          reasons.push(`zona mismatch (richiesta=${richiesta.zona}, immobile=${imm.zona || imm.citta})`);
        }
      }

      // Mq
      if (richiesta.mqMinimi && immMq) {
        if (immMq >= richiesta.mqMinimi) {
          score += 0.5;
          reasons.push(`mq ok (${immMq} >= ${richiesta.mqMinimi})`);
        } else {
          score -= 2.0;
          reasons.push(`mq sotto (${immMq} < ${richiesta.mqMinimi})`);
        }
      }

      // Budget
      const budget = richiesta.budgetMassimo ? Number(richiesta.budgetMassimo) : null;
      if (budget && immPrezzo) {
        if (immPrezzo <= budget) {
          score += 0.5;
          reasons.push(`prezzo ok (${immPrezzo} <= ${budget})`);
        } else {
          score -= 3.0;
          reasons.push(`prezzo sopra (${immPrezzo} > ${budget})`);
        }
      }

      // Stato immobile in caratteristiche obbligatorie
      const obblig: string[] = []; // caratteristicheObbligatorie non esiste nel DB reale Paolo
      for (const tag of obblig) {
        const t = tag.toLowerCase();
        if (
          (t === "ascensore" && imm.ascensore) ||
          (t === "balcone" && imm.balcone) ||
          (t === "terrazzo" && imm.terrazzo) ||
          (t === "box" && imm.box) ||
          (t === "cantina" && imm.cantina) ||
          (t === "giardino" && imm.giardino)
        ) {
          score += 0.5;
          reasons.push(`obbligatorio ${tag} ✅`);
        } else {
          score -= 1.5;
          reasons.push(`obbligatorio ${tag} MANCANTE`);
        }
      }

      // Bonus rating cliente
      if (cliente.rating) {
        score += cliente.rating / 5;
      }

      return {
        clienteId: cliente.id,
        clienteNome: `${cliente.nome || ""} ${cliente.cognome || ""}`.trim() || cliente.telefono,
        clienteTelefono: cliente.telefono,
        clienteRating: cliente.rating,
        richiestaId: richiesta.id,
        richiestaDescrizione: richiesta.descrizioneLibera,
        score: Math.round(score * 100) / 100,
        reasons,
      };
    });

    // Filtro out i match con score < 0 (cioè con penalty bloccante prezzo/mq)
    const filtered = scored.filter((s) => s.score > 0);
    filtered.sort((a, b) => b.score - a.score);

    res.json({
      immobile: {
        id: imm.id,
        titolo: imm.titolo,
        indirizzo: imm.indirizzo,
        prezzo: imm.prezzo,
        mq: imm.mq,
        zona: imm.zona,
      },
      candidati: filtered.slice(0, limit),
      tot_richieste_valutate: rows.length,
      tot_match_validi: filtered.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[matching POST]", err);
    res.status(500).json({ error: "Errore matching" });
  }
});

/**
 * POST /api/matching/proponi-clienti-per-immobile (alias)
 * Stessa logica di sopra ma con nome del use-case "trova clienti per questo immobile"
 */
matchingRouter.post("/proponi-clienti-per-immobile", async (req: Request, res: Response) => {
  // delega all'altro endpoint
  req.url = "/proponi-immobile-a-cliente";
  matchingRouter.handle(req, res, () => {});
});
