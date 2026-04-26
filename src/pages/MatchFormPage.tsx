import { Loader2, Save, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { iconButtonBaseStyle } from "../components/IconActionButton";
import { AppLink } from "../navigation/AppLink";
import { useAuth } from "../auth/AuthContext";
import {
  formatMatchHourDisplay,
  MATCH_HOUR_DAY_RANGE,
  normalizeMatchHour,
} from "../domain/format";
import { playerIsActive } from "../domain/playerActive";
import { playerCompactName } from "../domain/format";
import type { Match, MatchStatus, MatchesFile, Player, PlayerId } from "../domain/types";
import { useSeasonData } from "../season/SeasonDataContext";

const today = () => new Date().toISOString().slice(0, 10);
const PREDEFINED_VENUES = ["La Cancha", "Argoulets", "Blagnac"] as const;
/** Même glyphe que l’option vide « Heure » (tiret cadratin U+2014). */
const VENUE_NONE = "—";

export function MatchFormPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { canManageLeague } = useAuth();
  const { data, error, loading, saveMatchesFile } = useSeasonData();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const players = useMemo(() => {
    const all = data?.players.players ?? [];
    const inEditingMatch = matchId ? data?.matches.matches.find((m) => m.id === matchId) : undefined;
    const allowInactive = new Set<PlayerId>();
    if (inEditingMatch) {
      for (const id of [...inEditingMatch.teamA, ...inEditingMatch.teamB]) allowInactive.add(id);
    }
    return all
      .filter((p) => playerIsActive(p) || allowInactive.has(p.id))
      .slice()
      .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"));
  }, [data?.players.players, data?.matches.matches, matchId]);

  if (!canManageLeague) return <Navigate to="/parties" replace />;
  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data) return <p>Chargement…</p>;

  if (!matchId || !data.matches.matches.some((m) => m.id === matchId)) {
    return (
      <main>
        <p>Partie introuvable.</p>
        <p>
          <AppLink to="/parties">Retour aux parties</AppLink>
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
        <AppLink to="/parties" style={backLinkStyle}>
          ← Retour aux parties
        </AppLink>
      </p>
      <h2 style={{ fontSize: "1.15rem", marginTop: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>Modifier la partie</h2>
      {saveError ? <p role="alert" style={{ color: "var(--danger)", margin: "0 0 1rem" }}>{saveError}</p> : null}
      <MatchForm
        players={players}
        matches={data.matches.matches}
        seasonId={data.matches.seasonId}
        editingMatchId={matchId}
        saving={saving}
        onSubmit={persist}
        onCancel={() => navigate("/parties")}
      />
    </main>
  );
}

export function MatchForm({
  players,
  matches,
  seasonId,
  editingMatchId,
  saving,
  onSubmit,
  onCancel,
  embeddedInModal,
}: {
  players: Player[];
  matches: Match[];
  seasonId: string;
  editingMatchId?: string;
  saving: boolean;
  onSubmit: (matches: Match[]) => Promise<void>;
  onCancel?: () => void;
  /** Formulaire dans une fenêtre modale (même look & feel que l’admin joueurs). */
  embeddedInModal?: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const editingMatch = editingMatchId ? (matches.find((m) => m.id === editingMatchId) ?? null) : null;

  const initialSlots = useMemo(() => {
    if (!editingMatch) {
      return { a1: "", a2: "", b1: "", b2: "" };
    }
    return {
      a1: editingMatch.teamA[0] ?? "",
      a2: editingMatch.teamA[1] ?? "",
      b1: editingMatch.teamB[0] ?? "",
      b2: editingMatch.teamB[1] ?? "",
    };
  }, [editingMatch]);

  const [date, setDate] = useState(editingMatch?.date ?? today());
  const [time, setTime] = useState(normalizeMatchHour(editingMatch?.time));
  const [venue, setVenue] = useState(editingMatch?.venue?.trim() ? editingMatch.venue : VENUE_NONE);
  const [status, setStatus] = useState<MatchStatus>(editingMatch?.status ?? "scheduled");
  const [teamA_player1, setTeamA_player1] = useState(initialSlots.a1);
  const [teamA_player2, setTeamA_player2] = useState(initialSlots.a2);
  const [teamB_player1, setTeamB_player1] = useState(initialSlots.b1);
  const [teamB_player2, setTeamB_player2] = useState(initialSlots.b2);
  const [scoreTeamA, setScoreTeamA] = useState(String(editingMatch?.scoreTeamA ?? ""));
  const [scoreTeamB, setScoreTeamB] = useState(String(editingMatch?.scoreTeamB ?? ""));

  const heureOptions = useMemo(() => {
    const cur = normalizeMatchHour(time);
    const base = [...MATCH_HOUR_DAY_RANGE];
    if (cur && !base.includes(cur)) base.push(cur);
    base.sort();
    return base;
  }, [time]);

  const venueSelectOptions = useMemo(() => {
    const cur = venue.trim();
    const predefined = [...PREDEFINED_VENUES];
    const extra: string[] = [];
    if (cur && cur !== VENUE_NONE && !predefined.includes(cur as (typeof PREDEFINED_VENUES)[number])) extra.push(cur);
    return [VENUE_NONE, ...extra, ...predefined];
  }, [venue]);

  useEffect(() => {
    if (!editingMatch) return;
    setDate(editingMatch.date);
    setTime(normalizeMatchHour(editingMatch.time));
    setVenue(editingMatch.venue?.trim() ? editingMatch.venue : VENUE_NONE);
    setStatus(editingMatch.status);
    setTeamA_player1(editingMatch.teamA[0] ?? "");
    setTeamA_player2(editingMatch.teamA[1] ?? "");
    setTeamB_player1(editingMatch.teamB[0] ?? "");
    setTeamB_player2(editingMatch.teamB[1] ?? "");
    setScoreTeamA(editingMatch.scoreTeamA == null ? "" : String(editingMatch.scoreTeamA));
    setScoreTeamB(editingMatch.scoreTeamB == null ? "" : String(editingMatch.scoreTeamB));
  }, [editingMatchId, editingMatch]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const normalizedSeasonId = seasonId.trim();
    if (!/^[a-zA-Z0-9_-]+$/.test(normalizedSeasonId)) {
      setFormError("Saison invalide : identifiant manquant ou incorrect. Ouvrez Config puis réessayez.");
      return;
    }
    if (!teamA_player1 || !teamA_player2 || !teamB_player1 || !teamB_player2) return;
    const venueTrim = venue.trim();
    const base: Match = {
      id: editingMatch?.id ?? `match-${Date.now()}`,
      seasonId: editingMatch?.seasonId ?? normalizedSeasonId,
      date,
      status,
      teamA: [teamA_player1 as PlayerId, teamA_player2 as PlayerId],
      teamB: [teamB_player1 as PlayerId, teamB_player2 as PlayerId],
    };
    if (venueTrim && venueTrim !== VENUE_NONE) base.venue = venueTrim;
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

  const otherIds = (slot: "a1" | "a2" | "b1" | "b2") => {
    const m = { a1: teamA_player1, a2: teamA_player2, b1: teamB_player1, b2: teamB_player2 };
    const cur = m[slot];
    return [teamA_player1, teamA_player2, teamB_player1, teamB_player2].filter((id) => id && id !== cur);
  };

  const formShellStyle: CSSProperties = embeddedInModal
    ? {
        marginTop: 0,
        background: "transparent",
        borderRadius: 0,
        padding: 0,
        border: "none",
        boxShadow: "none",
      }
    : formStyle;

  return (
    <form onSubmit={(e) => void submit(e)} style={formShellStyle}>
      {formError ? (
        <p role="alert" style={{ margin: "0 0 0.7rem", color: "var(--danger)" }}>
          {formError}
        </p>
      ) : null}
      <section style={metaSectionStyle}>
        <div style={metaGridStyle}>
          <label style={labelCompactStyle}>
            <span style={labelSpanStyle}>Date</span>
            <input type="date" value={date} disabled={saving} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
          </label>
          <label style={labelCompactStyle}>
            <span style={labelSpanStyle}>Heure</span>
            <select value={time} disabled={saving} onChange={(e) => setTime(e.target.value)} style={inputStyle}>
              <option value="">—</option>
              {heureOptions.map((hourVal) => (
                <option key={hourVal} value={hourVal}>
                  {formatMatchHourDisplay(hourVal)}
                </option>
              ))}
            </select>
          </label>
          <label style={labelCompactStyle}>
            <span style={labelSpanStyle}>Lieu</span>
            <select value={venue} disabled={saving} onChange={(e) => setVenue(e.target.value)} style={inputStyle}>
              {venueSelectOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label style={labelCompactStyle}>
            <span style={labelSpanStyle}>Statut</span>
            <select value={status} disabled={saving} onChange={(e) => setStatus(e.target.value as MatchStatus)} style={inputStyle}>
              <option value="scheduled">Prévue</option>
              <option value="played">Jouée</option>
              <option value="cancelled">Annulée</option>
            </select>
          </label>
        </div>
      </section>

      <div style={teamsRowStyle}>
        <TeamCard
          title="Équipe 1"
          accent="var(--accent)"
          player1Id={teamA_player1}
          player2Id={teamA_player2}
          onPlayer1={setTeamA_player1}
          onPlayer2={setTeamA_player2}
          players={players}
          excludedPlayer1={otherIds("a1")}
          excludedPlayer2={otherIds("a2")}
          saving={saving}
          status={status}
          score={scoreTeamA}
          onScore={setScoreTeamA}
          scoreLabel="Points (40) — équipe 1"
        />
        <TeamCard
          title="Équipe 2"
          accent="#94a3b8"
          player1Id={teamB_player1}
          player2Id={teamB_player2}
          onPlayer1={setTeamB_player1}
          onPlayer2={setTeamB_player2}
          players={players}
          excludedPlayer1={otherIds("b1")}
          excludedPlayer2={otherIds("b2")}
          saving={saving}
          status={status}
          score={scoreTeamB}
          onScore={setScoreTeamB}
          scoreLabel="Points (40) — équipe 2"
        />
      </div>

      <div
        className="form-actions"
        style={{
          marginTop: embeddedInModal ? "0.85rem" : "1rem",
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          justifyContent: "flex-end",
        }}
      >
        {onCancel ? (
          <button
            type="button"
            disabled={saving}
            aria-label="Annuler"
            title="Annuler"
            style={{ ...iconButtonBaseStyle, ...buttonSecondary, padding: "0.55rem 0.85rem" }}
            onClick={onCancel}
          >
            <X size={20} strokeWidth={2} aria-hidden focusable={false} />
          </button>
        ) : null}
        <button
          type="submit"
          disabled={saving}
          aria-label={editingMatch ? "Enregistrer la partie" : "Ajouter la partie"}
          title={editingMatch ? "Enregistrer" : "Ajouter la partie"}
          style={{ ...iconButtonBaseStyle, ...buttonPrimary, border: "none", minWidth: "2.75rem", padding: "0.55rem 0.85rem" }}
        >
          {saving ? (
            <Loader2 size={20} strokeWidth={2} className="animate-icon-spin" aria-hidden focusable={false} />
          ) : (
            <Save size={20} strokeWidth={2} aria-hidden focusable={false} />
          )}
        </button>
      </div>
    </form>
  );
}

function TeamCard({
  title,
  accent,
  player1Id,
  player2Id,
  onPlayer1,
  onPlayer2,
  players,
  excludedPlayer1,
  excludedPlayer2,
  saving,
  status,
  score,
  onScore,
  scoreLabel,
}: {
  title: string;
  accent: string;
  player1Id: string;
  player2Id: string;
  onPlayer1: (v: string) => void;
  onPlayer2: (v: string) => void;
  players: Player[];
  excludedPlayer1: string[];
  excludedPlayer2: string[];
  saving: boolean;
  status: MatchStatus;
  score: string;
  onScore: (v: string) => void;
  scoreLabel: string;
}) {
  return (
    <div style={{ ...teamCardStyle, borderColor: "color-mix(in srgb, var(--muted) 55%, transparent)" }}>
      <div style={{ ...teamCardHeaderStyle, borderLeftColor: accent }}>{title}</div>
      <div style={playersGridStyle}>
        <label style={labelCompactStyle}>
          <span style={labelSpanStyle}>Joueur 1</span>
          <PlayerSelect
            players={players}
            value={player1Id}
            setValue={onPlayer1}
            saving={saving}
            excludedIds={excludedPlayer1}
          />
        </label>
        <label style={labelCompactStyle}>
          <span style={labelSpanStyle}>Joueur 2</span>
          <PlayerSelect
            players={players}
            value={player2Id}
            setValue={onPlayer2}
            saving={saving}
            excludedIds={excludedPlayer2}
          />
        </label>
      </div>
      {status === "played" ? (
        <label style={{ ...labelCompactStyle, marginTop: 10 }}>
          <span style={labelSpanStyle}>{scoreLabel}</span>
          <input type="number" value={score} disabled={saving} onChange={(e) => onScore(e.target.value)} required style={inputStyle} />
        </label>
      ) : null}
    </div>
  );
}

function PlayerSelect({
  players,
  value,
  setValue,
  saving,
  excludedIds,
}: {
  players: Player[];
  value: string;
  setValue: (value: string) => void;
  saving: boolean;
  excludedIds: string[];
}) {
  const available = players.filter((p) => {
    if (p.id === value) return true;
    return !excludedIds.includes(p.id);
  });
  return (
    <select value={value} disabled={saving} onChange={(e) => setValue(e.target.value)} style={inputStyle}>
      <option value="">—</option>
      {available.map((p) => (
        <option key={p.id} value={p.id}>
          {playerCompactName(p)}
        </option>
      ))}
    </select>
  );
}

const backLinkStyle: CSSProperties = { fontWeight: 600, textDecoration: "none" };
const formStyle: CSSProperties = {
  marginTop: "0.35rem",
  background: "var(--surface)",
  borderRadius: 16,
  padding: "1rem 1.1rem 1.15rem",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-md)",
};
const metaSectionStyle: CSSProperties = { marginBottom: "1rem" };
const metaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(9.5rem, 1fr))",
  gap: "0.65rem 0.75rem",
};
const teamsRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
  gap: "0.85rem",
  alignItems: "stretch",
};
const teamCardStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  padding: "0.85rem 0.9rem 1rem",
  background: "color-mix(in srgb, var(--bg) 55%, var(--surface))",
};
const teamCardHeaderStyle: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted)",
  marginBottom: "0.65rem",
  paddingLeft: 10,
  borderLeft: "3px solid",
};
const playersGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 10rem), 1fr))",
  gap: "0.65rem",
};
const labelCompactStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  minWidth: 0,
};
const labelSpanStyle: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
};
const inputStyle: CSSProperties = {
  padding: "0.5rem 0.6rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "0.95rem",
  minHeight: "2.55rem",
};
const buttonPrimary: CSSProperties = {
  padding: "0.55rem 1.1rem",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontWeight: 700,
  cursor: "pointer",
  minHeight: "2.75rem",
  fontSize: "0.95rem",
};
const buttonSecondary: CSSProperties = {
  padding: "0.55rem 1.1rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
  minHeight: "2.75rem",
  fontSize: "0.95rem",
};
