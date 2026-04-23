import type { Match } from "./types";

export function hasPeloteScore(m: Match): boolean {
  return typeof m.scoreTeamA === "number" && typeof m.scoreTeamB === "number";
}

/** Affichage type « 40 – 25 » (équipe A – équipe B). */
export function formatPeloteScore(m: Match): string | null {
  if (!hasPeloteScore(m)) return null;
  return `${m.scoreTeamA} – ${m.scoreTeamB}`;
}

/** Vainqueur déduit du score ; null si égalité ou scores absents. */
export function peloteWinner(m: Match): "A" | "B" | null {
  if (!hasPeloteScore(m)) return null;
  if (m.scoreTeamA! > m.scoreTeamB!) return "A";
  if (m.scoreTeamB! > m.scoreTeamA!) return "B";
  return null;
}
