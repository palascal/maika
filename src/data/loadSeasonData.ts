import { parseSeasonScoringFromUnknown, type SeasonScoringConfig } from "./seasonScoringConfigStorage";
import type { MatchesFile, PlayersFile } from "../domain/types";

const PLAYERS_URL = "/data/players.json";
const MATCHES_URL = "/data/matches.json";
const SCORING_URL = "/data/scoring-config.json";

export async function loadPlayers(): Promise<PlayersFile> {
  const res = await fetch(PLAYERS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Impossible de charger ${PLAYERS_URL}`);
  return (await res.json()) as PlayersFile;
}

export async function loadMatches(): Promise<MatchesFile> {
  const res = await fetch(MATCHES_URL);
  if (!res.ok) throw new Error(`Impossible de charger ${MATCHES_URL}`);
  return (await res.json()) as MatchesFile;
}

/** Charge la configuration des points / bonus (fichier optionnel : valeurs par défaut si 404). */
export async function loadScoringConfig(): Promise<SeasonScoringConfig> {
  try {
    const res = await fetch(SCORING_URL, { cache: "no-store" });
    if (!res.ok) return parseSeasonScoringFromUnknown(null);
    return parseSeasonScoringFromUnknown(await res.json());
  } catch {
    return parseSeasonScoringFromUnknown(null);
  }
}

export async function loadSeasonData(): Promise<{ players: PlayersFile; matches: MatchesFile; scoring: SeasonScoringConfig }> {
  const [players, matches, scoring] = await Promise.all([loadPlayers(), loadMatches(), loadScoringConfig()]);
  if (players.seasonId !== matches.seasonId) {
    console.warn("seasonId différent entre players.json et matches.json");
  }
  return { players, matches, scoring };
}
