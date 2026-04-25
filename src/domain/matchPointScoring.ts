import { maikaFromSeasonPoints } from "./maika";
import type { Match, Player, PlayerId, PlayersFile } from "./types";

/** Règles éditables (points gagnés à la victoire, négatifs à la défaite). */
export interface MatchPointScoringRules {
  /** Victoire : (Maika adversaire − Maika vainqueur) ≥ 2 */
  victoryOpponentMinusWinnerGte2: number;
  /** Victoire : écart ≥ 1 (et < 2 si on teste dans l’ordre décroissant) */
  victoryOpponentMinusWinnerGte1: number;
  /** Victoire : égalité de niveau */
  victoryOpponentMinusWinnerEq0: number;
  /** Victoire : adversaire moins fort (écart négatif) */
  victoryOpponentMinusWinnerLt0: number;
  /** Défaite contre équipe plus forte (vainqueur au-dessus au Maika) */
  defeatWinnerMinusLoserGt0: number;
  /** Défaite : niveaux égaux */
  defeatWinnerMinusLoserEq0: number;
  /** Défaite : équipe moins forte (favori perd, écart total Maika = −1) */
  defeatWinnerMinusLoserEqMinus1: number;
  /** Défaite : favori perd fortement (écart total Maika ≤ −2) */
  defeatWinnerMinusLoserLteMinus2: number;
  /**
   * Bonus offensif : score perdant max (activation si score perdant strictement inférieur à cette valeur).
   * Ex. 29 -> si le perdant fait 28 ou moins, chaque vainqueur reçoit `offensiveBonusPoints`.
   */
  offensiveBonusMarginGt: number;
  /** Points bonus offensifs par joueur vainqueur (souvent 1). */
  offensiveBonusPoints: number;
  /**
   * Bonus défensif : score d’activation du bonus (score du perdant >= cette valeur).
   * Ex. 36 -> si le perdant fait 36 ou plus, chaque perdant reçoit `defensiveBonusPoints`.
   */
  defensiveBonusMarginLt: number;
  /** Points bonus défensifs par joueur perdant (souvent 1). */
  defensiveBonusPoints: number;
}

export const DEFAULT_MATCH_POINT_SCORING_RULES: MatchPointScoringRules = {
  victoryOpponentMinusWinnerGte2: 5,
  victoryOpponentMinusWinnerGte1: 4,
  victoryOpponentMinusWinnerEq0: 3,
  victoryOpponentMinusWinnerLt0: 2,
  defeatWinnerMinusLoserGt0: -1,
  defeatWinnerMinusLoserEq0: -2,
  defeatWinnerMinusLoserEqMinus1: -3,
  defeatWinnerMinusLoserLteMinus2: -4,
  offensiveBonusMarginGt: 29,
  offensiveBonusPoints: 1,
  defensiveBonusMarginLt: 36,
  defensiveBonusPoints: 1,
};

/** Libellés par défaut pour l’interface admin (clé = champ des règles). */
/** Ordre d’affichage dans la configuration admin. */
export const MATCH_POINT_SCORING_RULE_KEYS: (keyof MatchPointScoringRules)[] = [
  "victoryOpponentMinusWinnerGte2",
  "victoryOpponentMinusWinnerGte1",
  "victoryOpponentMinusWinnerEq0",
  "victoryOpponentMinusWinnerLt0",
  "defeatWinnerMinusLoserGt0",
  "defeatWinnerMinusLoserEq0",
  "defeatWinnerMinusLoserEqMinus1",
  "defeatWinnerMinusLoserLteMinus2",
  "offensiveBonusMarginGt",
  "offensiveBonusPoints",
  "defensiveBonusMarginLt",
  "defensiveBonusPoints",
];

export const MATCH_POINT_SCORING_RULE_LABELS: Record<keyof MatchPointScoringRules, string> = {
  victoryOpponentMinusWinnerGte2: "Victoire — adversaire plus fort (écart Maika ≥ 2)",
  victoryOpponentMinusWinnerGte1: "Victoire — écart Maika ≥ 1",
  victoryOpponentMinusWinnerEq0: "Victoire — égalité de niveau (écart nul)",
  victoryOpponentMinusWinnerLt0: "Victoire — adversaire moins fort (écart négatif)",
  defeatWinnerMinusLoserGt0: "Défaite — contre équipe plus forte",
  defeatWinnerMinusLoserEq0: "Défaite — égalité de niveau",
  defeatWinnerMinusLoserEqMinus1: "Défaite — def_ecart_1 (écart niveau >= -2)",
  defeatWinnerMinusLoserLteMinus2: "Défaite — def_ecart_2 (écart niveau < -2)",
  offensiveBonusMarginGt: "Bonus offensif — score perdant max (bonus si score perdant < N)",
  offensiveBonusPoints: "Bonus offensif — points par joueur vainqueur",
  defensiveBonusMarginLt: "Bonus défensif — score d’activation (score perdant >= N)",
  defensiveBonusPoints: "Bonus défensif — points par joueur perdant",
};

export function mergeScoringRules(partial: Partial<MatchPointScoringRules> | null | undefined): MatchPointScoringRules {
  return { ...DEFAULT_MATCH_POINT_SCORING_RULES, ...partial };
}

/** Assure des nombres finis pour chaque clé (sinon valeur par défaut). */
export function sanitizeMatchPointScoringRules(partial: Partial<MatchPointScoringRules>): MatchPointScoringRules {
  const out = { ...DEFAULT_MATCH_POINT_SCORING_RULES };
  for (const key of MATCH_POINT_SCORING_RULE_KEYS) {
    const v = partial[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[key] = v;
    }
  }
  return out;
}

function teamMaikaSum(team: readonly [PlayerId, PlayerId], pointsByPlayer: Map<PlayerId, number>): number {
  const a = pointsByPlayer.get(team[0]) ?? 0;
  const b = pointsByPlayer.get(team[1]) ?? 0;
  return maikaFromSeasonPoints(a) + maikaFromSeasonPoints(b);
}

function victoryPoints(opponentMinusWinner: number, rules: MatchPointScoringRules): number {
  if (opponentMinusWinner >= 2) return rules.victoryOpponentMinusWinnerGte2;
  if (opponentMinusWinner >= 1) return rules.victoryOpponentMinusWinnerGte1;
  if (opponentMinusWinner === 0) return rules.victoryOpponentMinusWinnerEq0;
  return rules.victoryOpponentMinusWinnerLt0;
}

function defeatPoints(winnerMinusLoser: number, rules: MatchPointScoringRules): number {
  if (winnerMinusLoser > 0) return rules.defeatWinnerMinusLoserGt0;
  if (winnerMinusLoser > -1) return rules.defeatWinnerMinusLoserEq0;
  if (winnerMinusLoser >= -2) return rules.defeatWinnerMinusLoserEqMinus1;
  return rules.defeatWinnerMinusLoserLteMinus2;
}

/**
 * Points attribués par cette partie (somme des deltas sur les 4 joueurs = 0 en général, pas imposé par les règles métier).
 * `seasonPointsBefore` : points saison **avant** cette partie (pour calculer le Maika).
 */
export function matchPointDeltasForPlayedMatch(
  match: Match,
  seasonPointsBefore: Map<PlayerId, number>,
  rules: MatchPointScoringRules,
): Map<PlayerId, number> {
  const out = new Map<PlayerId, number>();
  for (const id of [...match.teamA, ...match.teamB]) {
    out.set(id, 0);
  }
  if (match.status !== "played") return out;
  const sa = match.scoreTeamA;
  const sb = match.scoreTeamB;
  if (sa == null || sb == null || !Number.isFinite(sa) || !Number.isFinite(sb)) return out;
  if (sa === sb) return out;
  const scoreMax = Math.max(sa, sb);
  // Formules métier fournies : attribution de victoire/défaite seulement sur une partie gagnée à 40.
  if (scoreMax !== 40) return out;

  const maikaA = teamMaikaSum(match.teamA, seasonPointsBefore);
  const maikaB = teamMaikaSum(match.teamB, seasonPointsBefore);

  const aWins = sa > sb;
  const winnerTeam = aWins ? match.teamA : match.teamB;
  const loserTeam = aWins ? match.teamB : match.teamA;

  const maikaWinner = aWins ? maikaA : maikaB;
  const maikaLoser = aWins ? maikaB : maikaA;

  const opponentMinusWinner = maikaLoser - maikaWinner;
  const winnerMinusLoser = maikaWinner - maikaLoser;

  const winPts = victoryPoints(opponentMinusWinner, rules);
  const losePts = defeatPoints(winnerMinusLoser, rules);

  for (const id of winnerTeam) {
    out.set(id, (out.get(id) ?? 0) + winPts);
  }
  for (const id of loserTeam) {
    out.set(id, (out.get(id) ?? 0) + losePts);
  }

  const loserScore = aWins ? sb : sa;
  if (loserScore < rules.offensiveBonusMarginGt && rules.offensiveBonusPoints !== 0) {
    const b = rules.offensiveBonusPoints;
    for (const id of winnerTeam) {
      out.set(id, (out.get(id) ?? 0) + b);
    }
  }
  if (loserScore >= rules.defensiveBonusMarginLt && rules.defensiveBonusPoints !== 0) {
    const b = rules.defensiveBonusPoints;
    for (const id of loserTeam) {
      out.set(id, (out.get(id) ?? 0) + b);
    }
  }

  return out;
}

export function matchIsPlayedWithScores(m: Match): boolean {
  if (m.status !== "played") return false;
  return m.scoreTeamA != null && m.scoreTeamB != null && Number.isFinite(m.scoreTeamA) && Number.isFinite(m.scoreTeamB);
}

/** Champs qui influencent le calcul des points (Maika, vainqueur). */
export function matchScoringPayload(m: Match | undefined): string {
  if (!m) return "";
  return JSON.stringify({
    status: m.status,
    scoreTeamA: m.scoreTeamA ?? null,
    scoreTeamB: m.scoreTeamB ?? null,
    teamA: [...m.teamA],
    teamB: [...m.teamB],
  });
}

/**
 * Recalcule les `seasonPoints` de tous les joueurs en rejouant les parties jouées dans l’ordre chronologique (date, puis id).
 * Chaque joueur démarre à `startingSeasonPoints` (ex. 10 → Maika 1) avant application des parties.
 */
export function replaySeasonPointsFromMatches(
  playersFile: { players: Player[]; seasonId: string; seasonLabel: string; updatedAt: string },
  matches: Match[],
  rules: MatchPointScoringRules,
  startingSeasonPoints: number,
): { players: Player[]; seasonId: string; seasonLabel: string; updatedAt: string } {
  const played = matches.filter(matchIsPlayedWithScores).slice();
  played.sort((a, b) => {
    const c = a.date.localeCompare(b.date);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });

  const start = Number.isFinite(startingSeasonPoints) ? Math.round(startingSeasonPoints) : 0;
  const points = new Map<PlayerId, number>();
  for (const p of playersFile.players) {
    points.set(p.id, start);
  }

  for (const m of played) {
    const deltas = matchPointDeltasForPlayedMatch(m, points, rules);
    for (const [id, d] of deltas) {
      if (!points.has(id)) continue;
      points.set(id, (points.get(id) ?? 0) + d);
    }
  }

  const nextPlayers = playersFile.players.map((p) => ({
    ...p,
    seasonPoints: points.get(p.id) ?? 0,
  }));

  return {
    seasonId: playersFile.seasonId,
    seasonLabel: playersFile.seasonLabel,
    updatedAt: playersFile.updatedAt,
    players: nextPlayers,
  };
}
