/**
 * Dump completo del database heliumdb (Replit Managed Postgres).
 *
 * Usa la lib `pg` (gia' in dependencies del progetto) per:
 *  1) listare tutte le tabelle nello schema public
 *  2) per ogni tabella, leggere schema (column types) + dati
 *  3) generare uno script SQL completo importabile su Supabase
 *
 * Output: heliumdb-dump.sql + heliumdb-dump-summary.json
 *
 * Uso: node scripts/dump-helium.mjs
 */

import pg from "pg";
import fs from "fs";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("ERRORE: DATABASE_URL non settata");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Tabelle interne a Postgres da skippare
const SKIP_TABLES = new Set([
  "pg_stat_statements",
  "pg_stat_statements_info",
  "pg_buffercache",
]);

function quoteIdent(name) {
  return '"' + name.replace(/"/g, '""') + '"';
}

function escapeValue(v, type) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "bigint") return String(v);
  if (v instanceof Date) return "'" + v.toISOString() + "'";
  if (typeof v === "object") {
    // JSON or array
    return "'" + JSON.stringify(v).replace(/'/g, "''") + "'";
  }
  // String
  return "'" + String(v).replace(/'/g, "''") + "'";
}

async function listPublicTables() {
  const r = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return r.rows
    .map((x) => x.table_name)
    .filter((t) => !SKIP_TABLES.has(t));
}

async function getTableColumns(table) {
  const r = await pool.query(
    `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `,
    [table]
  );
  return r.rows;
}

async function getTableRowCount(table) {
  const r = await pool.query(
    `SELECT count(*)::int AS n FROM ${quoteIdent(table)}`
  );
  return r.rows[0].n;
}

async function dumpTable(table) {
  const r = await pool.query(`SELECT * FROM ${quoteIdent(table)}`);
  return r.rows;
}

async function getSequences() {
  const r = await pool.query(`
    SELECT sequence_name, last_value
    FROM information_schema.sequences s
    LEFT JOIN LATERAL (
      SELECT last_value FROM information_schema.sequences WHERE sequence_name = s.sequence_name
    ) lv ON true
    WHERE sequence_schema = 'public'
  `);
  return r.rows;
}

async function main() {
  console.log("Connessione heliumdb...");
  const tables = await listPublicTables();
  console.log(`Trovate ${tables.length} tabelle:\n  ${tables.join(", ")}\n`);

  const summary = { db: "heliumdb", tables: [], generated_at: new Date().toISOString() };
  const sqlParts = [];

  sqlParts.push("-- HELIUMDB DUMP");
  sqlParts.push(`-- Generated: ${new Date().toISOString()}`);
  sqlParts.push("-- ATTENZIONE: questo file contiene dati sensibili. NON committare.");
  sqlParts.push("");
  sqlParts.push("BEGIN;");
  sqlParts.push("");

  for (const t of tables) {
    try {
      const cols = await getTableColumns(t);
      const n = await getTableRowCount(t);
      console.log(`  ${t}: ${cols.length} cols, ${n} rows`);
      summary.tables.push({
        name: t,
        columns: cols.map((c) => ({ name: c.column_name, type: c.data_type })),
        row_count: n,
      });

      if (n === 0) {
        sqlParts.push(`-- Table ${t}: 0 rows`);
        sqlParts.push("");
        continue;
      }

      const rows = await dumpTable(t);
      const colNames = cols.map((c) => quoteIdent(c.column_name)).join(", ");
      const types = Object.fromEntries(cols.map((c) => [c.column_name, c.data_type]));

      sqlParts.push(`-- Table ${t}: ${rows.length} rows`);
      // Batch insert in gruppi di 100 per SQL piu' leggero
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const valuesSql = batch
          .map((row) => {
            const vals = cols
              .map((c) => escapeValue(row[c.column_name], types[c.column_name]))
              .join(", ");
            return `  (${vals})`;
          })
          .join(",\n");
        sqlParts.push(
          `INSERT INTO ${quoteIdent(t)} (${colNames}) VALUES\n${valuesSql}\nON CONFLICT DO NOTHING;`
        );
      }
      sqlParts.push("");
    } catch (e) {
      console.error(`  ${t}: ERROR ${e.message}`);
      summary.tables.push({ name: t, error: e.message });
      sqlParts.push(`-- Table ${t}: ERROR ${e.message}`);
      sqlParts.push("");
    }
  }

  sqlParts.push("COMMIT;");
  sqlParts.push("");

  const sql = sqlParts.join("\n");
  fs.writeFileSync("heliumdb-dump.sql", sql, "utf-8");
  fs.writeFileSync("heliumdb-dump-summary.json", JSON.stringify(summary, null, 2), "utf-8");

  console.log("\n=== Dump completato ===");
  console.log(`  heliumdb-dump.sql:           ${sql.length.toLocaleString()} chars`);
  console.log(`  heliumdb-dump-summary.json:  ${tables.length} tables`);
  console.log("\nTotale righe per tabella:");
  for (const t of summary.tables) {
    console.log(`  ${t.name.padEnd(35)} ${(t.row_count || "?").toString().padStart(8)}`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
