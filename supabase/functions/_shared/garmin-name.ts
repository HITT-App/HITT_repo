// Everything HIIT sends to Garmin is named "HIIT <name>" so it stands out on the watch.
export function hiitName(name: string | null | undefined, fallback: string): string {
  const base = (name ?? "").trim() || fallback;
  return /^hiit\b/i.test(base) ? base : `HIIT ${base}`;
}
