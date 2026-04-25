import { useState, type CSSProperties } from "react";
import { formatDateLongFr, formatMatchHourDisplay, formatMatchLine, playerById, playerFullName } from "../domain/format";
import { playerIsActive } from "../domain/playerActive";
import type { Player } from "../domain/types";
import { useSeasonData } from "../season/SeasonDataContext";

type RankedRow = { player: Player; rank: number; playedCount: number };

function buildRankedRows(players: Player[], poste: Player["poste"], playedCountByPlayer: Map<string, number>): RankedRow[] {
  const ordered = players
    .filter((p) => p.poste === poste && playerIsActive(p))
    .slice()
    .sort((a, b) => {
      if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
      const aPlayed = playedCountByPlayer.get(a.id) ?? 0;
      const bPlayed = playedCountByPlayer.get(b.id) ?? 0;
      if (aPlayed !== bPlayed) return aPlayed - bPlayed;
      return a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr");
    });
  return ordered.map((player, idx) => ({ player, rank: idx + 1, playedCount: playedCountByPlayer.get(player.id) ?? 0 }));
}

export function HomePage() {
  const { data, error, loading } = useSeasonData();
  const [selectedPoste, setSelectedPoste] = useState<Player["poste"]>("avant");

  if (error) {
    return <p role="alert">Erreur : {error}</p>;
  }
  if (loading || !data) {
    return <p>Chargement…</p>;
  }

  const map = playerById(data.players.players);
  const played = data.matches.matches.filter((m) => m.status === "played");
  const upcoming = data.matches.matches.filter((m) => m.status === "scheduled");
  const playedCountByPlayer = new Map<string, number>();
  for (const m of played) {
    for (const id of [...m.teamA, ...m.teamB]) {
      playedCountByPlayer.set(id, (playedCountByPlayer.get(id) ?? 0) + 1);
    }
  }
  const rows = buildRankedRows(data.players.players, selectedPoste, playedCountByPlayer);
  const demiRows = rows.slice(0, 2);
  const barrageRows = rows.slice(2, 6);
  const otherRows = rows.slice(6);

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
        <p style={{ margin: "0 0 0.75rem", color: "var(--muted)", fontSize: "0.88rem" }}>
          Les 2 premiers sont qualifiés en 1/2 finales. Les 4 suivants sont barragistes.
        </p>
        <div style={zonesWrapStyle}>
          <ZoneCard label="1/2 finalistes" tone="top2" rows={demiRows} />
          <ZoneCard label="Barragistes" tone="barrage" rows={barrageRows} />
          <ZoneCard label="Fond du classement" tone="other" rows={otherRows} />
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

const buttonPrimary: CSSProperties = { padding: "0.45rem 0.9rem", borderRadius: 8, border: "none", background: "var(--accent)", color: "#0f172a", fontWeight: 700, cursor: "pointer" };
const buttonSecondary: CSSProperties = { padding: "0.45rem 0.9rem", borderRadius: 8, border: "1px solid var(--muted)", background: "transparent", color: "var(--text)", fontWeight: 600, cursor: "pointer" };

function ZoneCard({
  label,
  tone,
  rows,
}: {
  label: string;
  tone: "top2" | "barrage" | "other";
  rows: RankedRow[];
}) {
  const toneStyle = toneCardStyle(tone);
  return (
    <section style={{ ...zoneCardStyle, ...toneStyle }}>
      <div style={zoneLabelStyle}>{label}</div>
      {rows.length === 0 ? (
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>Aucun joueur</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {rows.map((r) => (
            <div key={r.player.id} style={rowCardStyle}>
              <div style={rowLeftStyle}>
                <span style={rowRankStyle}>#{r.rank}</span>
                <span style={rowNameStyle}>{playerFullName(r.player)}</span>
              </div>
              <div style={rowRightStyle}>
                <span style={rowMetaStyle}>{r.playedCount} p.</span>
                <span style={rowPointsStyle}>{r.player.seasonPoints} pts</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function toneCardStyle(tone: "top2" | "barrage" | "other"): CSSProperties {
  if (tone === "top2") {
    return {
      background: "color-mix(in srgb, #22c55e 11%, var(--surface))",
      borderColor: "color-mix(in srgb, #22c55e 45%, transparent)",
    };
  }
  if (tone === "barrage") {
    return {
      background: "color-mix(in srgb, #f59e0b 12%, var(--surface))",
      borderColor: "color-mix(in srgb, #f59e0b 45%, transparent)",
    };
  }
  return {
    background: "color-mix(in srgb, #64748b 10%, var(--surface))",
    borderColor: "color-mix(in srgb, #64748b 42%, transparent)",
  };
}

const zonesWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};
const zoneCardStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--muted)",
  padding: "0.55rem 0.6rem 0.6rem",
};
const zoneLabelStyle: CSSProperties = {
  marginBottom: "0.45rem",
  fontSize: "0.74rem",
  color: "var(--muted)",
  letterSpacing: "0.03em",
  textTransform: "uppercase",
  fontWeight: 700,
};
const rowCardStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "0.38rem 0.5rem",
  borderRadius: 8,
  background: "color-mix(in srgb, var(--bg) 75%, transparent)",
  border: "1px solid color-mix(in srgb, var(--muted) 40%, transparent)",
};
const rowLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};
const rowRightStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  whiteSpace: "nowrap",
};
const rowRankStyle: CSSProperties = {
  color: "var(--muted)",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  minWidth: "2.2rem",
};
const rowNameStyle: CSSProperties = {
  fontWeight: 650,
  fontSize: "0.88rem",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const rowMetaStyle: CSSProperties = { color: "var(--muted)", fontSize: "0.75rem" };
const rowPointsStyle: CSSProperties = { fontWeight: 780, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", fontSize: "0.86rem" };
