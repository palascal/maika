import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  DEFAULT_STARTING_SEASON_POINTS,
  sanitizeSeasonScoringConfig,
  type SeasonScoringConfig,
} from "../data/seasonScoringConfigStorage";
import {
  DEFAULT_MATCH_POINT_SCORING_RULES,
  MATCH_POINT_SCORING_RULE_KEYS,
  MATCH_POINT_SCORING_RULE_LABELS,
  replaySeasonPointsFromMatches,
} from "../domain/matchPointScoring";
import { isSupabaseConfigured } from "../lib/supabaseConfig";
import { useSeasonData } from "../season/SeasonDataContext";

const today = () => new Date().toISOString().slice(0, 10);

export function AdminConfigPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data, error, loading, savePlayersFile, saveScoringConfig } = useSeasonData();
  const [config, setConfig] = useState<SeasonScoringConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin) navigate("/", { replace: true });
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (!data?.scoring) return;
    setConfig({
      startingSeasonPoints: data.scoring.startingSeasonPoints,
      rules: { ...data.scoring.rules },
    });
  }, [data]);

  if (!isAdmin) return null;

  async function persistConfig(next: SeasonScoringConfig) {
    setApplyError(null);
    try {
      await saveScoringConfig(sanitizeSeasonScoringConfig(next));
      setMessage(
        isSupabaseConfigured()
          ? "Configuration enregistrée dans Supabase (table scoring_config)."
          : "Configuration enregistrée dans public/data/scoring-config.json (dev) ou dist/… (preview).",
      );
    } catch (err: unknown) {
      setMessage(null);
      setApplyError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!config) return;
    void persistConfig(config);
  }

  async function recalcPointsNow() {
    if (!data || !config) return;
    setApplyError(null);
    setMessage(null);
    setBusy(true);
    try {
      const cfg = sanitizeSeasonScoringConfig(config);
      const replayed = replaySeasonPointsFromMatches(
        data.players,
        data.matches.matches,
        cfg.rules,
        cfg.startingSeasonPoints,
      );
      await savePlayersFile({
        ...replayed,
        updatedAt: today(),
      });
      setMessage("Points recalculés (rejeu complet) et enregistrés.");
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : "Recalcul impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data || !config) return <p>Chargement…</p>;

  return (
    <main>
      <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        <Link to="/" style={backLinkStyle}>
          ← Retour à la synthèse
        </Link>
      </p>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Configuration</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: "1rem" }}>
        Maika = partie entière des points ÷ 10. À l’enregistrement des parties, seuls les joueurs des lignes modifiées
        sont ajustés : on <strong>annule</strong> l’effet des anciennes validations (deltas mémorisés sur la partie, ou
        recalcul si données anciennes), puis on <strong>réapplique</strong> les nouveaux scores. Les bonus offensif /
        défensif s’appliquent sur l’<strong>écart au score</strong>.{" "}
        {isSupabaseConfigured() ? (
          <>
            Les valeurs sont lues et écrites dans <strong>Supabase</strong> (table <code>scoring_config</code>).
          </>
        ) : (
          <>
            Les valeurs sont lues et écrites dans le fichier <code>data/scoring-config.json</code> du projet via le
            serveur Vite (<code>npm run dev</code> ou <code>npm run preview</code> après build).
          </>
        )}{" "}
        Le bouton « Rejeu complet » sert uniquement de maintenance manuelle.
      </p>
      <form onSubmit={onSubmit}>
        <div className="table-scroll" style={{ marginBottom: "1rem" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nom</th>
                <th style={thStyle}>Valeur (points)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Nombre de points de départ (nouveau joueur, Maika 1 si = 10)</td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    step={1}
                    value={String(config.startingSeasonPoints)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setConfig((c) =>
                        c
                          ? {
                              ...c,
                              startingSeasonPoints: Number.isFinite(v) ? v : c.startingSeasonPoints,
                            }
                          : c,
                      );
                    }}
                    style={inputStyle}
                    aria-label="Nombre de points de départ"
                  />
                </td>
              </tr>
              {MATCH_POINT_SCORING_RULE_KEYS.map((key) => (
                <tr key={key}>
                  <td style={tdStyle}>{MATCH_POINT_SCORING_RULE_LABELS[key]}</td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      step={1}
                      value={String(config.rules[key])}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setConfig((c) =>
                          c
                            ? {
                                ...c,
                                rules: { ...c.rules, [key]: Number.isFinite(v) ? v : c.rules[key] },
                              }
                            : c,
                        );
                      }}
                      style={inputStyle}
                      aria-label={MATCH_POINT_SCORING_RULE_LABELS[key]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1rem" }}>
          <button type="submit" style={buttonPrimary}>
            Enregistrer la configuration
          </button>
          <button
            type="button"
            style={buttonSecondary}
            onClick={() =>
              void persistConfig({
                startingSeasonPoints: DEFAULT_STARTING_SEASON_POINTS,
                rules: { ...DEFAULT_MATCH_POINT_SCORING_RULES },
              })
            }
          >
            Valeurs par défaut
          </button>
          <button type="button" style={buttonSecondary} disabled={busy} onClick={() => void recalcPointsNow()}>
            Rejeu complet des points
          </button>
        </div>
      </form>
      {message ? <p style={{ color: "var(--accent)", marginTop: 0 }}>{message}</p> : null}
      {applyError ? (
        <p role="alert" style={{ color: "#f87171", marginTop: 0 }}>
          {applyError}
        </p>
      ) : null}
    </main>
  );
}

const backLinkStyle: CSSProperties = { fontWeight: 600, textDecoration: "none" };
const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: "20rem",
  borderCollapse: "collapse",
  background: "var(--surface)",
  borderRadius: 12,
  overflow: "hidden",
};
const thStyle: CSSProperties = { textAlign: "left", padding: "0.6rem", borderBottom: "1px solid var(--muted)" };
const tdStyle: CSSProperties = { padding: "0.6rem", borderBottom: "1px solid #334155", verticalAlign: "middle" };
const inputStyle: CSSProperties = {
  width: "100%",
  maxWidth: "8rem",
  padding: "0.5rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
  minHeight: "2.5rem",
};
const buttonPrimary: CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  minHeight: "2.75rem",
};
const buttonSecondary: CSSProperties = {
  padding: "0.5rem 1rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
  minHeight: "2.75rem",
};
