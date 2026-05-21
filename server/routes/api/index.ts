import { Router } from "express";
import { clientiRouter } from "./clienti";
import { immobiliRouter } from "./immobili";
import { richiesteRouter } from "./richieste";
import { comunicazioniRouter } from "./comunicazioni";
import { documentiRouter } from "./documenti";
import { matchingRouter } from "./matching";
import { uploadRouter } from "./upload";

export const apiRouter = Router();

apiRouter.use("/clienti", clientiRouter);
apiRouter.use("/immobili", immobiliRouter);
apiRouter.use("/richieste", richiesteRouter);
apiRouter.use("/comunicazioni", comunicazioniRouter);
apiRouter.use("/documenti", documentiRouter);
apiRouter.use("/matching", matchingRouter);
apiRouter.use("/upload", uploadRouter);

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});
