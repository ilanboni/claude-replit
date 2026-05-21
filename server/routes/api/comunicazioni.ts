import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { comunicazioni, insertComunicazioneSchema } from "@shared/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../../auth/middleware";
import { z } from "zod";

export const comunicazioniRouter = Router();
comunicazioniRouter.use(requireAuth);

function auditFields(req: Request) {
  const p = req.principal!;
  return p.type === "user"
    ? { createdByUserId: p.userId, createdByApiKeyId: null }
    : { createdByUserId: null, createdByApiKeyId: p.apiKeyId };
}

comunicazioniRouter.get("/", async (req: Request, res: Response) => {
  const clienteId = req.query.clienteId ? parseInt(req.query.clienteId as string, 10) : null;
  const immobileId = req.query.immobileId ? parseInt(req.query.immobileId as string, 10) : null;
  const tipo = req.query.tipo as string | undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || "100", 10), 500);

  const conditions = [];
  if (clienteId) conditions.push(eq(comunicazioni.clienteId, clienteId));
  if (immobileId) conditions.push(eq(comunicazioni.immobileId, immobileId));
  if (tipo) conditions.push(eq(comunicazioni.tipo, tipo));

  const rows = await db
    .select()
    .from(comunicazioni)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(comunicazioni.dataOra))
    .limit(limit);

  res.json({ data: rows, count: rows.length });
});

comunicazioniRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = insertComunicazioneSchema.parse(req.body);
    const [row] = await db.insert(comunicazioni).values({ ...data, ...auditFields(req) }).returning();
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[comunicazioni POST]", err);
    res.status(500).json({ error: "Errore registrazione comunicazione" });
  }
});

comunicazioniRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  const [row] = await db.delete(comunicazioni).where(eq(comunicazioni.id, id)).returning({ id: comunicazioni.id });
  if (!row) return res.status(404).json({ error: "Comunicazione non trovata" });
  res.json({ ok: true, id: row.id });
});
