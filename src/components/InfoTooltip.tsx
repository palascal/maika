import { Info } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

export function InfoTooltip({
  label = "Informations",
  children,
  maxWidth = 480,
}: {
  label?: string;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <details style={detailsStyle}>
      <summary aria-label={label} title={label} style={summaryStyle}>
        <Info size={16} strokeWidth={2} aria-hidden focusable={false} />
      </summary>
      <div role="note" style={{ ...panelStyle, maxWidth }}>
        {children}
      </div>
    </details>
  );
}

const detailsStyle: CSSProperties = {
  position: "relative",
  display: "inline-block",
};

const summaryStyle: CSSProperties = {
  listStyle: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 26,
  height: 26,
  borderRadius: 999,
  border: "1px solid var(--muted)",
  color: "var(--muted)",
  cursor: "pointer",
  background: "var(--surface)",
};

const panelStyle: CSSProperties = {
  position: "absolute",
  zIndex: 30,
  top: "calc(100% + 8px)",
  right: 0,
  background: "var(--surface)",
  border: "1px solid var(--muted)",
  borderRadius: 10,
  padding: "0.65rem 0.75rem",
  color: "var(--text)",
  fontSize: "0.88rem",
  lineHeight: 1.45,
  boxShadow: "0 8px 24px color-mix(in srgb, #000 22%, transparent)",
};
