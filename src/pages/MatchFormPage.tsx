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
import type { Match, MatchStatus, MatchesFile, Player, PlayerId } from "../domain/types";
import { useSeasonData } from "../season/SeasonDataContext";

const today = () => new Date().toISOString().slice(0, 10);
const VENUE_OPTIONS = ["La Cancha", "Argoulets", "Blagnac"] as const;

type Mode = "add" | "edit";

function splitDoublesByPoste(ids: [PlayerId, PlayerId], byId: Map<PlayerId, Player>): { arriere: string; avant: string } {
  const [a, b] = ids;
  const pa = byId.get(a);
  const pb = byId.get(b);
  if (pa?.poste === "arriere" && pb?.poste === "avant") return { arriere: a, avant: b };
  if (pa?.poste === "avant" && pb?.poste === "arriere") return { arriere: b, avant: a };
  if (pa?.poste === "arriere") return { arriere: a, avant: pb?.poste === "avant" ? b : "" };
  if (pb?.poste === "arriere") return { arriere: b, avant: pa?.poste === "avant" ? a : "" };
  if (pa?.poste === "avant") return { arriere: pb?.poste === "arriere" ? b : "", avant: a };
  if (pb?.poste === "avant") return { arriere: pa?.poste === "arriere" ? a : "", avant: b };
  return { arriere: a, avant: b };
}

