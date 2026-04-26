import { Loader2, RefreshCw, RotateCcw, Save } from "lucide-react";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { IconActionButton, iconButtonBaseStyle } from "../components/IconActionButton";
import { InfoTooltip } from "../components/InfoTooltip";
import { useAuth } from "../auth/AuthContext";
import { playerFullName } from "../domain/format";
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
const VICTORY_RULE_KEYS = [
  "victoryOpponentMinusWinnerGte2",
  "victoryOpponentMinusWinnerGte1",
  "victoryOpponentMinusWinnerEq0",
  "victoryOpponentMinusWinnerLt0",
] as const;
const DEFEAT_RULE_KEYS = [
  "defeatWinnerMinusLoserGt0",
  "defeatWinnerMinusLoserEq0",
  "defeatWinnerMinusLoserEqMinus1",
  "defeatWinnerMinusLoserLteMinus2",
] as const;
const OFFENSIVE_BONUS_KEYS = {
  threshold: "offensiveBonusMarginGt",
  value: "offensiveBonusPoints",
} as const;
const DEFENSIVE_BONUS_KEYS = {
  threshold: "defensiveBonusMarginLt",
  value: "defensiveBonusPoints",
} as const;

function configFieldLabel(key: (typeof MATCH_POINT_SCORING_RULE_KEYS)[number]): string {
  const label = MATCH_POINT_SCORING_RULE_LABELS[key];
  if (VICTORY_RULE_KEYS.includes(key as (typeof VICTORY_RULE_KEYS)[number])) {
    return label.replace(/^Victoire\s+[—-]\s*/u, "");
  }
  if (DEFEAT_RULE_KEYS.includes(key as (typeof DEFEAT_RULE_KEYS)[number])) {
    return label.replace(/^Défaite\s+[—-]\s*/u, "");
  }
  return label;
}

