import { isSupabaseConfigured } from "../lib/supabaseConfig";
import type { SeasonBundle } from "../season/seasonTypes";
import { loadSeasonData } from "./loadSeasonData";
import { saveMatchesToDisk } from "./saveMatchesApi";
import { savePlayersToDisk } from "./savePlayersApi";
import { saveScoringConfigToDisk } from "./saveScoringConfigApi";
import type { SeasonScoringConfig } from "./seasonScoringConfigStorage";
import {
  loadSeasonFromSupabase,
  saveMatchesToSupabase,
  savePlayersToSupabase,
  saveScoringToSupabase,
} from "./supabaseSeasonRepository";
import type { MatchesFile, PlayersFile } from "../domain/types";

export type { SeasonBundle } from "../season/seasonTypes";

export async function loadSeasonBundle(): Promise<SeasonBundle> {
  if (isSupabaseConfigured()) return loadSeasonFromSupabase();
  return loadSeasonData();
}

export async function persistPlayersFile(file: PlayersFile): Promise<void> {
  if (isSupabaseConfigured()) return savePlayersToSupabase(file);
  return savePlayersToDisk(file);
}

export async function persistMatchesFile(file: MatchesFile): Promise<void> {
  if (isSupabaseConfigured()) return saveMatchesToSupabase(file);
  return saveMatchesToDisk(file);
}

export async function persistScoringConfig(config: SeasonScoringConfig, seasonId: string): Promise<void> {
  if (isSupabaseConfigured()) return saveScoringToSupabase(seasonId, config);
  return saveScoringConfigToDisk(config);
}
