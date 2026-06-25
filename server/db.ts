import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// In produzione Replit inietta una sua DATABASE_URL (DB interno vuoto): per usare il Supabase
// preferiamo SUPABASE_DB_URL se presente. Cosi' dev e produzione leggono lo stesso database.
if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
  throw new Error(
    "SUPABASE_DB_URL o DATABASE_URL devono essere impostati. Did you forget to provision a database?",
  );
}

const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL!;
const needsSsl = /supabase|sslmode=require/i.test(url);
if (needsSsl) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
export const pool = new Pool({
  connectionString: url,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });
