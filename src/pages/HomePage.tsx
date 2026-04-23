import { useMemo, useState, type CSSProperties } from "react";
import { formatDateLongFr, formatMatchHourDisplay, formatMatchLine, playerById, playerFullName } from "../domain/format";
import { maikaFromSeasonPoints } from "../domain/maika";
import { playerIsActive } from "../domain/playerActive";
import { posteLabel, rankingByPoste } from "../domain/ranking";
import type { Player } from "../domain/types";
import { useSeasonData } from "../season/SeasonDataContext";

function sortedForLeaderboard(players: Player[], poste: Player["poste"]): Player[] {
  return players
    .filter((p) => p.poste === poste && playerIsActive(p))
    .slice()
    .sort((a, b) => {
      if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
      return a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr");
    });
}

export function HomePage() {
  const { data, error, loading } = useSeasonData();
  const [selectedPoste, setSelectedPoste] = useState<Player["poste"]>("avant");

  const ranks = useMemo(() => {
    if (!data) return null;
    const list = data.players.players;
    return {
      avant: rankingByPoste(list, "avant"),
      arriere: rankingByPoste(list, "arriere"),
    };
  }, [data]);

  if (error) {
    return <p role="alert">Erreur : {error}</p>;
  }
  if (loading || !data || !ranks) {
    return <p>Chargement…</p>;
  }

  const map = playerById(data.players.players);
  const played = data.matches.matches.filter((m) => m.status === "played");
  const upcoming = data.matches.matches.filter((m) => m.status === "scheduled");
  const avants = sortedForLeaderboard(data.players.players, "avant");
  const arrieres = sortedForLeaderboard(data.players.players, "arriere");
  const playedCountByPlayer = new Map<string, number>();
  for (const m of played) {
    for (const id of [...m.teamA, ...m.teamB]) {
      playedCountByPlayer.set(id, (playedCountByPlayer.get(id) ?? 0) + 1);
    }
  }

  return (
    <main>
      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Classements</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: "0.8rem", flexWrap: "wrap" }}>
          <button
            type="button"
            style={selectedPoste === "avant" ? buttonPrimary : buttonSecondary}
            onClick={() => setSelectedPoste("avant")}
          >
            Avants
          </button>
          <button
            type="button"
            style={selectedPoste === "arriere" ? buttonPrimary : buttonSecondary}
            onClick={() => setSelectedPoste("arriere")}
          >
            Arrières
          </button>
        </div>
        <div className="table-scroll">
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Rang</th>
                <th style={thStyle}>Nom complet</th>
                <th style={thStyle}>Poste</th>
                <th style={thStyle}>Points</th>
                <th style={thStyle}>Maika</th>
                <th style={thStyle}>Nb Parties</th>
              </tr>
            </thead>
            <tbody>
              {(selectedPoste === "avant" ? avants : arrieres).map((p) => (
                <tr key={p.id}>
                  <td style={tdStyle}>{selectedPoste === "avant" ? ranks.avant.get(p.id) : ranks.arriere.get(p.id)}</td>
                  <td style={tdStyle}>{playerFullName(p)}</td>
                  <td style={tdStyle}>{posteLabel(p.poste)}</td>
                  <td style={tdStyle}>{p.seasonPoints}</td>
                  <td style={tdStyle}>{maikaFromSeasonPoints(p.seasonPoints)}</td>
                  <td style={tdStyle}>{playedCountByPlayer.get(p.id) ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Dernières parties jouées</h2>
        {played.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Aucune partie enregistrée.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {played
              .slice()
              .reverse()
              .slice(0, 5)
              .map((m) => (
                <li key={m.id} style={{ marginBottom: 8 }}>
                  <span style={{ color: "var(--muted)" }}>{formatDateLongFr(m.date)}</span> — {formatMatchLine(m, map)}
                </li>
              ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>À venir</h2>
        {upcoming.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Aucune partie planifiée.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {upcoming.map((m) => (
              <li key={m.id} style={{ marginBottom: 8 }}>
                <span style={{ color: "var(--muted)" }}>
                  {formatDateLongFr(m.date)}
                  {m.time ? ` · ${formatMatchHourDisplay(m.time)}` : ""}
                </span>
                {m.venue ? ` — ${m.venue}` : ""}
                <br />
                {formatMatchLine(m, map)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: "26rem",
  borderCollapse: "collapse",
  background: "var(--surface)",
  borderRadius: 12,
  overflow: "hidden",
};
const thStyle: CSSProperties = { textAlign: "left", padding: "0.6rem", borderBottom: "1px solid var(--muted)" };
const tdStyle: CSSProperties = { padding: "0.6rem", borderBottom: "1px solid #334155" };
const buttonPrimary: CSSProperties = { padding: "0.45rem 0.9rem", borderRadius: 8, border: "none", background: "var(--accent)", color: "#0f172a", fontWeight: 700, cursor: "pointer" };
const buttonSecondary: CSSProperties = { padding: "0.45rem 0.9rem", borderRadius: 8, border: "1px solid var(--muted)", background: "transparent", color: "var(--text)", fontWeight: 600, cursor: "pointer" };
