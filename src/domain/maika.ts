/**
 * Score Maika : partie entière des points saison divisés par 10 (ex. 16 → 1).
 */
export function maikaFromSeasonPoints(seasonPoints: number): number {
  return Math.floor(seasonPoints / 10);
}
