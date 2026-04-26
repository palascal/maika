import { X } from "lucide-react";
import { useEffect, useId, useRef, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { DEFAULT_MATCH_POINT_SCORING_RULES } from "../domain/matchPointScoring";

const r = DEFAULT_MATCH_POINT_SCORING_RULES;

export function MaikaPointsHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div role="presentation" style={backdropStyle} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={panelWrapStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={headerRowStyle}>
          <h2 id={titleId} style={titleStyle}>
            Calcul des points Maïka
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={closeButtonStyle}
          >
            <X size={22} strokeWidth={2} aria-hidden focusable={false} />
          </button>
        </div>
        <div style={scrollBodyStyle}>
          <MaikaPointsHelpContent />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MaikaPointsHelpContent() {
  return (
    <article style={articleStyle}>
      <section style={sectionStyle}>
        <h3 style={h3Style}>1. Attribution des points</h3>
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
              <td style={tdStyle}>Egalité de niveau</td>
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
              <td style={tdStyle}>Egalité de niveau</td>
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
  );
}

const backdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  background: "color-mix(in srgb, var(--text) 35%, transparent)",
  boxSizing: "border-box",
};

const panelWrapStyle: CSSProperties = {
  width: "min(640px, 100%)",
  maxHeight: "min(90vh, 900px)",
  display: "flex",
  flexDirection: "column",
  background: "var(--surface)",
  borderRadius: 14,
  border: "1px solid var(--border-strong)",
  boxShadow: "var(--shadow-md)",
  overflow: "hidden",
};

const headerRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexShrink: 0,
  padding: "0.85rem 1rem",
  borderBottom: "1px solid var(--border)",
  background: "var(--surface)",
};

const titleStyle: CSSProperties = {
  fontSize: "1.1rem",
  margin: 0,
  fontWeight: 700,
  color: "var(--text)",
  lineHeight: 1.25,
  paddingRight: 4,
};

const closeButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  cursor: "pointer",
};

const scrollBodyStyle: CSSProperties = {
  overflowY: "auto",
  padding: "1rem 1.1rem 1.15rem",
  WebkitOverflowScrolling: "touch",
};

const articleStyle: CSSProperties = {
  background: "transparent",
  borderRadius: 0,
  padding: 0,
  border: "none",
  boxShadow: "none",
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
const tdStyle: CSSProperties = {
  borderBottom: "1px solid var(--border)",
  padding: "0.35rem 0.5rem",
  verticalAlign: "top",
};
