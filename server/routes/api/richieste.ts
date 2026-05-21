import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { richieste, insertRichiestaSchema } from "@shared/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth } from "../../auth/middleware";
import { z } from "zod";

export const richiesteRouter = Router();
richiesteRouter.use(requireAuth);

function auditFields(req: Request) {
  const p = req.principal!;
  return p.type === "user"
    ? { createdByUserId: p.userId, createdByApiKeyId: null }
    : { createdByUserId: null, createdByApiKeyId: p.apiKeyId };
}

richiesteRouter.get("/", async (req: Request, res: Response) => {
  const clienteId = req.query.clienteId ? parseInt(req.query.clienteId as string, 10) : null;
  const conditions = [eq(richieste.attiva, true)];
  if (clienteId) conditions.push(eq(richieste.clienteId, clienteId));

  const rows = await db
    .select()
    .from(richieste)
    .where(and(...conditions))
    .orderBy(desc(richieste.createdAt));

  res.json({ data: rows, count: rows.length });
});

richiesteRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  const row = (await db.select().from(richieste).where(eq(richieste.id, id)).limit(1))[0];
  if (!row) return res.status(404).json({ error: "Richiesta non trovata" });
  res.json(row);
});

richiesteRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = insertRichiestaSchema.parse(req.body);
    const [row] = await db.insert(richieste).values({ ...data, ...auditFields(req) }).returning();
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[richieste POST]", err);
    res.status(500).json({ error: "Errore creazione richiesta" });
  }
});

richiesteRouter.patch("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  try {
    const partialSchema = insertRichiestaSchema.partial();
    const data = partialSchema.parse(req.body);
    const [row] = await db
      .update(richieste)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(richieste.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Richiesta non trovata" });
    res.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[richieste PATCH]", err);
    res.status(500).json({ error: "Errore update richiesta" });
  }
});

richiesteRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  const [row] = await db
    .update(richieste)
    .set({ attiva: false, updatedAt: new Date() })
    .where(eq(richieste.id, id))
    .returning({ id: richieste.id });
  if (!row) return res.status(404).json({ error: "Richiesta non trovata" });
  res.json({ ok: true, id: row.id });
});
