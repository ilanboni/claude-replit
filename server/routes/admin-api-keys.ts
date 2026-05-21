import { Router, type Request, type Response } from "express";
import { db } from "../db";
import { apiKeys } from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../auth/middleware";
import { generatePlaintextKey, hashKey, keyPrefix } from "../auth/api-keys";

export const adminApiKeysRouter = Router();

// Tutte le route richiedono autenticazione + ruolo admin
adminApiKeysRouter.use(requireAuth, requireRole("admin"));

/**
 * POST /api/admin/api-keys
 * Body: { nome: string, role?: "admin"|"agent"|"viewer", expiresAt?: ISO date }
 * Restituisce { id, plaintext, prefix, ... } UNA SOLA VOLTA.
 */
adminApiKeysRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { nome, role = "agent", expiresAt } = req.body || {};
    if (!nome || typeof nome !== "string") {
      return res.status(400).json({ error: "nome richiesto" });
    }
    if (!["admin", "agent", "viewer"].includes(role)) {
      return res.status(400).json({ error: "role non valido" });
    }

    const plaintext = generatePlaintextKey();
    const principal = req.principal!;
    const createdBy = principal.type === "user" ? principal.userId : null;

    const [row] = await db
      .insert(apiKeys)
      .values({
        nome,
        keyHash: hashKey(plaintext),
        keyPrefix: keyPrefix(plaintext),
        role,
        attivo: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdByUserId: createdBy,
      })
      .returning();

    res.status(201).json({
      id: row.id,
      nome: row.nome,
      role: row.role,
      keyPrefix: row.keyPrefix,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      // ATTENZIONE: plaintext mostrato UNA SOLA VOLTA. Salvalo subito.
      plaintext,
    });
  } catch (err) {
    console.error("[admin-api-keys] create error:", err);
    res.status(500).json({ error: "Errore creazione API key" });
  }
});

/** GET /api/admin/api-keys → lista (senza plaintext). */
adminApiKeysRouter.get("/", async (_req: Request, res: Response) => {
  const rows = await db
    .select({
      id: apiKeys.id,
      nome: apiKeys.nome,
      keyPrefix: apiKeys.keyPrefix,
      role: apiKeys.role,
      attivo: apiKeys.attivo,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      createdAt: apiKeys.createdAt,
      createdByUserId: apiKeys.createdByUserId,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));
  res.json(rows);
});

/** DELETE /api/admin/api-keys/:id → revoca (soft, attivo=false). */
adminApiKeysRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });

  const result = await db
    .update(apiKeys)
    .set({ attivo: false })
    .where(eq(apiKeys.id, id))
    .returning({ id: apiKeys.id });

  if (result.length === 0) return res.status(404).json({ error: "API key non trovata" });
  res.json({ ok: true, revokedId: result[0].id });
});
