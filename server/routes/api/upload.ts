import { Router, type Request, type Response } from "express";
import { requireAuth } from "../../auth/middleware";
import { z } from "zod";

export const uploadRouter = Router();
uploadRouter.use(requireAuth);

const BUCKET = "documents";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn(
    "[upload] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY mancanti — upload disabilitato",
  );
}

const requestUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(100),
  owner_type: z.enum(["immobile", "cliente", "comunicazione"]),
  owner_id: z.number().int().positive(),
  audience: z.enum(["cliente", "interno"]),
});

/** Sanitizza filename per uso come path */
function sanitizeFilename(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 200);
}

/**
 * POST /api/upload/request
 * Body: { filename, mime_type, owner_type, owner_id, audience }
 *
 * Restituisce:
 *   - signed_upload_url: URL pre-firmato a cui il client fa PUT del file binario
 *   - storage_path: path dentro il bucket (da salvare poi in documenti.storage_path)
 *   - public_url: URL pubblico (se audience='cliente') o signed read URL
 */
uploadRouter.post("/request", async (req: Request, res: Response) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.status(503).json({ error: "Storage non configurato" });
    }

    const d = requestUploadSchema.parse(req.body);

    // Agent (Paolo) può caricare solo audience='cliente'
    if (req.principal!.role === "agent" && d.audience !== "cliente") {
      return res.status(403).json({ error: "Agent può caricare solo documenti audience='cliente'" });
    }

    // Path convention: {audience}/{owner_type}/{owner_id}/{timestamp}_{filename}
    const ts = Date.now();
    const safeName = sanitizeFilename(d.filename);
    const storagePath = `${d.audience}/${d.owner_type}/${d.owner_id}/${ts}_${safeName}`;

    // Chiedi a Supabase Storage un upload signed URL
    // POST /storage/v1/object/upload/sign/{bucket}/{path}
    const signedUploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${storagePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );

    if (!signedUploadRes.ok) {
      const errText = await signedUploadRes.text();
      console.error("[upload/request] Supabase error:", errText);
      return res.status(500).json({ error: "Errore generazione signed URL", details: errText });
    }

    const { url: signedPath, token } = (await signedUploadRes.json()) as { url: string; token: string };

    res.json({
      storage_path: storagePath,
      bucket: BUCKET,
      mime_type: d.mime_type,
      // Upload URL completo per PUT diretto dal client
      upload_url: `${SUPABASE_URL}/storage/v1${signedPath}`,
      upload_token: token,
      // Il client farà:
      //   PUT upload_url
      //   Headers: { Authorization: `Bearer ${upload_token}`, "Content-Type": mime_type }
      //   Body: <file binary>
      // E dopo successful upload chiamerà POST /api/documenti con storage_path + metadata.
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[upload/request]", err);
    res.status(500).json({ error: "Errore upload request" });
  }
});

/**
 * POST /api/upload/sign-download
 * Body: { storage_path }
 *
 * Crea un signed URL temporaneo (15 min) per scaricare il file.
 * Filtri di accesso: agent può scaricare solo file in path che inizia con "cliente/".
 */
uploadRouter.post("/sign-download", async (req: Request, res: Response) => {
  try {
    const { storage_path } = z.object({ storage_path: z.string().min(1) }).parse(req.body);

    // Sicurezza: agent può accedere solo a path "cliente/..."
    if (req.principal!.role === "agent" && !storage_path.startsWith("cliente/")) {
      return res.status(403).json({ error: "Path non autorizzato per agent" });
    }

    const signedRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${storage_path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 900 }), // 15 minuti
      },
    );

    if (!signedRes.ok) {
      return res.status(500).json({ error: "Errore signing", details: await signedRes.text() });
    }
    const { signedURL } = (await signedRes.json()) as { signedURL: string };
    res.json({ download_url: `${SUPABASE_URL}/storage/v1${signedURL}` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "Validazione fallita", details: err.errors });
    }
    console.error("[upload/sign-download]", err);
    res.status(500).json({ error: "Errore signed download" });
  }
});
