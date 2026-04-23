import { useMemo, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { maikaFromSeasonPoints } from "../domain/maika";
import { playerIsActive } from "../domain/playerActive";
import { posteLabel, rankingByPoste } from "../domain/ranking";
import { useSeasonData } from "../season/SeasonDataContext";

export function PlayersPage() {
  const { data, error, loading } = useSeasonData();
  const { isAdmin } = useAuth();

  const ranks = useMemo(() => {
    if (!data) return null;
    return {
      avant: rankingByPoste(data.players.players, "avant"),
      arriere: rankingByPoste(data.players.players, "arriere"),
    };
  }, [data]);

  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data || !ranks) return <p>Chargement…</p>;

  const sortPlayers = (list: typeof data.players.players) =>
    list.slice().sort((a, b) => {
      const byLast = a.lastName.localeCompare(b.lastName, "fr");
      if (byLast !== 0) return byLast;
      return a.firstName.localeCompare(b.firstName, "fr");
    });
  const orderedActive = sortPlayers(data.players.players.filter(playerIsActive));
  const orderedInactive = sortPlayers(data.players.players.filter((p) => !playerIsActive(p)));

  return (
    <main>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Joueurs</h2>
      {isAdmin ? (
        <div style={{ display: "flex", gap: 8, marginBottom: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link to="/admin/joueurs?nouveau=1" style={{ ...buttonPrimary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }} aria-label="Ouvrir l administration des joueurs pour ajouter">
            Ajouter
          </Link>
          <Link to="/admin/joueurs" style={{ ...buttonSecondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.88rem" }}>
            Administration
          </Link>
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
            {orderedActive.map((p) => (
              <tr key={p.id}>
                <td style={tdStyle}>{p.lastName}</td>
                <td style={tdStyle}>{p.firstName}</td>
                <td style={tdStyle}>{posteLabel(p.poste)}</td>
                <td style={tdStyle}>{p.poste === "avant" ? ranks.avant.get(p.id) : ranks.arriere.get(p.id)}</td>
                <td style={tdStyle}>{p.seasonPoints}</td>
                <td style={tdStyle}>{maikaFromSeasonPoints(p.seasonPoints)}</td>
                {isAdmin ? (
                  <td style={tdStyle}>
                    <Link
                      to={`/admin/joueurs?modifier=${encodeURIComponent(p.id)}`}
                      style={{ ...buttonSecondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                      aria-label={`Modifier ${p.firstName} ${p.lastName}`}
                    >
                      Modifier
                    </Link>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isAdmin && orderedInactive.length > 0 ? (
        <section style={{ marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", marginTop: 0, color: "var(--muted)" }}>Joueurs désactivés (historique conservé)</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            Non visibles dans les classements ni sélectionnables pour de nouvelles parties. Les parties passées restent inchangées.
          </p>
          <div className="table-scroll">
            <table style={{ ...tableStyle, opacity: 0.92 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nom</th>
                  <th style={thStyle}>Prénom</th>
                  <th style={thStyle}>Poste</th>
                  <th style={thStyle}>Points</th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {orderedInactive.map((p) => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{p.lastName}</td>
                    <td style={tdStyle}>{p.firstName}</td>
                    <td style={tdStyle}>{posteLabel(p.poste)}</td>
                    <td style={tdStyle}>{p.seasonPoints}</td>
                    <td style={tdStyle}>
                      <Link
                        to={`/admin/joueurs?modifier=${encodeURIComponent(p.id)}`}
                        style={{ ...buttonSecondary, textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        aria-label={`Modifier ${p.firstName} ${p.lastName}`}
                      >
                        Modifier / réactiver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
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
