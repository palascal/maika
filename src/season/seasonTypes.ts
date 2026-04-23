import type { SeasonScoringConfig } from "../data/seasonScoringConfigStorage";
import type { MatchesFile, PlayersFile } from "../domain/types";

export type SeasonBundle = {
  players: PlayersFile;
  matches: MatchesFile;
  scoring: SeasonScoringConfig;
};
