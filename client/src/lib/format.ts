/**
 * Formatter condivisi lato client (riproducono _fmt_tel / _fmt_money_short del backend Python).
 */

/** Telefono con un solo prefisso "+" (evita il bug "++39..."). */
export function fmtTel(t?: string | null): string {
  if (t == null) return "";
  const d = String(t).replace(/\D/g, "");
  if (!d) return String(t).trim();
  // numero italiano: assicura prefisso 39, poi un solo "+"
  const norm = d.startsWith("39") ? d : (d.length >= 9 ? "39" + d : d);
  return "+" + norm;
}

/** Link wa.me a partire da un telefono in qualsiasi formato. */
export function waLink(t?: string | null): string {
  const d = String(t || "").replace(/\D/g, "");
  const norm = d.startsWith("39") ? d : (d.length >= 9 ? "39" + d : d);
  return "https://wa.me/" + norm;
}

/** Prezzo compatto: 450000 -> "€450k". */
export function fmtMoneyShort(v?: number | string | null): string {
  const n = Math.round(Number(v) || 0);
  if (!n) return "n/d";
  if (n >= 1000) return "€" + Math.round(n / 1000) + "k";
  return "€" + n;
}
