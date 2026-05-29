import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const url = process.env.DATABASE_URL!;
const needsSsl = /supabase|sslmode=require/i.test(url);
if (needsSsl) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
export const pool = new Pool({
  connectionString: url,
  ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });
