import type { MatchPointScoringRules } from "../domain/matchPointScoring";
import {
  DEFAULT_MATCH_POINT_SCORING_RULES,
  mergeScoringRules,
  sanitizeMatchPointScoringRules,
} from "../domain/matchPointScoring";

export const DEFAULT_STARTING_SEASON_POINTS = 10;

export interface SeasonScoringConfig {
  /** Points saison initiaux pour un nouveau joueur (ex. 10 → Maika 1) et base du rejeu complet. */
  startingSeasonPoints: number;
  rules: MatchPointScoringRules;
}

export const DEFAULT_SEASON_SCORING_CONFIG: SeasonScoringConfig = {
  startingSeasonPoints: DEFAULT_STARTING_SEASON_POINTS,
  rules: { ...DEFAULT_MATCH_POINT_SCORING_RULES },
};

function cloneDefaultConfig(): SeasonScoringConfig {
  return {
    startingSeasonPoints: DEFAULT_STARTING_SEASON_POINTS,
    rules: { ...DEFAULT_MATCH_POINT_SCORING_RULES },
  };
}

function sanitizeStartingPoints(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  return DEFAULT_STARTING_SEASON_POINTS;
}

function rulesFromParsed(parsed: Record<string, unknown>): MatchPointScoringRules {
  const copy = { ...parsed };
  delete copy.startingSeasonPoints;
  return sanitizeMatchPointScoringRules(mergeScoringRules(copy as Partial<MatchPointScoringRules>));
}

/** Interprète le JSON fichier `scoring-config.json` (objet plat : points de départ + clés des règles). */
export function parseSeasonScoringFromUnknown(parsed: unknown): SeasonScoringConfig {
  if (!parsed || typeof parsed !== "object") {
    return cloneDefaultConfig();
  }
  const o = parsed as Record<string, unknown>;
  return {
    startingSeasonPoints: sanitizeStartingPoints(o.startingSeasonPoints),
    rules: rulesFromParsed(o),
  };
}

export function sanitizeSeasonScoringConfig(config: SeasonScoringConfig): SeasonScoringConfig {
  return {
    startingSeasonPoints: sanitizeStartingPoints(config.startingSeasonPoints),
    rules: sanitizeMatchPointScoringRules(config.rules),
  };
}

/** Corps JSON à écrire sur le disque (une seule couche d’objet numérique). */
export function flattenSeasonScoringForJson(config: SeasonScoringConfig): Record<string, number> {
  const s = sanitizeSeasonScoringConfig(config);
  return {
    startingSeasonPoints: s.startingSeasonPoints,
    ...s.rules,
  };
}
