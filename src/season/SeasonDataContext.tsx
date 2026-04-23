import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabaseSeasonId } from "../lib/supabaseConfig";
import {
  loadSeasonBundle,
  persistMatchesFile,
  persistPlayersFile,
  persistScoringConfig,
} from "../data/seasonRepository";
import type { SeasonScoringConfig } from "../data/seasonScoringConfigStorage";
import { sanitizeSeasonScoringConfig } from "../data/seasonScoringConfigStorage";
import { applyMatchScoringBetweenSnapshots } from "../domain/matchSavePointsUpdate";
import type { MatchesFile, PlayersFile } from "../domain/types";
import type { SeasonBundle } from "./seasonTypes";

export type { SeasonBundle } from "./seasonTypes";

interface SeasonDataContextValue {
  data: SeasonBundle | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  savePlayersFile: (next: PlayersFile) => Promise<void>;
  saveMatchesFile: (next: MatchesFile) => Promise<void>;
  /** Enregistre la config (fichier JSON en local, ou ligne `scoring_config` en mode Supabase). */
  saveScoringConfig: (next: SeasonScoringConfig) => Promise<void>;
}

const SeasonDataContext = createContext<SeasonDataContextValue | null>(null);

export function SeasonDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SeasonBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const bundle = await loadSeasonBundle();
      setData(bundle);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.removeItem("classement-tennis-players-v1");
      localStorage.removeItem("maika-match-point-scoring-rules-v1");
    } catch {
      /* ignore */
    }
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refresh]);

  const savePlayersFile = useCallback(async (next: PlayersFile) => {
    await persistPlayersFile(next);
    await refresh();
  }, [refresh]);

  const saveScoringConfig = useCallback(
    async (next: SeasonScoringConfig) => {
      const cfg = sanitizeSeasonScoringConfig(next);
      const sid = data?.players.seasonId ?? supabaseSeasonId();
      await persistScoringConfig(cfg, sid);
      await refresh();
    },
    [data?.players.seasonId, refresh],
  );

  const saveMatchesFile = useCallback(
    async (next: MatchesFile) => {
      const snapshot = data;
      const updatedAt = new Date().toISOString().slice(0, 10);
      if (snapshot) {
        const cfg = snapshot.scoring;
        const out = applyMatchScoringBetweenSnapshots(snapshot.matches.matches, next.matches, snapshot.players, {
          rules: cfg.rules,
          startingSeasonPoints: cfg.startingSeasonPoints,
        });
        await persistMatchesFile({ seasonId: next.seasonId, updatedAt: next.updatedAt, matches: out.matches });
        if (out.touched) {
          await persistPlayersFile({ ...out.players, updatedAt });
        }
      } else {
        await persistMatchesFile(next);
      }
      await refresh();
    },
    [data, refresh],
  );

  const value = useMemo<SeasonDataContextValue>(
    () => ({
      data,
      error,
      loading,
      refresh,
      savePlayersFile,
      saveMatchesFile,
      saveScoringConfig,
    }),
    [data, error, loading, refresh, savePlayersFile, saveMatchesFile, saveScoringConfig],
  );

  return <SeasonDataContext.Provider value={value}>{children}</SeasonDataContext.Provider>;
}

export function useSeasonData(): SeasonDataContextValue {
  const ctx = useContext(SeasonDataContext);
  if (!ctx) throw new Error("useSeasonData doit être utilisé dans SeasonDataProvider");
  return ctx;
}
