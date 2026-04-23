import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  formatMatchHourDisplay,
  MATCH_HOUR_VALUES,
  normalizeMatchHour,
} from "../domain/format";
import type { Match, MatchStatus, MatchesFile, PlayerId } from "../domain/types";
import { useSeasonData } from "../season/SeasonDataContext";

const today = () => new Date().toISOString().slice(0, 10);
const VENUE_OPTIONS = ["La Cancha", "Argoulets", "Blagnac"] as const;

type Mode = "add" | "edit";

export function MatchFormPage({ mode }: { mode: Mode }) {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data, error, loading, saveMatchesFile } = useSeasonData();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) navigate("/parties", { replace: true });
  }, [isAdmin, navigate]);

  const players = useMemo(
    () =>
      (data?.players.players ?? [])
        .slice()
        .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr")),
    [data?.players.players],
  );

  if (!isAdmin) return null;
  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data) return <p>Chargement…</p>;

  if (mode === "edit" && (!matchId || !data.matches.matches.some((m) => m.id === matchId))) {
    return (
      <main>
        <p>Partie introuvable.</p>
        <p>
          <Link to="/parties">Retour aux parties</Link>
        </p>
      </main>
    );
  }

  async function persist(nextMatches: Match[]) {
    const next: MatchesFile = {
      ...data.matches,
      matches: nextMatches,
      updatedAt: today(),
    };
    setSaveError(null);
    setSaving(true);
    try {
      await saveMatchesFile(next);
      navigate("/parties", { replace: true });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        <Link to="/parties" style={backLinkStyle}>
          ← Retour aux parties
        </Link>
      </p>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>{mode === "add" ? "Ajouter une partie" : "Modifier une partie"}</h2>
      {saveError ? <p role="alert" style={{ color: "#f87171", margin: "0 0 1rem" }}>{saveError}</p> : null}
      <MatchForm
        players={players}
        matches={data.matches.matches}
        editingMatchId={mode === "edit" ? matchId : undefined}
        saving={saving}
        onSubmit={persist}
        onCancel={() => navigate("/parties")}
      />
    </main>
  );
}

