import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// SSL config:
// - Supabase pooler richiede SSL ma node-postgres non gestisce automaticamente
//   il parametro ?sslmode=require nell'URL. Servono opzioni esplicite.
// - rejectUnauthorized: false evita errori di chain CA (Supabase usa cert signed).
// - Per heliumdb/Replit Managed Postgres SSL non serve: il blocco `ssl` viene
//   attivato solo se DATABASE_URL contiene "supabase" o "sslmode=require".
const url = process.env.DATABASE_URL!;
const needsSsl = /supabase|sslmode=require/i.test(url);
export const pool = new Pool({
  connectionString: url,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });
