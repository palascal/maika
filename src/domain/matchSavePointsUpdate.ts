import {
  matchIsPlayedWithScores,
  matchPointDeltasForPlayedMatch,
  matchScoringPayload,
  type MatchPointScoringRules,
} from "./matchPointScoring";
import type { Match, Player, PlayerId, PlayersFile } from "./types";

export interface MatchSaveScoringInput {
  rules: MatchPointScoringRules;
  startingSeasonPoints: number;
}

function sortPlayedChronoAsc(matches: Match[]): Match[] {
  return matches.filter(matchIsPlayedWithScores).slice().sort((a, b) => {
    const c = a.date.localeCompare(b.date);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });
}

/** Points de chaque joueur juste avant l’application de `matchId` (parties jouées antérieures, base = points de départ). */
export function buildPointsMapBeforeMatchId(
  matchId: string,
  allMatches: Match[],
  playersFile: Pick<PlayersFile, "players">,
  rules: MatchPointScoringRules,
  startingSeasonPoints: number,
): Map<PlayerId, number> {
  const played = sortPlayedChronoAsc(allMatches);
  const start = Number.isFinite(startingSeasonPoints) ? Math.round(startingSeasonPoints) : 0;
  const points = new Map<PlayerId, number>(playersFile.players.map((p) => [p.id, start]));
  for (const m of played) {
    if (m.id === matchId) break;
    const d = matchPointDeltasForPlayedMatch(m, points, rules);
    for (const [id, dv] of d) {
      if (points.has(id)) points.set(id, (points.get(id) ?? 0) + dv);
    }
  }
  return points;
}

function deltasStoredOrReplay(
  m: Match,
  allMatchesPrev: Match[],
  playersFile: Pick<PlayersFile, "players">,
  cfg: MatchSaveScoringInput,
): Map<PlayerId, number> {
  const stored = m.appliedSeasonPointDeltas;
  if (stored && Object.keys(stored).length > 0) {
    const map = new Map<PlayerId, number>();
    for (const [k, v] of Object.entries(stored)) {
      if (typeof v === "number" && Number.isFinite(v)) map.set(k as PlayerId, v);
    }
    return map;
  }
  const before = buildPointsMapBeforeMatchId(m.id, allMatchesPrev, playersFile, cfg.rules, cfg.startingSeasonPoints);
  return matchPointDeltasForPlayedMatch(m, before, cfg.rules);
}

function subtractDeltas(players: Player[], deltas: Map<PlayerId, number>): Player[] {
  return players.map((p) => ({
    ...p,
    seasonPoints: p.seasonPoints - (deltas.get(p.id) ?? 0),
  }));
}

function addDeltas(players: Player[], deltas: Map<PlayerId, number>): Player[] {
  return players.map((p) => ({
    ...p,
    seasonPoints: p.seasonPoints + (deltas.get(p.id) ?? 0),
  }));
}

function pointsMapFromPlayers(players: Player[]): Map<PlayerId, number> {
  return new Map(players.map((p) => [p.id, p.seasonPoints]));
}

function stripAppliedDeltas(m: Match): Match {
  const { appliedSeasonPointDeltas: _a, ...rest } = m;
  return rest;
}

type ChangeRow = { id: string; om?: Match; nm?: Match };

function collectScoringChanges(prev: Match[], next: Match[]): ChangeRow[] {
  const prevMap = new Map(prev.map((m) => [m.id, m]));
  const nextMap = new Map(next.map((m) => [m.id, m]));
  const ids = new Set([...prevMap.keys(), ...nextMap.keys()]);
  const rows: ChangeRow[] = [];
  for (const id of ids) {
    const om = prevMap.get(id);
    const nm = nextMap.get(id);
    if (matchScoringPayload(om) !== matchScoringPayload(nm)) {
      rows.push({ id, om, nm });
    }
  }
  return rows;
}

function sortKeyDateId(m: Match): string {
  return `${m.date}\t${m.id}`;
}

/**
 * Met à jour les joueurs et annote `nextMatches` (`appliedSeasonPointDeltas`).
 * Annule d’abord les effets des anciennes parties jouées concernées (sens inverse chronologique), puis applique les nouvelles validations (chronologique).
 */
export function applyMatchScoringBetweenSnapshots(
  prevMatches: Match[],
  nextMatches: Match[],
  playersFile: PlayersFile,
  cfg: MatchSaveScoringInput,
): { matches: Match[]; players: PlayersFile; touched: boolean } {
  const changes = collectScoringChanges(prevMatches, nextMatches);
  if (changes.length === 0) {
    return { matches: nextMatches, players: playersFile, touched: false };
  }

  let players = playersFile.players.map((p) => ({ ...p }));

  const toRevert = changes
    .filter((c) => c.om && matchIsPlayedWithScores(c.om))
    .slice()
    .sort((a, b) => sortKeyDateId(b.om!).localeCompare(sortKeyDateId(a.om!)));

  for (const c of toRevert) {
    const om = c.om!;
    const d = deltasStoredOrReplay(om, prevMatches, playersFile, cfg);
    players = subtractDeltas(players, d);
  }

  const toApply = changes
    .filter((c) => c.nm && matchIsPlayedWithScores(c.nm))
    .slice()
    .sort((a, b) => sortKeyDateId(a.nm!).localeCompare(sortKeyDateId(b.nm!)));

  const annotationById = new Map<string, Partial<Record<PlayerId, number>>>();
  for (const c of toApply) {
    const nm = c.nm!;
    const beforeMap = pointsMapFromPlayers(players);
    const d = matchPointDeltasForPlayedMatch(nm, beforeMap, cfg.rules);
    players = addDeltas(players, d);
    const o: Partial<Record<PlayerId, number>> = {};
    for (const [id, v] of d) {
      if (v !== 0) o[id] = v;
    }
    annotationById.set(nm.id, o);
  }

  const changedIds = new Set(changes.map((c) => c.id));
  const matchesOut = nextMatches.map((m) => {
    if (annotationById.has(m.id)) {
      const d = annotationById.get(m.id)!;
      return { ...m, appliedSeasonPointDeltas: Object.keys(d).length > 0 ? d : undefined };
    }
    if (changedIds.has(m.id) && !matchIsPlayedWithScores(m)) {
      return stripAppliedDeltas({ ...m });
    }
    return { ...m };
  });

  const beforeById = new Map(playersFile.players.map((p) => [p.id, p.seasonPoints]));
  const playersTouched = players.some((p) => beforeById.get(p.id) !== p.seasonPoints);

  return {
    matches: matchesOut,
    players: { ...playersFile, players },
    touched: playersTouched,
  };
}
