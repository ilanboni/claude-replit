import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { immobili, insertImmobileSchema } from "@shared/schema";
import { and, eq, ilike, or, desc } from "drizzle-orm";
import { requireAuth } from "../../auth/middleware";
import { z } from "zod";

export const immobiliRouter = Router();
immobiliRouter.use(requireAuth);

function auditFields(req: Request) {
  const p = req.principal!;
  return p.type === "user"
    ? { createdByUserId: p.userId, createdByApiKeyId: null }
    : { createdByUserId: null, createdByApiKeyId: p.apiKeyId };
}

immobiliRouter.get("/", async (req: Request, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim();
  const statoVendita = req.query.statoVendita as string | undefined;
  const zona = req.query.zona as string | undefined;
  const origine = req.query.origine as string | undefined; // "mandato" | "acquisizione"
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
  const offset = parseInt((req.query.offset as string) || "0", 10);

  const conditions = [eq(immobili.attivo, true)];
  if (search) {
    conditions.push(
      or(
        ilike(immobili.titolo, `%${search}%`),
        ilike(immobili.indirizzo, `%${search}%`),
        ilike(immobili.zona, `%${search}%`),
      )!,
    );
  }
  if (statoVendita) conditions.push(eq(immobili.statoVendita, statoVendita));
  if (zona) conditions.push(ilike(immobili.zona, `%${zona}%`));
  if (origine) conditions.push(eq(immobili.origine, origine));

  const rows = await db
    .select()
    .from(immobili)
    .where(and(...conditions))
    .orderBy(desc(immobili.updatedAt))
    .limit(limit)
    .offset(offset);

  res.json({ data: rows, limit, offset, count: rows.length });
});

immobiliRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  const row = (await db.select().from(immobili).where(eq(immobili.id, id)).limit(1))[0];
  if (!row) return res.status(404).json({ error: "Immobile non trovato" });
  res.json(row);
});

immobiliRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = insertImmobileSchema.parse(req.body);
    const [row] = await db.insert(immobili).values({ ...data, ...auditFields(req) }).returning();
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[immobili POST]", err);
    res.status(500).json({ error: "Errore creazione immobile" });
  }
});

immobiliRouter.patch("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  try {
    const partialSchema = insertImmobileSchema.partial();
    const data = partialSchema.parse(req.body);
    const [row] = await db
      .update(immobili)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(immobili.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Immobile non trovato" });
    res.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[immobili PATCH]", err);
    res.status(500).json({ error: "Errore update immobile" });
  }
});

immobiliRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  const [row] = await db
    .update(immobili)
    .set({ attivo: false, updatedAt: new Date() })
    .where(eq(immobili.id, id))
    .returning({ id: immobili.id });
  if (!row) return res.status(404).json({ error: "Immobile non trovato" });
  res.json({ ok: true, id: row.id });
});
