import { createHash, randomBytes } from "crypto";
import { db } from "../db";
import { apiKeys, users } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import type { ApiKey } from "@shared/schema";

const KEY_PREFIX = "paolo_live_";

/**
 * Genera una nuova API key (plaintext).
 * Formato: paolo_live_<32 char base64url> (40 chars totali after prefix).
 * Da mostrare UNA SOLA VOLTA al chiamante. Nel DB salviamo solo l'hash.
 */
export function generatePlaintextKey(): string {
  const raw = randomBytes(24); // 24 bytes = 32 char base64url
  const body = raw.toString("base64url");
  return `${KEY_PREFIX}${body}`;
}

/** Hash SHA-256 della chiave plaintext, hex-encoded. */
export function hashKey(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex");
}

/** Primi 8 caratteri visibili (per identificare la key senza esporre il resto). */
export function keyPrefix(plaintext: string): string {
  return plaintext.slice(0, KEY_PREFIX.length + 4); // es. "paolo_live_aB3x"
}

/**
 * Verifica una API key in input. Ritorna la riga DB se valida, null altrimenti.
 * Aggiorna automaticamente last_used_at.
 */
export async function validateApiKey(plaintext: string): Promise<ApiKey | null> {
  if (!plaintext || !plaintext.startsWith(KEY_PREFIX)) return null;
  const hash = hashKey(plaintext);

  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hash), eq(apiKeys.attivo, true)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  // Check scadenza
  if (row.expiresAt && row.expiresAt < new Date()) {
    return null;
  }

  // Aggiorna last_used_at (fire-and-forget, non blocchiamo la request)
  db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id)).catch(() => {});

  return row;
}