export function MatchFormPage({ mode }: { mode: Mode }) {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { canManageLeague } = useAuth();
  const { data, error, loading, saveMatchesFile } = useSeasonData();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const players = useMemo(() => {
    const all = data?.players.players ?? [];
    const inEditingMatch =
      mode === "edit" && matchId ? data?.matches.matches.find((m) => m.id === matchId) : undefined;
    const allowInactive = new Set<PlayerId>();
    if (inEditingMatch) {
      for (const id of [...inEditingMatch.teamA, ...inEditingMatch.teamB]) allowInactive.add(id);
    }
    return all
      .filter((p) => playerIsActive(p) || allowInactive.has(p.id))
      .slice()
      .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"));
  }, [data?.players.players, data?.matches.matches, mode, matchId]);

  if (!canManageLeague) return <Navigate to="/parties" replace />;
  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data) return <p>Chargement…</p>;

  if (mode === "edit" && (!matchId || !data.matches.matches.some((m) => m.id === matchId))) {
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
      <h2 style={{ fontSize: "1.15rem", marginTop: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>
        {mode === "add" ? "Nouvelle partie" : "Modifier la partie"}
      </h2>
      {saveError ? <p role="alert" style={{ color: "var(--danger)", margin: "0 0 1rem" }}>{saveError}</p> : null}
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
  players: Player[];
  matches: Match[];
  editingMatchId?: string;
  saving: boolean;
  onSubmit: (matches: Match[]) => Promise<void>;
  onCancel?: () => void;
}) {
  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const editingMatch = editingMatchId ? (matches.find((m) => m.id === editingMatchId) ?? null) : null;

  const initialSlots = useMemo(() => {
    if (!editingMatch) {
      return { aA: "", aAv: "", bA: "", bAv: "" };
    }
    const ta = splitDoublesByPoste(editingMatch.teamA, playerMap);
    const tb = splitDoublesByPoste(editingMatch.teamB, playerMap);
    return { aA: ta.arriere, aAv: ta.avant, bA: tb.arriere, bAv: tb.avant };
  }, [editingMatch, playerMap]);

  const [date, setDate] = useState(editingMatch?.date ?? today());
  const [time, setTime] = useState(normalizeMatchHour(editingMatch?.time));
  const [venue, setVenue] = useState(editingMatch?.venue ?? "La Cancha");
  const [status, setStatus] = useState<MatchStatus>(editingMatch?.status ?? "scheduled");
  const [teamA_arriere, setTeamA_arriere] = useState(initialSlots.aA);
  const [teamA_avant, setTeamA_avant] = useState(initialSlots.aAv);
  const [teamB_arriere, setTeamB_arriere] = useState(initialSlots.bA);
  const [teamB_avant, setTeamB_avant] = useState(initialSlots.bAv);
  const [scoreTeamA, setScoreTeamA] = useState(String(editingMatch?.scoreTeamA ?? ""));
  const [scoreTeamB, setScoreTeamB] = useState(String(editingMatch?.scoreTeamB ?? ""));

  const heureOptions = useMemo(() => {
    const cur = normalizeMatchHour(time);
    const base = [...MATCH_HOUR_DAY_RANGE];
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
    const ta = splitDoublesByPoste(editingMatch.teamA, playerMap);
    const tb = splitDoublesByPoste(editingMatch.teamB, playerMap);
    setTeamA_arriere(ta.arriere);
    setTeamA_avant(ta.avant);
    setTeamB_arriere(tb.arriere);
    setTeamB_avant(tb.avant);
    setScoreTeamA(editingMatch.scoreTeamA == null ? "" : String(editingMatch.scoreTeamA));
    setScoreTeamB(editingMatch.scoreTeamB == null ? "" : String(editingMatch.scoreTeamB));
  }, [editingMatchId, editingMatch, playerMap]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!teamA_arriere || !teamA_avant || !teamB_arriere || !teamB_avant) return;
    const base: Match = {
      id: editingMatch?.id ?? `match-${Date.now()}`,
      seasonId: editingMatch?.seasonId ?? (matches[0]?.seasonId || "saison"),
      date,
      venue: venue.trim(),
      status,
      teamA: [teamA_arriere as PlayerId, teamA_avant as PlayerId],
      teamB: [teamB_arriere as PlayerId, teamB_avant as PlayerId],
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

  const otherIds = (slot: "aAr" | "aAv" | "bAr" | "bAv") => {
    const m = { aAr: teamA_arriere, aAv: teamA_avant, bAr: teamB_arriere, bAv: teamB_avant };
    const cur = m[slot];
    return [teamA_arriere, teamA_avant, teamB_arriere, teamB_avant].filter((id) => id && id !== cur);
  };

  return (
    <form onSubmit={(e) => void submit(e)} style={formStyle}>
      <section style={metaSectionStyle}>
        <div style={metaGridStyle}>
          <label style={labelCompactStyle}>
            <span style={labelSpanStyle}>Date</span>
            <input type="date" value={date} disabled={saving} onChange={(e) => setDate(e.target.value)} required style={inputStyle} />
          </label>
          <label style={labelCompactStyle}>
            <span style={labelSpanStyle}>Heure (9h–22h)</span>
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
              {VENUE_OPTIONS.map((option) => (
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
          arriereId={teamA_arriere}
          avantId={teamA_avant}
          onArriere={setTeamA_arriere}
          onAvant={setTeamA_avant}
          players={players}
          excludedArriere={otherIds("aAr")}
          excludedAvant={otherIds("aAv")}
          saving={saving}
          status={status}
          score={scoreTeamA}
          onScore={setScoreTeamA}
          scoreLabel="Points (40) — équipe 1"
        />
        <TeamCard
          title="Équipe 2"
          accent="#94a3b8"
          arriereId={teamB_arriere}
          avantId={teamB_avant}
          onArriere={setTeamB_arriere}
          onAvant={setTeamB_avant}
          players={players}
          excludedArriere={otherIds("bAr")}
          excludedAvant={otherIds("bAv")}
          saving={saving}
          status={status}
          score={scoreTeamB}
          onScore={setScoreTeamB}
          scoreLabel="Points (40) — équipe 2"
        />
      </div>

      <div className="form-actions" style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: 10 }}>
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
      </div>
    </form>
  );
}

function TeamCard({
  title,
  accent,
  arriereId,
  avantId,
  onArriere,
  onAvant,
  players,
  excludedArriere,
  excludedAvant,
  saving,
  status,
  score,
  onScore,
  scoreLabel,
}: {
  title: string;
  accent: string;
  arriereId: string;
  avantId: string;
  onArriere: (v: string) => void;
  onAvant: (v: string) => void;
  players: Player[];
  excludedArriere: string[];
  excludedAvant: string[];
  saving: boolean;
  status: MatchStatus;
  score: string;
  onScore: (v: string) => void;
  scoreLabel: string;
}) {
  return (
    <div style={{ ...teamCardStyle, borderColor: "color-mix(in srgb, var(--muted) 55%, transparent)" }}>
      <div style={{ ...teamCardHeaderStyle, borderLeftColor: accent }}>{title}</div>
      <div style={postesGridStyle}>
        <label style={labelCompactStyle}>
          <span style={labelSpanStyle}>Arrière</span>
          <PlayerSelect
            players={players}
            poste="arriere"
            value={arriereId}
            setValue={onArriere}
            saving={saving}
            excludedIds={excludedArriere}
          />
        </label>
        <label style={labelCompactStyle}>
          <span style={labelSpanStyle}>Avant</span>
          <PlayerSelect
            players={players}
            poste="avant"
            value={avantId}
            setValue={onAvant}
            saving={saving}
            excludedIds={excludedAvant}
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
  poste,
  value,
  setValue,
  saving,
  excludedIds,
}: {
  players: Player[];
  poste: Player["poste"];
  value: string;
  setValue: (value: string) => void;
  saving: boolean;
  excludedIds: string[];
}) {
  const available = players.filter((p) => {
    if (p.id === value) return true;
    return p.poste === poste && !excludedIds.includes(p.id);
  });
  return (
    <select value={value} disabled={saving} onChange={(e) => setValue(e.target.value)} style={inputStyle}>
      <option value="">—</option>
      {available.map((p) => (
        <option key={p.id} value={p.id}>
          {p.firstName} {p.lastName}
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
const postesGridStyle: CSSProperties = {
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
