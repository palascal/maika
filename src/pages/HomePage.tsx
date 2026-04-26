import { Award, Medal } from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import { useAuth } from "../auth/AuthContext";
import { playerCompactName } from "../domain/format";
import { playerIsActive } from "../domain/playerActive";
import { posteLabel } from "../domain/ranking";
import type { Player } from "../domain/types";
import { useSeasonData } from "../season/SeasonDataContext";

type RankedRow = { player: Player; rank: number; playedCount: number };

function playedMatchesLabel(count: number): string {
  const word = count === 1 ? "partie" : "parties";
  return `(${count} ${word})`;
}

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

function rankIcon(rank: number) {
  if (rank === 1) return <Medal size={18} strokeWidth={2} aria-hidden style={{ color: "#ca8a04" }} />;
  if (rank === 2) return <Medal size={18} strokeWidth={2} aria-hidden style={{ color: "#94a3b8" }} />;
  if (rank === 3) return <Medal size={18} strokeWidth={2} aria-hidden style={{ color: "#b45309" }} />;
  return <Award size={18} strokeWidth={2} aria-hidden style={{ color: "var(--accent)" }} />;
}

export function HomePage() {
  const { data, error, loading } = useSeasonData();
  const { role, session } = useAuth();

  const playedCountByPlayer = useMemo(() => {
    const out = new Map<string, number>();
    if (!data) return out;
    const played = data.matches.matches.filter((m) => m.status === "played");
    for (const m of played) {
      for (const id of [...m.teamA, ...m.teamB]) {
        out.set(id, (out.get(id) ?? 0) + 1);
      }
    }
    return out;
  }, [data]);

  const avantRows = useMemo(
    () => (data ? buildRankedRows(data.players.players, "avant", playedCountByPlayer) : []),
    [data, playedCountByPlayer],
  );
  const arriereRows = useMemo(
    () => (data ? buildRankedRows(data.players.players, "arriere", playedCountByPlayer) : []),
    [data, playedCountByPlayer],
  );

  const linkedPlayer = useMemo(() => {
    if (!data || role !== "user") return null;
    const username = session?.username?.trim().toLowerCase() ?? "";
    if (!username) return null;
    return (
      data.players.players.find((p) => p.email?.trim().toLowerCase() === username) ??
      data.players.players.find((p) => p.id === username) ??
      null
    );
  }, [data, role, session?.username]);

  const selfRanked = useMemo(() => {
    if (!linkedPlayer || !playerIsActive(linkedPlayer)) return null;
    const rows = linkedPlayer.poste === "avant" ? avantRows : arriereRows;
    const row = rows.find((r) => r.player.id === linkedPlayer.id);
    if (!row) return null;
    return { row, poste: linkedPlayer.poste };
  }, [linkedPlayer, avantRows, arriereRows]);

  if (error) {
    return <p role="alert">Erreur : {error}</p>;
  }
  if (loading || !data) {
    return <p>Chargement…</p>;
  }

  const demiA = avantRows.slice(0, 2);
  const barrageA = avantRows.slice(2, 6);
  const otherA = avantRows.slice(6);

  const demiAr = arriereRows.slice(0, 2);
  const barrageAr = arriereRows.slice(2, 6);
  const otherAr = arriereRows.slice(6);

  return (
    <main>
      {role === "user" && linkedPlayer ? (
        <section style={{ marginBottom: "1.35rem" }}>
          <h2 style={{ fontSize: "1.05rem", marginTop: 0, marginBottom: "0.55rem" }}>Mon Classement</h2>
          {!playerIsActive(linkedPlayer) ? (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem" }}>
              Votre fiche joueur est désactivée : vous n’apparaissez pas dans le classement.
            </p>
          ) : selfRanked ? (
            <div style={selfCardStyle}>
              <div style={selfRowStyle}>
                <span style={selfIconWrap} aria-hidden>
                  {rankIcon(selfRanked.row.rank)}
                </span>
                <div style={selfMainStyle}>
                  <div style={selfTitleLine}>
                    <span style={rowRankStyle}>#{selfRanked.row.rank}</span>
                    <span style={rowNameStyle}>{playerCompactName(linkedPlayer)}</span>
                    <span style={rowPointsStyle}>{linkedPlayer.seasonPoints}</span>
                  </div>
                  <div style={selfMetaLine}>
                    <span style={playedUnderNameStyle}>{playedMatchesLabel(selfRanked.row.playedCount)}</span>
                    <span style={posteChipStyle}>{posteLabel(selfRanked.poste)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem" }}>Aucune donnée de classement pour votre fiche.</p>
          )}
        </section>
      ) : null}

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: "0.65rem" }}>Classement global</h2>
        <p style={{ margin: "0 0 0.85rem", color: "var(--muted)", fontSize: "0.88rem" }}>
          Les 2 premiers sont qualifiés en 1/2 finales. Les 4 suivants sont barragistes.
        </p>
        <div style={twoColumnsStyle}>
          <div style={columnWrapStyle}>
            <h3 style={columnTitleStyle}>Avants</h3>
            <div style={zonesWrapStyle}>
              <ZoneCard label="1/2 finalistes" tone="top2" rows={demiA} />
              <ZoneCard label="Barragistes" tone="barrage" rows={barrageA} />
              <ZoneCard label="Fond du classement" tone="other" rows={otherA} />
            </div>
          </div>
          <div style={columnWrapStyle}>
            <h3 style={columnTitleStyle}>Arrières</h3>
            <div style={zonesWrapStyle}>
              <ZoneCard label="1/2 finalistes" tone="top2" rows={demiAr} />
              <ZoneCard label="Barragistes" tone="barrage" rows={barrageAr} />
              <ZoneCard label="Fond du classement" tone="other" rows={otherAr} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

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
                <div style={nameColStyle}>
                  <span style={rowNameStyle}>{playerCompactName(r.player)}</span>
                  <span style={playedUnderNameStyle}>{playedMatchesLabel(r.playedCount)}</span>
                </div>
              </div>
              <span style={rowPointsStyle}>{r.player.seasonPoints}</span>
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

const twoColumnsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))",
  gap: "1rem",
  alignItems: "start",
};

