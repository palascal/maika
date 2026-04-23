import type { DoublesTeam, Match, Player, PlayerId } from "./types";
import { hasPeloteScore } from "./matchScore";

const MOIS_FR_LONG = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
] as const;

/** Ex. 2026-04-14 → « 14 Avril 2026 » */
export function formatDateLongFr(isoDay: string): string {
  const m = isoDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDay;
  const year = m[1];
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (monthIndex < 0 || monthIndex > 11) return isoDay;
  return `${day} ${MOIS_FR_LONG[monthIndex]} ${year}`;
}

/** Affichage heure partie seule (pas de minutes) : 17h. Accepte « 17 », « 17:00 », etc. */
export function formatMatchHourDisplay(raw: string | undefined): string {
  if (raw == null || raw.trim() === "") return "";
  const head = raw.trim().split(":")[0] ?? "";
  const h = Number(head);
  if (!Number.isFinite(h) || h < 0 || h > 23) return raw.trim();
  return `${h}h`;
}

/** Valeur normalisée pour stockage / select : « 00 » … « 23 », ou chaîne vide. */
export function normalizeMatchHour(raw: string | undefined): string {
  if (raw == null || raw.trim() === "") return "";
  const h = Number(raw.trim().split(":")[0]);
  if (!Number.isFinite(h) || h < 0 || h > 23) return "";
  return String(h).padStart(2, "0");
}

/** Heures entières proposées dans les formulaires (00h–23h). */
export const MATCH_HOUR_VALUES: readonly string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h <= 23; h++) out.push(String(h).padStart(2, "0"));
  return out;
})();

export function playerFullName(p: Player): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function playerById(players: Player[]): Map<PlayerId, Player> {
  return new Map(players.map((p) => [p.id, p]));
}

export function formatTeamLabel(team: DoublesTeam, map: Map<PlayerId, Player>): string {
  const [a, b] = team;
  const pa = map.get(a);
  const pb = map.get(b);
  const na = pa ? playerFullName(pa) : a;
  const nb = pb ? playerFullName(pb) : b;
  return `${na} / ${nb}`;
}

export function formatMatchLine(m: Match, map: Map<PlayerId, Player>): string {
  const t1 = formatTeamLabel(m.teamA, map);
  const t2 = formatTeamLabel(m.teamB, map);
  if (hasPeloteScore(m)) {
    return `${t1} (${m.scoreTeamA}) · ${t2} (${m.scoreTeamB})`;
  }
  return `${t1} · ${t2}`;
}
