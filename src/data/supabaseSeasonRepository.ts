import { getSupabaseClient } from "../lib/supabaseClient";
import { supabaseSeasonId } from "../lib/supabaseConfig";
import {
  flattenSeasonScoringForJson,
  parseSeasonScoringFromUnknown,
  type SeasonScoringConfig,
} from "./seasonScoringConfigStorage";
import { playerIsActive } from "../domain/playerActive";
import type { Match, MatchesFile, Player, PlayersFile } from "../domain/types";
import type { SeasonBundle } from "../season/seasonTypes";

function sbError(prefix: string, message: string | null): Error {
  return new Error(`${prefix}${message ?? "Erreur inconnue"}`);
}

function asMatch(raw: unknown): Match {
  return raw as Match;
}

export async function loadSeasonFromSupabase(): Promise<SeasonBundle> {
  const sb = getSupabaseClient();
  const seasonId = supabaseSeasonId();

  const { data: seasonRow, error: seasonErr } = await sb.from("seasons").select("*").eq("id", seasonId).maybeSingle();
  if (seasonErr) throw sbError("Supabase (seasons) : ", seasonErr.message);
  if (!seasonRow) {
    throw new Error(
      `Aucune saison « ${seasonId} » en base. Exécutez la migration SQL (table seasons + insert) ou définissez VITE_SUPABASE_SEASON_ID.`,
    );
  }

  const { data: playerRows, error: pErr } = await sb.from("players").select("*").eq("season_id", seasonId);
  if (pErr) throw sbError("Supabase (players) : ", pErr.message);

  const players: Player[] = (playerRows ?? []).map((r) => {
    const rawActive = (r as { active?: boolean | null }).active;
    const active = rawActive === false ? false : true;
    const rawEmail = (r as { email?: string | null }).email;
    const email = typeof rawEmail === "string" && rawEmail.trim() ? rawEmail.trim().toLowerCase() : undefined;
    return {
      id: r.player_id as string,
      lastName: r.last_name as string,
      firstName: r.first_name as string,
      poste: r.poste as Player["poste"],
      seasonPoints: Number(r.season_points) || 0,
      ...(email ? { email } : {}),
      ...(active ? {} : { active: false as const }),
    };
  });

  const { data: matchRows, error: mErr } = await sb.from("matches").select("payload").eq("season_id", seasonId);
  if (mErr) throw sbError("Supabase (matches) : ", mErr.message);

  const matches: Match[] = (matchRows ?? []).map((row) => asMatch(row.payload));
  matches.sort((a, b) => {
    const c = a.date.localeCompare(b.date);
    if (c !== 0) return c;
    return a.id.localeCompare(b.id);
  });

  const { data: scoringRow, error: sErr } = await sb.from("scoring_config").select("payload").eq("season_id", seasonId).maybeSingle();
  if (sErr) throw sbError("Supabase (scoring_config) : ", sErr.message);

  const scoring: SeasonScoringConfig = scoringRow?.payload
    ? parseSeasonScoringFromUnknown(scoringRow.payload as Record<string, unknown>)
    : parseSeasonScoringFromUnknown(null);

  const playersFile: PlayersFile = {
    seasonId,
    seasonLabel: (seasonRow.season_label as string) || seasonId,
    updatedAt: (seasonRow.players_updated_at as string) || new Date().toISOString().slice(0, 10),
    players,
  };

  const matchesFile: MatchesFile = {
    seasonId,
    updatedAt: (seasonRow.matches_updated_at as string) || new Date().toISOString().slice(0, 10),
    matches,
  };

  return { players: playersFile, matches: matchesFile, scoring };
}

export async function savePlayersToSupabase(file: PlayersFile): Promise<void> {
  const sb = getSupabaseClient();
  const seasonId = file.seasonId;

  const { error: upSeason } = await sb
    .from("seasons")
    .update({
      season_label: file.seasonLabel,
      players_updated_at: file.updatedAt,
    })
    .eq("id", seasonId);
  if (upSeason) throw sbError("Supabase (seasons update) : ", upSeason.message);

  const { error: del } = await sb.from("players").delete().eq("season_id", seasonId);
  if (del) throw sbError("Supabase (players delete) : ", del.message);

  if (file.players.length > 0) {
    const rows = file.players.map((p) => ({
      season_id: seasonId,
      player_id: p.id,
      last_name: p.lastName,
      first_name: p.firstName,
      poste: p.poste,
      season_points: Math.round(p.seasonPoints),
      active: playerIsActive(p),
      email: p.email?.trim() ? p.email.trim().toLowerCase() : null,
    }));
    const { error: ins } = await sb.from("players").insert(rows);
    if (ins) throw sbError("Supabase (players insert) : ", ins.message);
  }
}

export async function saveMatchesToSupabase(file: MatchesFile): Promise<void> {
  const sb = getSupabaseClient();
  const seasonId = file.seasonId;

  const { error: upSeason } = await sb.from("seasons").update({ matches_updated_at: file.updatedAt }).eq("id", seasonId);
  if (upSeason) throw sbError("Supabase (seasons update) : ", upSeason.message);

  const { error: del } = await sb.from("matches").delete().eq("season_id", seasonId);
  if (del) throw sbError("Supabase (matches delete) : ", del.message);

  if (file.matches.length > 0) {
    const rows = file.matches.map((m) => ({
      season_id: seasonId,
      match_id: m.id,
      payload: m as unknown as Record<string, unknown>,
    }));
    const { error: ins } = await sb.from("matches").insert(rows);
    if (ins) throw sbError("Supabase (matches insert) : ", ins.message);
  }
}

export async function saveScoringToSupabase(seasonId: string, config: SeasonScoringConfig): Promise<void> {
  const sb = getSupabaseClient();
  const payload = flattenSeasonScoringForJson(config);
  const { error } = await sb.from("scoring_config").upsert(
    { season_id: seasonId, payload },
    { onConflict: "season_id" },
  );
  if (error) throw sbError("Supabase (scoring_config upsert) : ", error.message);
}
