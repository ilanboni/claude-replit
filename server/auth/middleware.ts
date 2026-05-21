import type { Request, Response, NextFunction } from "express";
import { validateApiKey } from "./api-keys";
import type { AuthPrincipal } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      principal?: AuthPrincipal;
    }
    // Tipizzazione di req.user dopo passport.deserialize
    interface User {
      id: number;
      email: string;
      role: string;
      nome?: string | null;
    }
  }
}

/**
 * Middleware: richiede autenticazione (session OAuth oppure X-API-Key header).
 * Popola req.principal con AuthPrincipal.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // 1) Session OAuth (utente loggato via Google)
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const u = req.user as Express.User;
    req.principal = {
      type: "user",
      userId: u.id,
      email: u.email,
      role: u.role,
    };
    return next();
  }

  // 2) API key in header
  const apiKey = req.header("X-API-Key") || "";
  if (apiKey) {
    try {
      const row = await validateApiKey(apiKey);
      if (row) {
        req.principal = {
          type: "api_key",
          apiKeyId: row.id,
          nome: row.nome,
          role: row.role,
        };
        return next();
      }
    } catch (err) {
      console.error("[auth] validateApiKey error:", err);
    }
  }

  return res.status(401).json({ error: "Unauthorized" });
}

/**
 * Middleware: richiede uno dei ruoli specificati.
 * Da usare DOPO requireAuth.
 */
export function requireRole(...roles: Array<"admin" | "agent" | "viewer">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.principal) return res.status(401).json({ error: "Unauthorized" });
    if (!roles.includes(req.principal.role as any)) {
      return res.status(403).json({ error: "Forbidden: insufficient role" });
    }
    return next();
  };
}
