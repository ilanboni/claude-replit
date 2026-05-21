import { Router, type Request, type Response } from "express";
import { pool } from "../../db";
import { requireAuth } from "../../auth/middleware";
import { z } from "zod";

export const documentiRouter = Router();
documentiRouter.use(requireAuth);

const documentSchema = z.object({
  immobile_id: z.number().int().nullable().optional(),
  cliente_id: z.number().int().nullable().optional(),
  comunicazione_id: z.number().int().nullable().optional(),
  tipo: z.string().min(1).max(50), // ape | planimetria | visura | contratto | foto | mandato | brochure | altro
  nome: z.string().min(1).max(255),
  audience: z.enum(["cliente", "interno"]).default("interno"),
  url: z.string().url().optional().nullable(),
  storage_path: z.string().optional().nullable(),
  dimensione_kb: z.number().int().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
}).refine(
  (d) => d.immobile_id != null || d.cliente_id != null || d.comunicazione_id != null,
  { message: "Almeno uno tra immobile_id, cliente_id, comunicazione_id deve essere valorizzato" }
);

function auditUserField(req: Request): { uploaded_by_user_id: number | null; uploaded_by_api_key_id: number | null } {
  const p = req.principal!;
  return p.type === "user"
    ? { uploaded_by_user_id: p.userId, uploaded_by_api_key_id: null }
    : { uploaded_by_user_id: null, uploaded_by_api_key_id: p.apiKeyId };
}

/** Restrizione automatica audience in base al ruolo:
 *  - agent (Paolo) vede SOLO audience='cliente'
 *  - admin/viewer vedono tutto (no filtro)
 */
function audienceFilterForPrincipal(req: Request): string | null {
  const p = req.principal!;
  if (p.role === "agent") return "cliente";
  return null;
}

/** POST /api/documenti */
documentiRouter.post("/", async (req: Request, res: Response) => {
  try {
    const d = documentSchema.parse(req.body);

    // Sicurezza: un agent non può creare documenti "interno"
    const p = req.principal!;
    if (p.role === "agent" && d.audience === "interno") {
      return res.status(403).json({ error: "Un service account non può caricare documenti interni" });
    }

    const audit = auditUserField(req);
    const result = await pool.query(
      `INSERT INTO public.documenti
       (immobile_id, cliente_id, comunicazione_id, tipo, nome, audience, url, storage_path,
        dimensione_kb, mime_type, note, uploaded_by_user_id, uploaded_by_api_key_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        d.immobile_id ?? null,
        d.cliente_id ?? null,
        d.comunicazione_id ?? null,
        d.tipo,
        d.nome,
        d.audience,
        d.url ?? null,
        d.storage_path ?? null,
        d.dimensione_kb ?? null,
        d.mime_type ?? null,
        d.note ?? null,
        audit.uploaded_by_user_id,
        audit.uploaded_by_api_key_id,
        p.type === "user" ? `user:${(p as any).email}` : `apikey:${(p as any).nome}`,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[documenti POST]", err);
    res.status(500).json({ error: "Errore registrazione documento" });
  }
});

/** GET /api/documenti — filtra automaticamente per role */
documentiRouter.get("/", async (req: Request, res: Response) => {
  const filters: string[] = [];
  const values: any[] = [];
  let idx = 1;

  for (const key of ["immobile_id", "cliente_id", "comunicazione_id"]) {
    if (req.query[key]) {
      const v = parseInt(req.query[key] as string, 10);
      if (!isNaN(v)) {
        filters.push(`${key} = $${idx++}`);
        values.push(v);
      }
    }
  }
  if (req.query.tipo) {
    filters.push(`tipo = $${idx++}`);
    values.push(req.query.tipo);
  }

  // Audience filter: forzato per agent, opzionale per admin/viewer
  const forced = audienceFilterForPrincipal(req);
  if (forced) {
    filters.push(`audience = $${idx++}`);
    values.push(forced);
  } else if (req.query.audience) {
    filters.push(`audience = $${idx++}`);
    values.push(req.query.audience);
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";
  const result = await pool.query(
    `SELECT * FROM public.documenti ${where} ORDER BY created_at DESC LIMIT 200`,
    values,
  );
  res.json({ data: result.rows, count: result.rowCount });
});

/** GET /api/documenti/:id */
documentiRouter.get("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });

  const forced = audienceFilterForPrincipal(req);
  const sql = forced
    ? `SELECT * FROM public.documenti WHERE id = $1 AND audience = $2`
    : `SELECT * FROM public.documenti WHERE id = $1`;
  const params = forced ? [id, forced] : [id];

  const result = await pool.query(sql, params);
  if (result.rows.length === 0) return res.status(404).json({ error: "Documento non trovato" });
  res.json(result.rows[0]);
});

/** DELETE /api/documenti/:id — agent NON può cancellare documenti interni (filter forzato) */
documentiRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });

  const forced = audienceFilterForPrincipal(req);
  const sql = forced
    ? `DELETE FROM public.documenti WHERE id = $1 AND audience = $2 RETURNING id, storage_path`
    : `DELETE FROM public.documenti WHERE id = $1 RETURNING id, storage_path`;
  const params = forced ? [id, forced] : [id];

  const result = await pool.query(sql, params);
  if (result.rows.length === 0) return res.status(404).json({ error: "Documento non trovato (o non accessibile)" });
  res.json({ ok: true, id: result.rows[0].id, storage_path_to_cleanup: result.rows[0].storage_path });
});
