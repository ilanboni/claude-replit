import type { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { buildSessionMiddleware } from "./session";
import { configurePassport } from "./passport";
import { requireAuth } from "./middleware";
import { authRouter } from "../routes/auth";
import { adminApiKeysRouter } from "../routes/admin-api-keys";
import { apiRouter } from "../routes/api";

/**
 * Monta sessione + passport + auth + api routes.
 * Va chiamata UNA volta in server/index.ts DOPO express.json/urlencoded
 * e PRIMA di registerRoutes() / catch-all.
 */
export function setupAuth(app: Express) {
  app.use(buildSessionMiddleware());
  app.use(passport.initialize());
  app.use(passport.session());

  configurePassport();

  // Route pubbliche login/logout (no auth richiesta)
  app.use("/auth", authRouter);

  // ─── PROTEZIONE GLOBALE /api/* ──────────────────────────────────────
  // Tutti gli endpoint /api/* richiedono autenticazione (session OAuth | X-API-Key).
  // Eccezione: /api/health (ping pubblico per health check).
  // Questa protezione copre sia le rotte mie (apiRouter sotto) sia quelle del
  // vecchio server/routes.ts (montate da registerRoutes() dopo).
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/health" || req.path === "/health/") return next();
    return requireAuth(req, res, next);
  });

  // Route admin (solo admin role) — protetta sia dal middleware sopra che da requireRole nei singoli endpoint
  app.use("/api/admin/api-keys", adminApiKeysRouter);

  // Route business aggiuntive (matching, upload, documenti polimorfico)
  app.use("/api", apiRouter);
}
