/**
 * CLI: crea una nuova API key (per Paolo agent o altri service account).
 *
 * USO:
 *   npm run create-api-key -- --nome "paolo_agent_prod" --role agent
 *   npm run create-api-key -- --nome "test_admin" --role admin --expires "2026-12-31"
 *
 * Output: il plaintext della key (mostrato UNA VOLTA — salvalo subito).
 */
import { db } from "../server/db";
import { apiKeys } from "../shared/schema";
import { generatePlaintextKey, hashKey, keyPrefix } from "../server/auth/api-keys";

function arg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1];
}

async function main() {
  const nome = arg("nome");
  const role = arg("role", "agent");
  const expires = arg("expires");

  if (!nome) {
    console.error("Uso: npm run create-api-key -- --nome NAME [--role admin|agent|viewer] [--expires YYYY-MM-DD]");
    process.exit(1);
  }
  if (!["admin", "agent", "viewer"].includes(role!)) {
    console.error("--role deve essere uno di: admin, agent, viewer");
    process.exit(1);
  }

  const plaintext = generatePlaintextKey();

  const [row] = await db
    .insert(apiKeys)
    .values({
      nome,
      keyHash: hashKey(plaintext),
      keyPrefix: keyPrefix(plaintext),
      role: role!,
      attivo: true,
      expiresAt: expires ? new Date(expires) : null,
    })
    .returning();

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" API KEY CREATA — salva SUBITO il plaintext sotto.");
  console.log(" Dopo questo output, plaintext non sara' piu' recuperabile.");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  id:        ${row.id}`);
  console.log(`  nome:      ${row.nome}`);
  console.log(`  role:      ${row.role}`);
  console.log(`  prefix:    ${row.keyPrefix}`);
  console.log(`  expires:   ${row.expiresAt?.toISOString() || "mai"}`);
  console.log(`\n  >>> PLAINTEXT: ${plaintext} <<<\n`);
  console.log("  Uso lato Paolo (responder.py):");
  console.log(`     headers = {"X-API-Key": "${plaintext}"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Errore:", err);
  process.exit(1);
});
