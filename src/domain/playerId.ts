import type { Player } from "./types";

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Identifiant URL-friendly à partir du prénom et du nom. */
export function basePlayerSlug(firstName: string, lastName: string): string {
  const part = (s: string) =>
    stripDiacritics(s.trim().toLowerCase())
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const a = part(firstName);
  const b = part(lastName);
  const slug = [a, b].filter(Boolean).join("-");
  return slug.length > 0 ? slug : "joueur";
}

export function uniquePlayerId(firstName: string, lastName: string, existingIds: Set<string>): string {
  let base = basePlayerSlug(firstName, lastName);
  if (!existingIds.has(base)) return base;
  let n = 2;
  while (existingIds.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function collectPlayerIds(players: Player[]): Set<string> {
  return new Set(players.map((p) => p.id));
}
