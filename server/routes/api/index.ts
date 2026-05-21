import { Router } from "express";
import { documentiRouter } from "./documenti";
import { matchingRouter } from "./matching";
import { uploadRouter } from "./upload";

/**
 * Router /api/* — SOLO ENDPOINT NUOVI introdotti da paolo-v2.
 *
 * NOTA: il vecchio server/routes.ts ha già rotte per:
 *   /api/clienti, /api/immobili, /api/richieste, /api/comunicazioni
 *   /api/tasks, /api/notifiche, /api/dashboard, /api/search, ...
 * Quelle le lasciamo invariate (response shape piatta che il frontend si aspetta).
 *
 * Qui montiamo SOLO le rotte aggiuntive (matching, upload, documenti polimorfico).
 */
export const apiRouter = Router();

apiRouter.use("/documenti", documentiRouter);   // documenti polimorfico (con audience + storage_path)
apiRouter.use("/matching", matchingRouter);     // matching immobile↔cliente (nuovo)
apiRouter.use("/upload", uploadRouter);         // signed URL Supabase Storage (nuovo)

// Health check (no auth)
apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});
