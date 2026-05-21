import type { Express } from "express";
import passport from "passport";
import { buildSessionMiddleware } from "./session";
import { configurePassport } from "./passport";
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

  // Route pubbliche login/logout
  app.use("/auth", authRouter);

  // Route admin per gestione API key (solo admin)
  app.use("/api/admin/api-keys", adminApiKeysRouter);

  // Route business API (clienti, immobili, ecc.) — auth applicata nei router
  app.use("/api", apiRouter);
}
