import { useMemo, type CSSProperties } from "react";
import { useAuth } from "../auth/AuthContext";
import { maikaFromSeasonPoints } from "../domain/maika";
import { posteLabel, rankingByPoste } from "../domain/ranking";
import { openAppPathInNewWindow } from "../navigation/openAppPathInNewWindow";
import { useSeasonData } from "../season/SeasonDataContext";

export function PlayersPage() {
  const { data, error, loading } = useSeasonData();
  const { isAdmin } = useAuth();

  const ranks = useMemo(() => {
    if (!data) return null;
    const list = data.players.players;
    return {
      avant: rankingByPoste(list, "avant"),
      arriere: rankingByPoste(list, "arriere"),
    };
  }, [data]);

  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data || !ranks) return <p>Chargement…</p>;

  const ordered = data.players.players.slice().sort((a, b) => {
    const byLast = a.lastName.localeCompare(b.lastName, "fr");
    if (byLast !== 0) return byLast;
    return a.firstName.localeCompare(b.firstName, "fr");
  });

  return (
    <main>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Joueurs</h2>
      {isAdmin ? (
        <div style={{ display: "flex", gap: 8, marginBottom: "0.8rem", flexWrap: "wrap" }}>
          <button
            type="button"
            style={buttonPrimary}
            onClick={() => openAppPathInNewWindow("/joueurs/ajout")}
            aria-label="Ajouter un joueur dans un nouvel onglet"
          >
            Ajouter
          </button>
        </div>
      ) : null}
      <div className="table-scroll">
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Nom</th>
              <th style={thStyle}>Prénom</th>
              <th style={thStyle}>Poste</th>
              <th style={thStyle}>Classement</th>
              <th style={thStyle}>Points</th>
              <th style={thStyle}>Maika</th>
              {isAdmin ? <th style={thStyle}>Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {ordered.map((p) => (
              <tr key={p.id}>
                <td style={tdStyle}>{p.lastName}</td>
                <td style={tdStyle}>{p.firstName}</td>
                <td style={tdStyle}>{posteLabel(p.poste)}</td>
                <td style={tdStyle}>{p.poste === "avant" ? ranks.avant.get(p.id) : ranks.arriere.get(p.id)}</td>
                <td style={tdStyle}>{p.seasonPoints}</td>
                <td style={tdStyle}>{maikaFromSeasonPoints(p.seasonPoints)}</td>
                {isAdmin ? (
                  <td style={tdStyle}>
                    <button
                      type="button"
                      style={buttonSecondary}
                      onClick={() => openAppPathInNewWindow(`/joueurs/${encodeURIComponent(p.id)}/modifier`)}
                      aria-label={`Modifier ${p.firstName} ${p.lastName} dans un nouvel onglet`}
                    >
                      Modifier
                    </button>
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
  minWidth: "26rem",
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
