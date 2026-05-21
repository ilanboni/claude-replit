import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { clienti, insertClienteSchema } from "@shared/schema";
import { and, eq, ilike, or, desc } from "drizzle-orm";
import { requireAuth } from "../../auth/middleware";
import { z } from "zod";

export const clientiRouter = Router();
clientiRouter.use(requireAuth);

/** Audit helper: estrae created_by_*_id dal principal */
function auditFields(req: Request) {
  const p = req.principal!;
  return p.type === "user"
    ? { createdByUserId: p.userId, createdByApiKeyId: null }
    : { createdByUserId: null, createdByApiKeyId: p.apiKeyId };
}

/** GET /api/clienti — lista paginata con filtri */
clientiRouter.get("/", async (req: Request, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim();
  const tipo = req.query.tipo as string | undefined;
  const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
  const offset = parseInt((req.query.offset as string) || "0", 10);

  const conditions = [eq(clienti.attivo, true)];
  if (search) {
    conditions.push(
      or(
        ilike(clienti.nome, `%${search}%`),
        ilike(clienti.cognome, `%${search}%`),
        ilike(clienti.telefono, `%${search}%`),
        ilike(clienti.email, `%${search}%`),
      )!,
    );
  }
  if (tipo) conditions.push(eq(clienti.tipoCliente, tipo));

  const rows = await db
    .select()
    .from(clienti)
    .where(and(...conditions))
    .orderBy(desc(clienti.updatedAt))
    .limit(limit)
    .offset(offset);

  res.json({ data: rows, limit, offset, count: rows.length });
});

/** GET /api/clienti/:id */
clientiRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  const row = (await db.select().from(clienti).where(eq(clienti.id, id)).limit(1))[0];
  if (!row) return res.status(404).json({ error: "Cliente non trovato" });
  res.json(row);
});

/** GET /api/clienti/by-phone/:phone — lookup veloce per telefono (chiave Paolo) */
clientiRouter.get("/by-phone/:phone", async (req: Request, res: Response) => {
  const phone = req.params.phone;
  const row = (await db.select().from(clienti).where(eq(clienti.telefono, phone)).limit(1))[0];
  if (!row) return res.status(404).json({ error: "Cliente non trovato" });
  res.json(row);
});

/** POST /api/clienti — crea */
clientiRouter.post("/", async (req: Request, res: Response) => {
  try {
    const data = insertClienteSchema.parse(req.body);
    const [row] = await db.insert(clienti).values({ ...data, ...auditFields(req) }).returning();
    res.status(201).json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[clienti POST]", err);
    res.status(500).json({ error: "Errore creazione cliente" });
  }
});

/** PATCH /api/clienti/:id — update parziale */
clientiRouter.patch("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  try {
    const partialSchema = insertClienteSchema.partial();
    const data = partialSchema.parse(req.body);
    const [row] = await db
      .update(clienti)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clienti.id, id))
      .returning();
    if (!row) return res.status(404).json({ error: "Cliente non trovato" });
    res.json(row);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[clienti PATCH]", err);
    res.status(500).json({ error: "Errore update cliente" });
  }
});

/** DELETE /api/clienti/:id — soft delete (attivo=false) */
clientiRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  const [row] = await db
    .update(clienti)
    .set({ attivo: false, updatedAt: new Date() })
    .where(eq(clienti.id, id))
    .returning({ id: clienti.id });
  if (!row) return res.status(404).json({ error: "Cliente non trovato" });
  res.json({ ok: true, id: row.id });
});