const columnWrapStyle: CSSProperties = { minWidth: 0 };

const columnTitleStyle: CSSProperties = {
  margin: "0 0 0.5rem",
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "var(--text)",
};

const zonesWrapStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
};

const zoneCardStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid var(--border)",
  padding: "0.55rem 0.6rem 0.6rem",
  boxShadow: "var(--shadow-sm)",
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
  background: "color-mix(in srgb, var(--bg) 55%, var(--surface))",
  border: "1px solid var(--border)",
};

const rowLeftStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  flex: "1 1 auto",
};

const nameColStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
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

const playedUnderNameStyle: CSSProperties = {
  color: "var(--muted)",
  fontSize: "0.72rem",
  lineHeight: 1.25,
};

const rowPointsStyle: CSSProperties = {
  fontWeight: 780,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  fontSize: "0.86rem",
  flexShrink: 0,
};

const selfCardStyle: CSSProperties = {
  borderRadius: 14,
  border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
  background: "color-mix(in srgb, var(--accent) 7%, var(--surface))",
  padding: "0.65rem 0.75rem",
  boxShadow: "var(--shadow-sm)",
};

const selfRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const selfIconWrap: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const selfMainStyle: CSSProperties = { flex: "1 1 auto", minWidth: 0 };

const selfTitleLine: CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
};

const selfMetaLine: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 4,
};

const posteChipStyle: CSSProperties = {
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: 999,
  padding: "0.1rem 0.45rem",
  background: "color-mix(in srgb, var(--bg) 70%, var(--surface))",
};
