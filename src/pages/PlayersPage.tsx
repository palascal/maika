import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { maikaFromSeasonPoints } from "../domain/maika";
import { playerIsActive } from "../domain/playerActive";
import { posteLabel, rankingByPoste } from "../domain/ranking";
import { InfoTooltip } from "../components/InfoTooltip";
import { useSeasonData } from "../season/SeasonDataContext";

export function PlayersPage() {
  const { data, error, loading } = useSeasonData();
  const [mobileView, setMobileView] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 760px)").matches : false,
  );
  const [mobileSection, setMobileSection] = useState<"actifs" | "inactifs">("actifs");

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

  useEffect(() => {
    if (!mobileView && mobileSection === "inactifs" && orderedInactive.length === 0) {
      setMobileSection("actifs");
    }
  }, [mobileView, mobileSection, orderedInactive.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 760px)");
    const onChange = () => setMobileView(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <main>
      {mobileView ? (
        <div style={mobileTabsWrapStyle}>
          <button
            type="button"
            onClick={() => setMobileSection("actifs")}
            aria-pressed={mobileSection === "actifs"}
            style={{ ...mobileTabStyle, ...(mobileSection === "actifs" ? mobileTabActiveStyle : null) }}
          >
            Actifs
          </button>
          <button
            type="button"
            onClick={() => setMobileSection("inactifs")}
            aria-pressed={mobileSection === "inactifs"}
            style={{ ...mobileTabStyle, ...(mobileSection === "inactifs" ? mobileTabActiveStyle : null) }}
            disabled={orderedInactive.length === 0}
          >
            Désactivés
          </button>
        </div>
      ) : null}
      {!mobileView || mobileSection === "actifs" ? (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {orderedInactive.length > 0 && (!mobileView || mobileSection === "inactifs") ? (
        <section style={{ marginTop: mobileView ? "0.8rem" : "1.5rem" }}>
          <div style={headingRowStyle}>
            <h3 style={{ fontSize: "1rem", marginTop: 0, color: "var(--muted)", marginBottom: 0 }}>
              Joueurs désactivés (historique conservé)
            </h3>
            <InfoTooltip label="Aide joueurs désactivés">
              <p style={{ margin: "0 0 0.45rem", color: "var(--text)" }}>
                Non visibles dans les classements ni sélectionnables pour de nouvelles parties.
              </p>
              <p style={{ margin: 0, color: "var(--text)" }}>Les parties passées restent inchangées.</p>
            </InfoTooltip>
          </div>
          <div className="table-scroll">
            <table style={{ ...tableStyle, opacity: 0.92 }}>
              <thead>
                <tr>
                  <th style={thStyle}>Nom</th>
                  <th style={thStyle}>Prénom</th>
                  <th style={thStyle}>Poste</th>
                  <th style={thStyle}>Points</th>
                </tr>
              </thead>
              <tbody>
                {orderedInactive.map((p) => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{p.lastName}</td>
                    <td style={tdStyle}>{p.firstName}</td>
                    <td style={tdStyle}>{posteLabel(p.poste)}</td>
                    <td style={tdStyle}>{p.seasonPoints}</td>
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
const thStyle: CSSProperties = { textAlign: "left", padding: "0.6rem", borderBottom: "1px solid var(--border)" };
const tdStyle: CSSProperties = { padding: "0.6rem", borderBottom: "1px solid var(--border)" };
const headingRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: "0.75rem",
};
const mobileTabsWrapStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "nowrap",
  marginBottom: "0.75rem",
  padding: 4,
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--bg) 65%, var(--surface))",
};
const mobileTabStyle: CSSProperties = {
  border: "1px solid transparent",
  background: "transparent",
  color: "var(--text)",
  borderRadius: 999,
  padding: "0.42rem 0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  minHeight: "2.5rem",
  flex: "1 1 0",
};
const mobileTabActiveStyle: CSSProperties = {
  background: "var(--surface)",
  color: "var(--nav-active-text)",
  boxShadow: "var(--shadow-sm)",
  borderColor: "color-mix(in srgb, var(--accent) 22%, var(--border))",
};
