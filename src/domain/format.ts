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

/** Ex. 2026-04-25 → « vendredi 25 avril » (sans année). */
export function formatDateDayMonthFr(isoDay: string): string {
  const m = isoDay.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDay;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return isoDay;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dt.getTime())) return isoDay;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dt);
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

/** Heures proposées pour une nouvelle partie (9h–22h). */
export const MATCH_HOUR_DAY_RANGE: readonly string[] = (() => {
  const out: string[] = [];
  for (let h = 9; h <= 22; h++) out.push(String(h).padStart(2, "0"));
  return out;
})();

export function playerFullName(p: Player): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

/** Nom puis prénom (ex. administration des joueurs). */
export function playerLastFirstName(p: Player): string {
  return `${p.lastName} ${p.firstName}`.trim();
}

/** Ex. « Dupond T » — nom + initiale du prénom (listes / classements, fratries). */
export function playerCompactName(p: Player): string {
  const ln = p.lastName.trim();
  const fn = p.firstName.trim();
  if (!ln && !fn) return p.id;
  if (!fn) return ln;
  const firstChar = [...fn][0] ?? "";
  const initial = firstChar ? firstChar.toLocaleUpperCase("fr-FR") : "";
  if (!ln) return fn;
  return `${ln} ${initial}`;
}

export function playerById(players: Player[]): Map<PlayerId, Player> {
  return new Map(players.map((p) => [p.id, p]));
}

export function formatTeamLabel(team: DoublesTeam, map: Map<PlayerId, Player>): string {
  const [a, b] = team;
  const pa = map.get(a);
  const pb = map.get(b);
  const na = pa ? playerCompactName(pa) : a;
  const nb = pb ? playerCompactName(pb) : b;
  return `${na}\u00a0·\u00a0${nb}`;
}

export function formatMatchLine(m: Match, map: Map<PlayerId, Player>): string {
  const t1 = formatTeamLabel(m.teamA, map);
  const t2 = formatTeamLabel(m.teamB, map);
  if (hasPeloteScore(m)) {
    return `${t1} (${m.scoreTeamA}) · ${t2} (${m.scoreTeamB})`;
  }
  return `${t1} · ${t2}`;
}
