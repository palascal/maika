import type { CSSProperties } from "react";
import { AppLink } from "../navigation/AppLink";
import { DEFAULT_MATCH_POINT_SCORING_RULES } from "../domain/matchPointScoring";
import { InfoTooltip } from "../components/InfoTooltip";
import { publicAssetUrl } from "../lib/routerBasename";

const r = DEFAULT_MATCH_POINT_SCORING_RULES;

export function ReglementPage() {
  const docHref = publicAssetUrl("reglement.doc");

  return (
    <main style={{ maxWidth: 640, margin: "0 auto" }}>
      <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        <AppLink to="/" style={backLinkStyle}>
          ← Dashboard
        </AppLink>
      </p>
      <div style={headingRowStyle}>
        <h2 style={{ fontSize: "1.2rem", marginTop: 0, marginBottom: 0 }}>Règlement du tournoi</h2>
        <InfoTooltip label="Aide règlement">
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

      <p style={{ marginBottom: "1.25rem" }}>
        <a href={docHref} style={downloadLinkStyle} download>
          Télécharger reglement.doc
        </a>
        <span style={{ color: "var(--muted)", fontSize: "0.85rem", display: "block", marginTop: 6 }}>
          Si le lien ne renvoie pas de fichier, le document n’a pas encore été publié avec le site.
        </span>
      </p>

      <article style={articleStyle}>
        <section style={sectionStyle}>
          <h3 style={h3Style}>1. Objet et format</h3>
          <p>
            Le tournoi est une compétition de <strong>double</strong> : chaque équipe compte exactement{" "}
            <strong>deux joueurs</strong>. Les parties se jouent au <strong>score en 40 points</strong> (règle de
            pelote mano adaptée au classement), avec un vainqueur et un perdant (en cas d’égalité au score, la partie
            ne donne lieu à <strong>aucun</strong> mouvement de points saison dans l’application).
          </p>
        </section>

        <section style={sectionStyle}>
          <h3 style={h3Style}>2. Postes et classements</h3>
          <p>
            Chaque joueur est inscrit sur un <strong>poste</strong> : <strong>avant</strong> ou <strong>arrière</strong>.
            Les <strong>classements</strong> sont établis <strong>séparément</strong> pour chaque poste, à partir des{" "}
            <strong>points saison</strong> cumulés. En cas d’égalité de points, les ex æquo partagent le même rang
            (classement dense).
          </p>
        </section>

        <section style={sectionStyle}>
          <h3 style={h3Style}>3. Maika</h3>
          <p>
            Le <strong>Maika</strong> affiché pour un joueur correspond au niveau dérivé de ses points saison : on
            prend la partie entière des points divisés par dix (ex. 19 points → Maika 1 ; 20 points → Maika 2). Le
            Maika sert à déterminer le <strong>barème de victoire et de défaite</strong> d’une partie en comparant la
            somme des Maika des deux équipes <em>au moment de la partie</em> (ordre chronologique des parties jouées).
          </p>
        </section>

        <section style={sectionStyle}>
          <h3 style={h3Style}>4. Parties prises en compte pour les points</h3>
          <ul style={ulStyle}>
            <li>Seules les parties au statut <strong>Jouée</strong>, avec scores renseignés et <strong>distincts</strong>,
              modifient les points saison.</li>
            <li>Les parties <strong>prévues</strong> ou <strong>annulées</strong> n’attribuent pas de points.</li>
            <li>Les points de départ des nouveaux joueurs et le rejeu complet de saison suivent la configuration
              (valeur « points de départ » dans l’administration).</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h3 style={h3Style}>5. Barème de base (valeurs par défaut)</h3>
          <p>
            Les points gagnés ou perdus dépendent de l’<strong>écart de Maika total</strong> entre l’équipe perdante
            et l’équipe gagnante au moment de la partie. Le tableau ci-dessous reprend les <strong>valeurs par défaut</strong>{" "}
            de l’application ; l’organisateur peut les ajuster dans la page <strong>Config</strong> (comptes admin).
          </p>
          <h4 style={h4Style}>Victoire — points par joueur de l’équipe gagnante</h4>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Situation (somme Maika perdants − gagnants)</th>
                <th style={thStyle}>Points</th>
              </tr>
            </thead>
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
          <h4 style={h4Style}>Défaite — points par joueur de l’équipe perdante</h4>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Situation (somme Maika gagnants − perdants)</th>
                <th style={thStyle}>Points</th>
              </tr>
            </thead>
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
          <h3 style={h3Style}>6. Bonus liés au score (40)</h3>
          <p>
            En plus du barème Maika, des <strong>bonus</strong> peuvent s’appliquer selon le score final de l’équipe
            perdante sur 40 (valeurs par défaut ci-dessous, modifiables en configuration).
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

        <section style={sectionStyle}>
          <h3 style={h3Style}>7. Bonne foi et arbitrage</h3>
          <p>
            Les litiges sur le terrain (horaires, composition, fair-play) relèvent de l’<strong>organisateur</strong>{" "}
            et des règles complémentaires figurant dans le document officiel remis aux participants. L’application sert
            de <strong>registre</strong> des résultats et du classement selon le barème décrit ci-dessus.
          </p>
        </section>
      </article>
    </main>
  );
}

const backLinkStyle: CSSProperties = { fontWeight: 600, textDecoration: "none", color: "var(--muted)" };
const headingRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: "0.8rem",
};
const tipTextStyle: CSSProperties = { margin: "0 0 0.45rem", color: "var(--text)" };
const downloadLinkStyle: CSSProperties = {
  fontWeight: 700,
  color: "var(--accent)",
  textDecoration: "none",
};
const articleStyle: CSSProperties = {
  background: "var(--surface)",
  borderRadius: 12,
  padding: "1.1rem 1.2rem",
  border: "1px solid var(--muted)",
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
  borderBottom: "1px solid var(--muted)",
  padding: "0.35rem 0.5rem",
  color: "var(--muted)",
  fontWeight: 600,
};
const tdStyle: CSSProperties = {
  borderBottom: "1px solid color-mix(in srgb, var(--muted) 35%, transparent)",
  padding: "0.35rem 0.5rem",
  verticalAlign: "top",
};