export function AdminConfigPage() {
  const navigate = useNavigate();
  const { canAccessConfig, isAdmin } = useAuth();
  const { data, error, loading, saveMatchesFile, savePlayersFile, saveScoringConfig } = useSeasonData();
  const [config, setConfig] = useState<SeasonScoringConfig | null>(null);
  const [newSeasonLabel, setNewSeasonLabel] = useState("");
  const [newSeasonStepOpen, setNewSeasonStepOpen] = useState(false);
  const [keptPlayerIds, setKeptPlayerIds] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!canAccessConfig) navigate("/", { replace: true });
  }, [canAccessConfig, navigate]);

  useEffect(() => {
    if (!data?.scoring) return;
    setConfig({
      startingSeasonPoints: data.scoring.startingSeasonPoints,
      rules: { ...data.scoring.rules },
    });
  }, [data]);

  useEffect(() => {
    setNewSeasonLabel(data?.players.seasonLabel ?? "");
  }, [data?.players.seasonLabel]);

  if (!canAccessConfig) return null;

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

  async function createNewSeasonNow() {
    if (!data || !config || !isAdmin) return;
    const seasonLabel = newSeasonLabel.trim();
    if (!seasonLabel) {
      setApplyError("Saisissez un nom de saison.");
      return;
    }
    const selectedPlayers = data.players.players.filter((p) => keptPlayerIds.includes(p.id));
    if (selectedPlayers.length === 0) {
      setApplyError("Sélectionnez au moins un joueur à conserver.");
      return;
    }
    const confirmText =
      `Créer la nouvelle saison « ${seasonLabel} » ?\n\n` +
      "Cette action va supprimer toutes les parties, conserver les joueurs sélectionnés, " +
      "et remettre leurs points au score de départ.";
    if (!window.confirm(confirmText)) return;

    setApplyError(null);
    setMessage(null);
    setBusy(true);
    try {
      await saveMatchesFile({
        ...data.matches,
        matches: [],
        updatedAt: today(),
      });
      await savePlayersFile({
        ...data.players,
        seasonLabel,
        updatedAt: today(),
        players: selectedPlayers.map((p) => ({
          ...p,
          seasonPoints: config.startingSeasonPoints,
        })),
      });
      setNewSeasonStepOpen(false);
      setMessage(`Nouvelle saison « ${seasonLabel} » créée : parties supprimées et points réinitialisés.`);
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : "Création de saison impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data || !config) return <p>Chargement…</p>;

  const updateRule = (key: (typeof MATCH_POINT_SCORING_RULE_KEYS)[number], raw: string) => {
    const v = Number(raw);
    setConfig((c) =>
      c
        ? {
            ...c,
            rules: { ...c.rules, [key]: Number.isFinite(v) ? v : c.rules[key] },
          }
        : c,
    );
  };

  function startNewSeasonStep() {
    const seasonLabel = newSeasonLabel.trim();
    if (!seasonLabel) {
      setApplyError("Saisissez un nom de saison.");
      return;
    }
    setApplyError(null);
    setMessage(null);
    setKeptPlayerIds(data.players.players.map((p) => p.id));
    setNewSeasonStepOpen(true);
  }

  function toggleKeptPlayer(playerId: string) {
    setKeptPlayerIds((current) => (current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]));
  }

  const sortedPlayers = data.players.players
    .slice()
    .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"));

  if (isAdmin && newSeasonStepOpen) {
    return (
      <main>
        <div style={{ ...configSectionStyle, marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.05rem", margin: "0 0 0.45rem" }}>Nouvelle saison</h2>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Sélectionnez les joueurs à conserver pour <strong>{newSeasonLabel.trim()}</strong>. Tous sont cochés par défaut.
          </p>
        </div>
        <section style={configSectionStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: "0.7rem" }}>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {keptPlayerIds.length} / {sortedPlayers.length} joueur(s) conservé(s)
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={{ ...plainButtonStyle }} onClick={() => setKeptPlayerIds(sortedPlayers.map((p) => p.id))}>
                Tout cocher
              </button>
              <button type="button" style={{ ...plainButtonStyle }} onClick={() => setKeptPlayerIds([])}>
                Tout décocher
              </button>
            </div>
          </div>
          <div style={playersListStyle}>
            {sortedPlayers.map((p) => (
              <label key={p.id} style={playerRowStyle}>
                <input type="checkbox" checked={keptPlayerIds.includes(p.id)} onChange={() => toggleKeptPlayer(p.id)} />
                <span>{playerFullName(p)}</span>
              </label>
            ))}
          </div>
        </section>
        <div style={{ display: "flex", gap: 8, marginTop: "0.9rem", flexWrap: "wrap" }}>
          <button type="button" style={plainButtonStyle} onClick={() => setNewSeasonStepOpen(false)} disabled={busy}>
            Retour config
          </button>
          <IconActionButton
            label="Créer la nouvelle saison"
            icon={busy ? Loader2 : Save}
            iconSize={19}
            iconClassName={busy ? "animate-icon-spin" : undefined}
            disabled={busy}
            style={{
              ...iconButtonBaseStyle,
              ...buttonDanger,
              padding: "0.5rem 0.85rem",
              ...(busy ? { opacity: 0.85, cursor: "wait" } : {}),
            }}
            onClick={() => void createNewSeasonNow()}
          />
        </div>
        {applyError ? (
          <p role="alert" style={{ color: "var(--danger)", marginTop: "0.7rem" }}>
            {applyError}
          </p>
        ) : null}
      </main>
    );
  }

  return (
    <main>
      <div style={headingRowStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: 0 }}>Configuration</h2>
        <InfoTooltip label="Aide configuration">
          <p style={tipTextStyle}>
            Maika = partie entière des points ÷ 10. À l’enregistrement des parties, seuls les joueurs des lignes
            modifiées sont ajustés : on annule l’effet des anciennes validations puis on réapplique les nouveaux
            scores.
          </p>
          <p style={tipTextStyle}>
            Les bonus offensif / défensif s’appliquent selon le score atteint par l’équipe perdante.{" "}
            {isSupabaseConfigured()
              ? "Les valeurs sont lues et écrites dans Supabase (table scoring_config)."
              : "Les valeurs sont lues et écrites dans data/scoring-config.json via le serveur Vite (dev/preview)."}
          </p>
          <p style={{ ...tipTextStyle, marginBottom: 0 }}>Le bouton « Rejeu complet » sert uniquement de maintenance manuelle.</p>
        </InfoTooltip>
      </div>
      <form onSubmit={onSubmit}>
        <div style={sectionsWrapStyle}>
          <section style={configSectionStyle}>
            <h3 style={sectionTitleStyle}>General</h3>
            <div style={rowsWrapStyle}>
              <label style={ruleRowStyle}>
                <span style={ruleLabelStyle}>Nombre de points de départ</span>
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
              </label>
            </div>
          </section>

          <section style={configSectionStyle}>
            <h3 style={sectionTitleStyle}>Calcul points</h3>
            <div style={subSectionsGridStyle}>
              <div style={subSectionStyle}>
                <h4 style={subSectionTitleStyle}>Victoire</h4>
                <div style={rowsWrapStyle}>
                  {VICTORY_RULE_KEYS.map((key) => (
                    <label key={key} style={ruleRowStyle}>
                      <span style={ruleLabelStyle}>{configFieldLabel(key)}</span>
                      <input
                        type="number"
                        step={1}
                        value={String(config.rules[key])}
                        onChange={(e) => updateRule(key, e.target.value)}
                        style={inputStyle}
                        aria-label={configFieldLabel(key)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div style={subSectionStyle}>
                <h4 style={subSectionTitleStyle}>Defaites</h4>
                <div style={rowsWrapStyle}>
                  {DEFEAT_RULE_KEYS.map((key) => (
                    <label key={key} style={ruleRowStyle}>
                      <span style={ruleLabelStyle}>{configFieldLabel(key)}</span>
                      <input
                        type="number"
                        step={1}
                        value={String(config.rules[key])}
                        onChange={(e) => updateRule(key, e.target.value)}
                        style={inputStyle}
                        aria-label={configFieldLabel(key)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section style={configSectionStyle}>
            <h3 style={sectionTitleStyle}>Bonus</h3>
            <div style={subSectionsGridStyle}>
              <div style={subSectionStyle}>
                <h4 style={subSectionTitleStyle}>Offensif</h4>
                <div style={bonusPairRowStyle}>
                  <label style={bonusCellStyle}>
                    <span style={bonusFieldLabelStyle}>Score d'activation (perdant max)</span>
                    <input
                      type="number"
                      step={1}
                      value={String(config.rules[OFFENSIVE_BONUS_KEYS.threshold])}
                      onChange={(e) => updateRule(OFFENSIVE_BONUS_KEYS.threshold, e.target.value)}
                      style={inputStyle}
                      aria-label="Bonus offensif — score perdant max"
                    />
                  </label>
                  <label style={bonusCellStyle}>
                    <span style={bonusFieldLabelStyle}>Valeur du bonus</span>
                    <input
                      type="number"
                      step={1}
                      value={String(config.rules[OFFENSIVE_BONUS_KEYS.value])}
                      onChange={(e) => updateRule(OFFENSIVE_BONUS_KEYS.value, e.target.value)}
                      style={inputStyle}
                      aria-label="Bonus offensif — valeur du bonus"
                    />
                  </label>
                </div>
              </div>

              <div style={subSectionStyle}>
                <h4 style={subSectionTitleStyle}>Defensif</h4>
                <div style={bonusPairRowStyle}>
                  <label style={bonusCellStyle}>
                    <span style={bonusFieldLabelStyle}>Score d'activation (perdant min)</span>
                    <input
                      type="number"
                      step={1}
                      value={String(config.rules[DEFENSIVE_BONUS_KEYS.threshold])}
                      onChange={(e) => updateRule(DEFENSIVE_BONUS_KEYS.threshold, e.target.value)}
                      style={inputStyle}
                      aria-label="Bonus défensif — nombre de points minimal"
                    />
                  </label>
                  <label style={bonusCellStyle}>
                    <span style={bonusFieldLabelStyle}>Valeur du bonus</span>
                    <input
                      type="number"
                      step={1}
                      value={String(config.rules[DEFENSIVE_BONUS_KEYS.value])}
                      onChange={(e) => updateRule(DEFENSIVE_BONUS_KEYS.value, e.target.value)}
                      style={inputStyle}
                      aria-label="Bonus défensif — valeur du bonus"
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
          {isAdmin ? (
            <section style={configSectionStyle}>
              <h3 style={sectionTitleStyle}>Nouvelle saison</h3>
              <div style={rowsWrapStyle}>
                <label style={{ ...labelStackStyle }}>
                  <span style={ruleLabelStyle}>Nom de saison (bandeau haut)</span>
                  <input
                    type="text"
                    value={newSeasonLabel}
                    onChange={(e) => setNewSeasonLabel(e.target.value)}
                    style={inputStyle}
                    placeholder="Ex. Maika 2027"
                    aria-label="Nom de la nouvelle saison"
                  />
                </label>
                <p style={seasonWarningStyle}>
                  La création d’une nouvelle saison réinitialise les compteurs : toutes les parties seront supprimées,
                  les joueurs conservés, et chaque joueur repartira avec les points de départ.
                </p>
                <div>
                  <IconActionButton
                    label="Choisir les joueurs à conserver"
                    icon={Save}
                    iconSize={19}
                    disabled={busy}
                    style={{
                      ...iconButtonBaseStyle,
                      ...buttonDanger,
                      padding: "0.5rem 0.85rem",
                    }}
                    onClick={startNewSeasonStep}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "1rem", alignItems: "center" }}>
          <IconActionButton
            type="submit"
            label="Enregistrer la configuration"
            icon={Save}
            iconSize={20}
            style={{ ...iconButtonBaseStyle, ...buttonPrimary, border: "none", padding: "0.5rem 0.85rem" }}
          />
          <IconActionButton
            label="Réinitialiser aux valeurs par défaut"
            icon={RotateCcw}
            iconSize={19}
            style={{ ...iconButtonBaseStyle, ...buttonSecondary, padding: "0.5rem 0.85rem" }}
            onClick={() =>
              void persistConfig({
                startingSeasonPoints: DEFAULT_STARTING_SEASON_POINTS,
                rules: { ...DEFAULT_MATCH_POINT_SCORING_RULES },
              })
            }
          />
          <IconActionButton
            label="Rejeu complet des points saison"
            icon={busy ? Loader2 : RefreshCw}
            iconSize={19}
            iconClassName={busy ? "animate-icon-spin" : undefined}
            disabled={busy}
            style={{
              ...iconButtonBaseStyle,
              ...buttonSecondary,
              padding: "0.5rem 0.85rem",
              ...(busy ? { opacity: 0.85, cursor: "wait" } : {}),
            }}
            onClick={() => void recalcPointsNow()}
          />
        </div>
      </form>
      {message ? <p style={{ color: "var(--accent)", marginTop: 0 }}>{message}</p> : null}
      {applyError ? (
        <p role="alert" style={{ color: "var(--danger)", marginTop: 0 }}>
          {applyError}
        </p>
      ) : null}
    </main>
  );
}

const headingRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: "0.9rem",
};
const tipTextStyle: CSSProperties = { margin: "0 0 0.45rem", color: "var(--text)" };
const sectionsWrapStyle: CSSProperties = {
  display: "grid",
  gap: "0.85rem",
  marginBottom: "1rem",
};
const configSectionStyle: CSSProperties = {
  background: "var(--surface)",
  borderRadius: 12,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
  padding: "0.8rem 0.9rem",
};
const sectionTitleStyle: CSSProperties = {
  margin: "0 0 0.65rem",
  fontSize: "0.95rem",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};
const subSectionsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 22rem), 1fr))",
  gap: "0.75rem",
};
const subSectionStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "0.65rem 0.7rem",
  background: "color-mix(in srgb, var(--bg) 65%, var(--surface))",
};
const subSectionTitleStyle: CSSProperties = {
  margin: "0 0 0.55rem",
  fontSize: "0.82rem",
  fontWeight: 700,
  textTransform: "uppercase",
  color: "var(--muted)",
  letterSpacing: "0.04em",
};
const rowsWrapStyle: CSSProperties = { display: "grid", gap: "0.5rem" };
const ruleRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr minmax(6rem, 8rem)",
  gap: "0.65rem",
  alignItems: "center",
};
const ruleLabelStyle: CSSProperties = { fontSize: "0.9rem", minWidth: 0 };
const bonusPairRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "0.65rem",
};
const bonusCellStyle: CSSProperties = { display: "grid", gap: "0.35rem", minWidth: 0 };
const bonusFieldLabelStyle: CSSProperties = { fontSize: "0.8rem", color: "var(--muted)" };
const labelStackStyle: CSSProperties = { display: "grid", gap: "0.35rem", minWidth: 0 };
const seasonWarningStyle: CSSProperties = {
  margin: "0.2rem 0 0",
  color: "var(--muted)",
  fontSize: "0.9rem",
  lineHeight: 1.4,
};
const playersListStyle: CSSProperties = {
  display: "grid",
  gap: "0.35rem",
  maxHeight: "20rem",
  overflow: "auto",
  padding: "0.5rem 0.6rem",
  border: "1px solid var(--border)",
  borderRadius: 10,
  background: "color-mix(in srgb, var(--bg) 65%, var(--surface))",
};
const playerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "0.18rem 0",
};
const inputStyle: CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "1rem",
  minHeight: "2.5rem",
};
const buttonPrimary: CSSProperties = {
  border: "none",
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontWeight: 700,
};
const buttonSecondary: CSSProperties = {
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
};
const buttonDanger: CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))",
  background: "color-mix(in srgb, var(--danger) 8%, var(--surface))",
  color: "var(--danger)",
  fontWeight: 600,
};
const plainButtonStyle: CSSProperties = {
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  borderRadius: 8,
  padding: "0.45rem 0.7rem",
  cursor: "pointer",
  fontWeight: 600,
};
