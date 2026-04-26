import type { CSSProperties } from "react";
import { DEFAULT_MATCH_POINT_SCORING_RULES } from "../domain/matchPointScoring";
import { InfoTooltip } from "../components/InfoTooltip";

const r = DEFAULT_MATCH_POINT_SCORING_RULES;

export function ReglementPage() {
  return (
    <main style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={headingRowStyle}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 0, marginBottom: 0 }}>Barêmes</h2>
        <InfoTooltip label="Aide barèmes">
          <p style={tipTextStyle}>
            Texte de référence pour la saison <strong>Maika</strong> (double, barème informatisé).
          </p>
          <p style={tipTextStyle}>
            En cas d’écart avec le document Word remis par l’organisateur (<strong>reglement.doc</strong>), ce dernier
            fait foi pour tout ce qui n’est pas calculé automatiquement par le site.
          </p>
          <p style={{ ...tipTextStyle, marginBottom: 0 }}>(fair-play, horaires, sanctions, etc.)</p>
        </InfoTooltip>
      </div>

      <article style={articleStyle}>
        <section style={sectionStyle}>
          <h3 style={h3Style}>1. Barème de base (valeurs par défaut)</h3>
          <h4 style={h4Style}>Points de victoire</h4>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={tdStyle}>Adversaire au moins 2 Maika au-dessus</td>
                <td style={tdStyle}>{r.victoryOpponentMinusWinnerGte2}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Adversaire au moins 1 Maika au-dessus</td>
                <td style={tdStyle}>{r.victoryOpponentMinusWinnerGte1}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Égalité de niveau total</td>
                <td style={tdStyle}>{r.victoryOpponentMinusWinnerEq0}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Adversaire moins fort (écart négatif)</td>
                <td style={tdStyle}>{r.victoryOpponentMinusWinnerLt0}</td>
              </tr>
            </tbody>
          </table>
          <h4 style={h4Style}>Points de défaite</h4>
          <table style={tableStyle}>
            <tbody>
              <tr>
                <td style={tdStyle}>Contre une équipe plus forte</td>
                <td style={tdStyle}>{r.defeatWinnerMinusLoserGt0}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Égalité de niveau total</td>
                <td style={tdStyle}>{r.defeatWinnerMinusLoserEq0}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Contre une équipe moins forte (écart 1)</td>
                <td style={tdStyle}>{r.defeatWinnerMinusLoserEqMinus1}</td>
              </tr>
              <tr>
                <td style={tdStyle}>Contre une équipe nettement moins forte (écart ≥ 2)</td>
                <td style={tdStyle}>{r.defeatWinnerMinusLoserLteMinus2}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section style={sectionStyle}>
          <h3 style={h3Style}>2. Points de Bonus</h3>
          <p>
            En plus du barème Maika, des <strong>bonus</strong> peuvent s’appliquer selon le score final de l’équipe
            perdante.
          </p>
          <ul style={ulStyle}>
            <li>
              <strong>Bonus offensif</strong> : si l’équipe perdante marque <strong>strictement moins de</strong>{" "}
              {r.offensiveBonusMarginGt} points, chaque joueur <strong>vainqueur</strong> reçoit{" "}
              <strong>+{r.offensiveBonusPoints}</strong> point(s).
            </li>
            <li>
              <strong>Bonus défensif</strong> : si l’équipe perdante marque <strong>au moins</strong>{" "}
              {r.defensiveBonusMarginLt} points, chaque joueur <strong>perdant</strong> reçoit{" "}
              <strong>+{r.defensiveBonusPoints}</strong> point(s).
            </li>
          </ul>
        </section>

      </article>
    </main>
  );
}

const headingRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: "0.8rem",
};
const tipTextStyle: CSSProperties = { margin: "0 0 0.45rem", color: "var(--text)" };
const articleStyle: CSSProperties = {
  background: "var(--surface)",
  borderRadius: 12,
  padding: "1.1rem 1.2rem",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
};
const sectionStyle: CSSProperties = { marginBottom: "1.15rem" };
const h3Style: CSSProperties = { fontSize: "1rem", margin: "0 0 0.5rem", color: "var(--text)" };
const h4Style: CSSProperties = { fontSize: "0.92rem", margin: "1rem 0 0.4rem", color: "var(--muted)" };
const ulStyle: CSSProperties = { margin: "0.25rem 0 0", paddingLeft: "1.2rem", lineHeight: 1.55 };
const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.88rem",
  marginTop: "0.35rem",
};
const thStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid var(--border)",
  padding: "0.35rem 0.5rem",
  color: "var(--muted)",
  fontWeight: 600,
};
const tdStyle: CSSProperties = {
  borderBottom: "1px solid var(--border)",
  padding: "0.35rem 0.5rem",
  verticalAlign: "top",
};
