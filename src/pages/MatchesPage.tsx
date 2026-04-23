import { useState, type CSSProperties } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  formatDateLongFr,
  formatMatchHourDisplay,
  formatTeamLabel,
  playerById,
} from "../domain/format";
import { hasPeloteScore } from "../domain/matchScore";
import type { Match, MatchStatus, Player, PlayerId } from "../domain/types";
import { openAppPathInNewWindow } from "../navigation/openAppPathInNewWindow";
import { useSeasonData } from "../season/SeasonDataContext";

function matchStatusLabel(s: MatchStatus): string {
  if (s === "played") return "Jouée";
  if (s === "scheduled") return "Prévue";
  if (s === "cancelled") return "Annulée";
  return s;
}

const compositionStackStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };
const compositionRowBase: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "0.35rem 0.75rem",
  padding: "0.35rem 0 0.35rem 0.65rem",
  borderRadius: 8,
  borderLeft: "3px solid var(--accent)",
  background: "var(--bg)",
};
const compositionRowB: CSSProperties = {
  ...compositionRowBase,
  borderLeftColor: "#64748b",
};
const compositionNamesStyle: CSSProperties = { flex: "1 1 8rem", minWidth: 0 };
const compositionScoreStyle: CSSProperties = { fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 };

function MatchCompositionCell({ m, map }: { m: Match; map: Map<PlayerId, Player> }) {
  const scored = hasPeloteScore(m);
  return (
    <div style={compositionStackStyle}>
      <div style={compositionRowBase}>
        <span style={compositionNamesStyle}>{formatTeamLabel(m.teamA, map)}</span>
        {scored ? <span style={compositionScoreStyle}>{m.scoreTeamA}</span> : null}
      </div>
      <div style={compositionRowB}>
        <span style={compositionNamesStyle}>{formatTeamLabel(m.teamB, map)}</span>
        {scored ? <span style={compositionScoreStyle}>{m.scoreTeamB}</span> : null}
      </div>
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function MatchesPage() {
  const { data, error, loading, saveMatchesFile } = useSeasonData();
  const { isAdmin } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data) return <p>Chargement…</p>;

  const map = playerById(data.players.players);
  const list = [...data.matches.matches].sort((a, b) => b.date.localeCompare(a.date));

  async function deleteMatch(m: Match) {
    const label = `${formatDateLongFr(m.date)} — ${formatTeamLabel(m.teamA, map)} / ${formatTeamLabel(m.teamB, map)}`;
    if (!window.confirm(`Supprimer cette partie ?\n\n${label}\n\nLes points des joueurs seront mis à jour si la partie était jouée.`)) {
      return;
    }
    setDeleteError(null);
    setDeletingId(m.id);
    try {
      const nextMatches = data.matches.matches.filter((x) => x.id !== m.id);
      await saveMatchesFile({
        ...data.matches,
        matches: nextMatches,
        updatedAt: today(),
      });
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Parties</h2>
      {deleteError ? (
        <p role="alert" style={{ color: "#f87171", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
          {deleteError}
        </p>
      ) : null}
      {isAdmin ? (
        <div style={{ display: "flex", gap: 8, marginBottom: "0.8rem", flexWrap: "wrap" }}>
          <button
            type="button"
            style={buttonPrimary}
            onClick={() => openAppPathInNewWindow("/parties/ajout")}
            aria-label="Ajouter une partie dans un nouvel onglet"
          >
            Ajouter
          </button>
        </div>
      ) : null}
      <div className="table-scroll">
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Heure</th>
              <th style={thStyle}>Lieu</th>
              <th style={thStyle}>Composition</th>
              <th style={thStyle}>Statut</th>
              {isAdmin ? <th style={thStyle}>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={tdStyle}>{formatDateLongFr(m.date)}</td>
                <td style={tdStyle}>{m.time ? formatMatchHourDisplay(m.time) : "-"}</td>
                <td style={tdStyle}>{m.venue || "-"}</td>
                <td style={tdStyle}>
                  <MatchCompositionCell m={m} map={map} />
                </td>
                <td style={tdStyle}>{matchStatusLabel(m.status)}</td>
                {isAdmin ? (
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        style={buttonSecondary}
                        onClick={() => openAppPathInNewWindow(`/parties/${encodeURIComponent(m.id)}/modifier`)}
                        aria-label={`Modifier la partie du ${m.date} dans un nouvel onglet`}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        style={buttonDanger}
                        disabled={deletingId !== null}
                        onClick={() => void deleteMatch(m)}
                        aria-label={`Supprimer la partie du ${m.date}`}
                      >
                        {deletingId === m.id ? "…" : "Supprimer"}
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: "36rem",
  borderCollapse: "collapse",
  background: "var(--surface)",
  borderRadius: 12,
  overflow: "hidden",
};
const thStyle: CSSProperties = { textAlign: "left", padding: "0.6rem", borderBottom: "1px solid var(--muted)" };
const tdStyle: CSSProperties = { padding: "0.6rem", borderBottom: "1px solid #334155" };
const buttonPrimary: CSSProperties = { padding: "0.45rem 0.9rem", borderRadius: 8, border: "none", background: "var(--accent)", color: "#0f172a", fontWeight: 700, cursor: "pointer", minHeight: "2.75rem" };
const buttonSecondary: CSSProperties = {
  padding: "0.45rem 0.9rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
  minHeight: "2.75rem",
};
const buttonDanger: CSSProperties = {
  padding: "0.45rem 0.9rem",
  borderRadius: 8,
  border: "1px solid #f87171",
  background: "transparent",
  color: "#fca5a5",
  fontWeight: 600,
  cursor: "pointer",
  minHeight: "2.75rem",
};