function MatchForm({
  players,
  matches,
  editingMatchId,
  saving,
  onSubmit,
  onCancel,
}: {
  players: { id: string; firstName: string; lastName: string }[];
  matches: Match[];
  editingMatchId?: string;
  saving: boolean;
  onSubmit: (matches: Match[]) => Promise<void>;
  onCancel?: () => void;
}) {
  const editingMatch = editingMatchId ? (matches.find((m) => m.id === editingMatchId) ?? null) : null;
  const [date, setDate] = useState(editingMatch?.date ?? today());
  const [time, setTime] = useState(normalizeMatchHour(editingMatch?.time));
  const [venue, setVenue] = useState(editingMatch?.venue ?? "La Cancha");
  const [status, setStatus] = useState<MatchStatus>(editingMatch?.status ?? "scheduled");
  const [teamA1, setTeamA1] = useState<string>(editingMatch?.teamA[0] ?? "");
  const [teamA2, setTeamA2] = useState<string>(editingMatch?.teamA[1] ?? "");
  const [teamB1, setTeamB1] = useState<string>(editingMatch?.teamB[0] ?? "");
  const [teamB2, setTeamB2] = useState<string>(editingMatch?.teamB[1] ?? "");
  const [scoreTeamA, setScoreTeamA] = useState(String(editingMatch?.scoreTeamA ?? ""));
  const [scoreTeamB, setScoreTeamB] = useState(String(editingMatch?.scoreTeamB ?? ""));

  const heureOptions = useMemo(() => {
    const cur = time.trim();
    const base = [...MATCH_HOUR_VALUES];
    if (cur && !base.includes(cur)) base.push(cur);
    base.sort();
    return base;
  }, [time]);

  useEffect(() => {
    if (!editingMatch) return;
    setDate(editingMatch.date);
    setTime(normalizeMatchHour(editingMatch.time));
    setVenue(editingMatch.venue ?? "La Cancha");
    setStatus(editingMatch.status);
    setTeamA1(editingMatch.teamA[0]);
    setTeamA2(editingMatch.teamA[1]);
    setTeamB1(editingMatch.teamB[0]);
    setTeamB2(editingMatch.teamB[1]);
    setScoreTeamA(editingMatch.scoreTeamA == null ? "" : String(editingMatch.scoreTeamA));
    setScoreTeamB(editingMatch.scoreTeamB == null ? "" : String(editingMatch.scoreTeamB));
  }, [editingMatchId, editingMatch]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!teamA1 || !teamA2 || !teamB1 || !teamB2) return;
    const base: Match = {
      id: editingMatch?.id ?? `match-${Date.now()}`,
      seasonId: editingMatch?.seasonId ?? (matches[0]?.seasonId || "saison"),
      date,
      venue: venue.trim(),
      status,
      teamA: [teamA1 as PlayerId, teamA2 as PlayerId],
      teamB: [teamB1 as PlayerId, teamB2 as PlayerId],
    };
    const t = time.trim();
    if (t) base.time = t;
    if (status === "played") {
      const a = Number(scoreTeamA);
      const b = Number(scoreTeamB);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return;
      base.scoreTeamA = Math.round(a);
      base.scoreTeamB = Math.round(b);
    }
    const next = editingMatch ? matches.map((m) => (m.id === editingMatch.id ? base : m)) : [...matches, base];
    await onSubmit(next);
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={formStyle}>
      <div className="responsive-form-grid" style={gridStyle}>
        <label style={labelStyle}>
          Date
          <input type="date" value={date} disabled={saving} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Heure
          <select value={time} disabled={saving} onChange={(e) => setTime(e.target.value)} style={inputStyle}>
            <option value="">Non précisée</option>
            {heureOptions.map((hourVal) => (
              <option key={hourVal} value={hourVal}>
                {formatMatchHourDisplay(hourVal)}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Lieu
          <select value={venue} disabled={saving} onChange={(e) => setVenue(e.target.value)} style={inputStyle}>
            {VENUE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label style={labelStyle}>
          Statut
          <select value={status} disabled={saving} onChange={(e) => setStatus(e.target.value as MatchStatus)} style={inputStyle}>
            <option value="scheduled">Prévue</option>
            <option value="played">Jouée</option>
            <option value="cancelled">Annulée</option>
          </select>
        </label>
      </div>
      <div style={formTeamSectionStyle}>
        <div style={{ ...formTeamHeaderStyle, borderLeftColor: "var(--accent)" }}>Équipe 1</div>
        <div className="responsive-form-grid" style={formTeamGridStyle}>
          <label style={labelStyle}>
            Joueur
            <PlayerSelect players={players} value={teamA1} setValue={setTeamA1} saving={saving} excludedIds={[teamA2, teamB1, teamB2]} />
          </label>
          <label style={labelStyle}>
            Joueur
            <PlayerSelect players={players} value={teamA2} setValue={setTeamA2} saving={saving} excludedIds={[teamA1, teamB1, teamB2]} />
          </label>
          {status === "played" ? (
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Points marqués (équipe 1)
              <input
                type="number"
                value={scoreTeamA}
                disabled={saving}
                onChange={(e) => setScoreTeamA(e.target.value)}
                required
                style={inputStyle}
              />
            </label>
          ) : null}
        </div>
      </div>
      <div style={formTeamSectionStyle}>
        <div style={{ ...formTeamHeaderStyle, borderLeftColor: "#64748b" }}>Équipe 2</div>
        <div className="responsive-form-grid" style={formTeamGridStyle}>
          <label style={labelStyle}>
            Joueur
            <PlayerSelect players={players} value={teamB1} setValue={setTeamB1} saving={saving} excludedIds={[teamA1, teamA2, teamB2]} />
          </label>
          <label style={labelStyle}>
            Joueur
            <PlayerSelect players={players} value={teamB2} setValue={setTeamB2} saving={saving} excludedIds={[teamA1, teamA2, teamB1]} />
          </label>
          {status === "played" ? (
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Points marqués (équipe 2)
              <input
                type="number"
                value={scoreTeamB}
                disabled={saving}
                onChange={(e) => setScoreTeamB(e.target.value)}
                required
                style={inputStyle}
              />
            </label>
          ) : null}
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={saving} style={buttonPrimary}>
          {editingMatch ? "Enregistrer" : "Ajouter"}
        </button>
        {onCancel ? (
          <button type="button" disabled={saving} style={buttonSecondary} onClick={onCancel}>
            Annuler
          </button>
        ) : null}
      </div>
    </form>
  );
}

function PlayerSelect({
  players,
  value,
  setValue,
  saving,
  excludedIds,
}: {
  players: { id: string; firstName: string; lastName: string }[];
  value: string;
  setValue: (value: string) => void;
  saving: boolean;
  excludedIds: string[];
}) {
  const available = players.filter((p) => !excludedIds.includes(p.id) || p.id === value);
  return (
    <select value={value} disabled={saving} onChange={(e) => setValue(e.target.value)} style={inputStyle}>
      <option value="">Choisir un joueur</option>
      {available.map((p) => (
        <option key={p.id} value={p.id}>
          {p.firstName} {p.lastName}
        </option>
      ))}
    </select>
  );
}

const backLinkStyle: CSSProperties = { fontWeight: 600, textDecoration: "none" };
const formStyle: CSSProperties = { marginTop: "0.5rem", background: "var(--surface)", borderRadius: 12, padding: "1rem" };
const gridStyle: CSSProperties = { gap: 10, marginBottom: "0.75rem" };
const formTeamSectionStyle: CSSProperties = {
  marginBottom: "0.85rem",
  padding: "0.75rem 0.85rem 0.9rem",
  borderRadius: 10,
  border: "1px solid var(--muted)",
  background: "var(--bg)",
};
const formTeamHeaderStyle: CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--muted)",
  marginBottom: 10,
  paddingLeft: 10,
  borderLeft: "3px solid var(--accent)",
};
const formTeamGridStyle: CSSProperties = { gap: 10 };
const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: "0.85rem", color: "var(--muted)", minWidth: 0 };
const inputStyle: CSSProperties = {
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
  minHeight: "2.75rem",
};
const buttonPrimary: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  minHeight: "2.75rem",
};
const buttonSecondary: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
  minHeight: "2.75rem",
};
