import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db";

export function buildSessionMiddleware() {
  const PgStore = connectPgSimple(session);
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var richiesta");
  }
  return session({
    store: new PgStore({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 giorni
    },
    name: "immogest.sid",
  });
}
