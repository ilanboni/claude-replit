import { Router, type Request, type Response } from "express";
import { pool } from "../../db";
import { requireAuth } from "../../auth/middleware";
import { z } from "zod";

export const documentiRouter = Router();
documentiRouter.use(requireAuth);

// Validation schema per metadata documento (post-upload).
// L'upload binario su storage è gestito separatamente (vedi task #15).
const documentSchema = z.object({
  immobile_id: z.number().int().nullable().optional(),
  cliente_id: z.number().int().nullable().optional(),
  comunicazione_id: z.number().int().nullable().optional(),
  tipo: z.string().min(1).max(50), // ape | planimetria | visura | contratto | foto | mandato | altro
  nome: z.string().min(1).max(255),
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

/** POST /api/documenti — registra metadata documento */
documentiRouter.post("/", async (req: Request, res: Response) => {
  try {
    const d = documentSchema.parse(req.body);
    const audit = auditUserField(req);
    const result = await pool.query(
      `INSERT INTO public.documenti
       (immobile_id, cliente_id, comunicazione_id, tipo, nome, url, storage_path,
        dimensione_kb, mime_type, note, uploaded_by_user_id, uploaded_by_api_key_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        d.immobile_id ?? null,
        d.cliente_id ?? null,
        d.comunicazione_id ?? null,
        d.tipo,
        d.nome,
        d.url ?? null,
        d.storage_path ?? null,
        d.dimensione_kb ?? null,
        d.mime_type ?? null,
        d.note ?? null,
        audit.uploaded_by_user_id,
        audit.uploaded_by_api_key_id,
        req.principal!.type === "user" ? `user:${(req.principal as any).email}` : `apikey:${(req.principal as any).nome}`,
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

/** GET /api/documenti?immobile_id=X | cliente_id=X | comunicazione_id=X */
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
  const result = await pool.query(`SELECT * FROM public.documenti WHERE id = $1`, [id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Documento non trovato" });
  res.json(result.rows[0]);
});

/** DELETE /api/documenti/:id (hard delete metadata, l'oggetto storage va cancellato separato) */
documentiRouter.delete("/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: "id non valido" });
  const result = await pool.query(
    `DELETE FROM public.documenti WHERE id = $1 RETURNING id, storage_path`,
    [id],
  );
  if (result.rows.length === 0) return res.status(404).json({ error: "Documento non trovato" });
  res.json({ ok: true, id: result.rows[0].id, storage_path_to_cleanup: result.rows[0].storage_path });
});
