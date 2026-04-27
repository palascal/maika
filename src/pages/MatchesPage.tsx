import { CircleHelp, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { IconActionButton, iconButtonBaseStyle } from "../components/IconActionButton";
import { MaikaPointsHelpDialog } from "../components/MaikaPointsHelpDialog";
import { BUILD_NUMBER } from "../buildInfo";
import {
  formatDateDayMonthFr,
  formatDateLongFr,
  formatMatchHourDisplay,
  formatTeamLabel,
  playerById,
} from "../domain/format";
import { hasPeloteScore } from "../domain/matchScore";
import { matchPointDeltasForPlayedMatch, mergeScoringRules } from "../domain/matchPointScoring";
import { playerIsActive } from "../domain/playerActive";
import type { Match, Player, PlayerId } from "../domain/types";
import { openAppPathInNewWindow } from "../navigation/openAppPathInNewWindow";
import { useSeasonData } from "../season/SeasonDataContext";
import { MatchForm } from "./MatchFormPage";

const compositionStackStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };
const compositionRowBase: CSSProperties = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: "0.35rem 0.75rem",
  padding: "0.35rem 0 0.35rem 0.65rem",
  borderRadius: 8,
  borderLeft: "3px solid var(--accent)",
  background: "var(--bg)",
};
const compositionRowB: CSSProperties = {
  ...compositionRowBase,
  borderLeftColor: "#64748b",
};
const compositionNamesStyle: CSSProperties = {
  flex: "1 1 8rem",
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const compositionScoreStyle: CSSProperties = { fontWeight: 700, fontVariantNumeric: "tabular-nums", flexShrink: 0 };
const compositionScoreWrapStyle: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8 };
const compositionPointsWinStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: "0.82rem",
  color: "#14532d",
  fontVariantNumeric: "tabular-nums",
};
const compositionPointsLoseStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: "0.82rem",
  color: "#7f1d1d",
  fontVariantNumeric: "tabular-nums",
};

const matchWhenWhereLine1Style: CSSProperties = { fontWeight: 600, fontSize: "0.92rem", lineHeight: 1.35 };
const matchWhenWhereLine2Style: CSSProperties = {
  marginTop: 4,
  fontSize: "0.82rem",
  color: "var(--muted)",
  lineHeight: 1.35,
};

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return (value[0]?.toLocaleUpperCase("fr-FR") ?? "") + value.slice(1);
}

function formatMatchDateLabel(isoDay: string): string {
  const raw = formatDateDayMonthFr(isoDay);
  const parts = raw.split(" ");
  if (parts.length < 3) return capitalizeFirst(raw);
  const dayName = capitalizeFirst(parts[0] ?? "");
  const month = capitalizeFirst(parts[parts.length - 1] ?? "");
  return `${dayName} ${parts[1]} ${month}`;
}

function MatchWhenWhereCell({ m }: { m: Match }) {
  const dateStr = formatMatchDateLabel(m.date);
  const timeStr = m.time ? formatMatchHourDisplay(m.time) : "—";
  const venueStr = m.venue?.trim() ? m.venue.trim() : "—";
  return (
    <td style={tdStyle}>
      <div style={matchWhenWhereLine1Style}>{dateStr}</div>
      <div style={matchWhenWhereLine2Style}>
        <strong>{timeStr}</strong>
        {`\u00a0·\u00a0${venueStr}`}
      </div>
    </td>
  );
}

type MatchDebug = {
  deltaEq1: number | null;
  deltaEq2: number | null;
};

function signedPoints(value: number | null): string {
  if (value == null) return "";
  return value > 0 ? `+${value}` : `${value}`;
}

function MatchCompositionCell({ m, map, debug }: { m: Match; map: Map<PlayerId, Player>; debug?: MatchDebug }) {
  const scored = hasPeloteScore(m);
  const pointsA = debug?.deltaEq1 ?? null;
  const pointsB = debug?.deltaEq2 ?? null;
  const pointsAStyle = (pointsA ?? 0) >= 0 ? compositionPointsWinStyle : compositionPointsLoseStyle;
  const pointsBStyle = (pointsB ?? 0) >= 0 ? compositionPointsWinStyle : compositionPointsLoseStyle;
  return (
    <div style={compositionStackStyle}>
      <div style={compositionRowBase}>
        <span style={compositionNamesStyle}>{formatTeamLabel(m.teamA, map)}</span>
        {scored ? (
          <span style={compositionScoreWrapStyle}>
            <span style={compositionScoreStyle}>{m.scoreTeamA}</span>
            {pointsA != null ? <span style={pointsAStyle}>{signedPoints(pointsA)}</span> : null}
          </span>
        ) : null}
      </div>
      <div style={compositionRowB}>
        <span style={compositionNamesStyle}>{formatTeamLabel(m.teamB, map)}</span>
        {scored ? (
          <span style={compositionScoreWrapStyle}>
            <span style={compositionScoreStyle}>{m.scoreTeamB}</span>
            {pointsB != null ? <span style={pointsBStyle}>{signedPoints(pointsB)}</span> : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MatchMobileCard({
  m,
  map,
  debug,
  onClick,
  clickable,
}: {
  m: Match;
  map: Map<PlayerId, Player>;
  debug?: MatchDebug;
  onClick?: () => void;
  clickable?: boolean;
}) {
  const dateStr = formatMatchDateLabel(m.date);
  const timeStr = m.time ? formatMatchHourDisplay(m.time) : "—";
  const venueStr = m.venue?.trim() ? m.venue.trim() : "—";
  return (
    <article
      style={{ ...mobileCardStyle, ...(clickable ? mobileCardClickableStyle : null) }}
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={clickable ? `Modifier la partie du ${m.date}` : undefined}
    >
      <div style={mobileMetaLineStyle}>
        <span style={mobileDateInlineStyle}>{dateStr}</span>
        {`\u00a0·\u00a0`}
        <strong>{timeStr}</strong>
        {`\u00a0·\u00a0${venueStr}`}
      </div>
      <div style={{ marginTop: 8 }}>
        <MatchCompositionCell m={m} map={map} debug={debug} />
      </div>
    </article>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export function MatchesPage() {
  const { data, error, loading, saveMatchesFile } = useSeasonData();
  const { canManageLeague, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [matchCreateOpen, setMatchCreateOpen] = useState(false);
  const [matchCreateError, setMatchCreateError] = useState<string | null>(null);
  const [savingMatch, setSavingMatch] = useState(false);
  const [userPlayedHistoryExpanded, setUserPlayedHistoryExpanded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileUserSection, setMobileUserSection] = useState<"scheduled" | "played">("scheduled");
  const [mobileView, setMobileView] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 760px)").matches : false,
  );

  /** Toujours appelé (même en chargement) — ne pas placer après un return conditionnel. */
  const debugByMatchId = useMemo(() => {
    const out = new Map<string, MatchDebug>();
    if (!data) return out;
    const rules = mergeScoringRules(data.scoring.rules);
    const points = new Map<PlayerId, number>();
    const start = data.scoring.startingSeasonPoints;
    for (const p of data.players.players) points.set(p.id, start);
    const ordered = data.matches.matches.slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    for (const m of ordered) {
      if (m.status !== "played" || !hasPeloteScore(m) || m.scoreTeamA === m.scoreTeamB) {
        out.set(m.id, {
          deltaEq1: null,
          deltaEq2: null,
        });
        continue;
      }
      const deltas = matchPointDeltasForPlayedMatch(m, points, rules);
      out.set(m.id, {
        // Le delta de la 1re personne de chaque équipe reflète le total réellement appliqué
        // (barème victoire/défaite + bonus offensif/défensif).
        deltaEq1: deltas.get(m.teamA[0]) ?? null,
        deltaEq2: deltas.get(m.teamB[0]) ?? null,
      });
      for (const [id, d] of deltas) {
        if (!points.has(id)) continue;
        points.set(id, (points.get(id) ?? 0) + d);
      }
    }
    return out;
  }, [data]);

  const playersForCreateModal = useMemo(() => {
    const all = data?.players.players ?? [];
    return all
      .filter(playerIsActive)
      .slice()
      .sort((a, b) => a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"));
  }, [data?.players.players]);

  useEffect(() => {
    if (!data) return;
    if (searchParams.get("nouveau") !== "1") return;
    setMatchCreateOpen(true);
    setMatchCreateError(null);
    const next = new URLSearchParams(searchParams);
    next.delete("nouveau");
    setSearchParams(next, { replace: true });
  }, [data, searchParams, setSearchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 760px)");
    const onChange = () => setMobileView(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data) return <p>Chargement…</p>;
  const seasonLabel = data.players.seasonLabel?.trim() || "Maika";

  const map = playerById(data.players.players);
  const list = [...data.matches.matches].sort((a, b) => b.date.localeCompare(a.date));
  const userScheduledMatches = [...data.matches.matches]
    .filter((m) => m.status === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const userPlayedMatchesDesc = [...data.matches.matches]
    .filter((m) => m.status === "played")
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const userRecentPlayed = userPlayedMatchesDesc.slice(0, 3);
  const userPlayedShown = userPlayedHistoryExpanded ? userPlayedMatchesDesc : userRecentPlayed;

  async function deleteMatch(m: Match) {
    const label = `${formatDateLongFr(m.date)} — ${formatTeamLabel(m.teamA, map)} / ${formatTeamLabel(m.teamB, map)}`;
    if (!window.confirm(`Supprimer cette partie ?\n\n${label}\n\nLes points des joueurs seront mis à jour si la partie était jouée.`)) {
      return;
    }
    setDeleteError(null);
    setDeletingId(m.id);
    try {
      const nextMatches = data.matches.matches.filter((x) => x.id !== m.id);
      await saveMatchesFile({
        ...data.matches,
        matches: nextMatches,
        updatedAt: today(),
      });
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  }

  async function persistMatchCreate(nextMatches: Match[]) {
    setMatchCreateError(null);
    setSavingMatch(true);
    try {
      await saveMatchesFile({
        ...data.matches,
        matches: nextMatches,
        updatedAt: today(),
      });
      setMatchCreateOpen(false);
    } catch (e: unknown) {
      setMatchCreateError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSavingMatch(false);
    }
  }

  return (
    <main>
      <MaikaPointsHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} seasonLabel={seasonLabel} buildNumber={BUILD_NUMBER} />
      {deleteError ? (
        <p role="alert" style={{ color: "var(--danger)", marginBottom: "0.75rem", fontSize: "0.95rem" }}>
          {deleteError}
        </p>
      ) : null}
      {canManageLeague && !mobileView ? (
        <div style={{ display: "flex", gap: 8, marginBottom: "0.8rem", flexWrap: "wrap" }}>
          <IconActionButton
            label="Ajouter une partie"
            icon={Plus}
            iconSize={20}
            style={{ ...iconButtonBaseStyle, ...addButtonPillStyle }}
            onClick={() => {
              setMatchCreateError(null);
              setMatchCreateOpen(true);
            }}
          />
        </div>
      ) : null}
      {role === "user" ? (
        <>
          {mobileView ? (
            <>
              <div style={mobileTabsWrapStyle}>
                <button
                  type="button"
                  onClick={() => setMobileUserSection("scheduled")}
                  aria-pressed={mobileUserSection === "scheduled"}
                  style={{ ...mobileTabStyle, ...(mobileUserSection === "scheduled" ? mobileTabActiveStyle : null) }}
                >
                  Prévues
                </button>
                <button
                  type="button"
                  onClick={() => setMobileUserSection("played")}
                  aria-pressed={mobileUserSection === "played"}
                  style={{ ...mobileTabStyle, ...(mobileUserSection === "played" ? mobileTabActiveStyle : null) }}
                >
                  Jouées
                </button>
              </div>
              {mobileUserSection === "scheduled" ? (
                <UserMatchesTable
                  matches={userScheduledMatches}
                  map={map}
                  debugByMatchId={debugByMatchId}
                  emptyLabel="Aucune partie prévue."
                  mobileView={mobileView}
                />
              ) : (
                <>
                  <UserMatchesTable
                    matches={userPlayedShown}
                    map={map}
                    debugByMatchId={debugByMatchId}
                    emptyLabel="Aucune partie jouée pour le moment."
                    mobileView={mobileView}
                  />
                  {userPlayedMatchesDesc.length > 3 ? (
                    <div style={{ marginTop: "0.75rem" }}>
                      <button
                        type="button"
                        onClick={() => setUserPlayedHistoryExpanded((v) => !v)}
                        style={{ ...iconButtonBaseStyle, ...buttonSecondary, padding: "0.45rem 0.9rem", fontWeight: 600 }}
                        aria-expanded={userPlayedHistoryExpanded}
                        aria-label={
                          userPlayedHistoryExpanded
                            ? "Réduire et n’afficher que les trois dernières parties"
                            : "Afficher tout l’historique des parties jouées"
                        }
                      >
                        {userPlayedHistoryExpanded ? "Moins" : "Plus"}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <section style={{ marginBottom: "1.35rem" }}>
                <h3 style={userSectionHeadingStyle}>Parties prévues</h3>
                <UserMatchesTable
                  matches={userScheduledMatches}
                  map={map}
                  debugByMatchId={debugByMatchId}
                  emptyLabel="Aucune partie prévue."
                  mobileView={mobileView}
                />
              </section>
              <section>
                <h3 style={userSectionHeadingStyle}>Dernières parties</h3>
                <UserMatchesTable
                  matches={userPlayedShown}
                  map={map}
                  debugByMatchId={debugByMatchId}
                  emptyLabel="Aucune partie jouée pour le moment."
                  mobileView={mobileView}
                />
                {userPlayedMatchesDesc.length > 3 ? (
                  <div style={{ marginTop: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => setUserPlayedHistoryExpanded((v) => !v)}
                      style={{ ...iconButtonBaseStyle, ...buttonSecondary, padding: "0.45rem 0.9rem", fontWeight: 600 }}
                      aria-expanded={userPlayedHistoryExpanded}
                      aria-label={
                        userPlayedHistoryExpanded
                          ? "Réduire et n’afficher que les trois dernières parties"
                          : "Afficher tout l’historique des parties jouées"
                      }
                    >
                      {userPlayedHistoryExpanded ? "Moins" : "Plus"}
                    </button>
                  </div>
                ) : null}
              </section>
            </>
          )}
        </>
      ) : mobileView ? (
        <div style={mobileListStyle}>
          {list.map((m) => (
            <MatchMobileCard
              key={m.id}
              m={m}
              map={map}
              debug={debugByMatchId.get(m.id)}
              clickable={canManageLeague}
              onClick={canManageLeague ? () => openAppPathInNewWindow(`/parties/${encodeURIComponent(m.id)}/modifier`) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="table-scroll">
          <table style={tableStyle}>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <MatchWhenWhereCell m={m} />
                  <td style={tdStyle}>
                    <MatchCompositionCell m={m} map={map} debug={debugByMatchId.get(m.id)} />
                  </td>
                  {canManageLeague ? (
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                        <IconActionButton
                          label={`Modifier la partie du ${m.date} dans un nouvel onglet`}
                          icon={Pencil}
                          iconSize={18}
                          style={{ ...iconButtonBaseStyle, ...buttonSecondary }}
                          onClick={() => openAppPathInNewWindow(`/parties/${encodeURIComponent(m.id)}/modifier`)}
                        />
                        <button
                          type="button"
                          style={{ ...iconButtonBaseStyle, ...buttonDanger }}
                          disabled={deletingId !== null}
                          onClick={() => void deleteMatch(m)}
                          aria-label={`Supprimer la partie du ${m.date}`}
                          title="Supprimer la partie"
                        >
                          {deletingId === m.id ? (
                            <Loader2 size={18} strokeWidth={2} className="animate-icon-spin" aria-hidden focusable={false} />
                          ) : (
                            <Trash2 size={18} strokeWidth={2} aria-hidden focusable={false} />
                          )}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {matchCreateOpen && canManageLeague ? (
        <div
          style={matchModalOverlayStyle}
          role="presentation"
          onClick={() => {
            if (!savingMatch) setMatchCreateOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-create-modal-title"
            style={matchModalDialogStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                gap: 12,
                marginBottom: "1rem",
              }}
            >
              <h3 id="match-create-modal-title" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                Nouvelle partie
              </h3>
              <IconActionButton
                label="Fermer"
                icon={X}
                iconSize={22}
                disabled={savingMatch}
                style={{ ...iconButtonBaseStyle, ...matchModalCloseBtnStyle }}
                onClick={() => {
                  if (!savingMatch) setMatchCreateOpen(false);
                }}
              />
            </div>
            {matchCreateError ? (
              <p role="alert" style={{ margin: "0 0 0.75rem", color: "var(--danger)", fontSize: "0.92rem" }}>
                {matchCreateError}
              </p>
            ) : null}
            <MatchForm
              players={playersForCreateModal}
              matches={data.matches.matches}
              seasonId={data.matches.seasonId}
              saving={savingMatch}
              onSubmit={persistMatchCreate}
              onCancel={() => {
                if (!savingMatch) setMatchCreateOpen(false);
              }}
              embeddedInModal
            />
          </div>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        aria-label="Informations"
        title={`Informations — Saison ${seasonLabel} · Build ${BUILD_NUMBER}`}
        style={{
          ...floatingInfoButtonStyle,
          bottom: mobileView ? "calc(5.6rem + env(safe-area-inset-bottom))" : "0.9rem",
        }}
      >
        <CircleHelp size={20} strokeWidth={2} aria-hidden focusable={false} />
      </button>
      {canManageLeague && mobileView ? (
        <div style={mobileFloatingActionWrapStyle}>
          <IconActionButton
            label="Ajouter une partie"
            icon={Plus}
            iconSize={20}
            style={{ ...iconButtonBaseStyle, ...addButtonPillStyle, padding: "0.52rem 0.95rem", minHeight: "2.65rem" }}
            onClick={() => {
              setMatchCreateError(null);
              setMatchCreateOpen(true);
            }}
          />
        </div>
      ) : null}
    </main>
  );
}

const tableStyle: CSSProperties = {
  width: "100%",
  minWidth: "28rem",
  borderCollapse: "collapse",
  background: "var(--surface)",
  borderRadius: 12,
  overflow: "hidden",
};
const tdStyle: CSSProperties = { padding: "0.6rem", borderBottom: "1px solid var(--border)" };
const buttonPrimary: CSSProperties = {
  border: "none",
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontWeight: 700,
};
const addButtonPillStyle: CSSProperties = {
  borderRadius: 999,
  border: "1px solid color-mix(in srgb, var(--accent) 22%, var(--border))",
  background: "var(--surface)",
  color: "var(--nav-active-text)",
  boxShadow: "var(--shadow-sm)",
  fontWeight: 600,
};
const buttonSecondary: CSSProperties = {
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
};
const buttonDanger: CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))",
  background: "color-mix(in srgb, var(--danger) 8%, var(--surface))",
  color: "var(--danger)",
  fontWeight: 600,
};
const mobileListStyle: CSSProperties = { display: "grid", gap: 10 };
const mobileCardStyle: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "0.65rem 0.7rem",
  background: "var(--surface)",
  boxShadow: "var(--shadow-sm)",
};
const mobileCardClickableStyle: CSSProperties = { cursor: "pointer" };
const mobileMetaLineStyle: CSSProperties = {
  fontSize: "0.82rem",
  color: "var(--muted)",
  lineHeight: 1.35,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const mobileDateInlineStyle: CSSProperties = {
  color: "var(--text)",
  fontWeight: 600,
};
const mobileFloatingActionWrapStyle: CSSProperties = {
  position: "fixed",
  left: "0.75rem",
  right: "0.75rem",
  bottom: "calc(5.2rem + env(safe-area-inset-bottom))",
  /** Au-dessus de la barre de navigation mobile (z-index 1200) pour que le clic ne soit pas intercepté. */
  zIndex: 1208,
  display: "flex",
  justifyContent: "center",
};

const matchModalOverlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  /** Au-dessus du shell mobile (barre ~1200) pour que la modale soit utilisable. */
  zIndex: 1300,
};

const matchModalDialogStyle: CSSProperties = {
  width: "100%",
  maxWidth: 720,
  maxHeight: "90vh",
  overflow: "auto",
  background: "var(--surface)",
  borderRadius: 16,
  padding: "1.25rem",
  boxShadow: "var(--shadow-lg)",
  border: "1px solid var(--border)",
};

const matchModalCloseBtnStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  padding: "0.15rem",
  minWidth: "2.25rem",
  minHeight: "2.25rem",
};

const userSectionHeadingStyle: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  margin: "0 0 0.5rem",
  color: "var(--text)",
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
const floatingInfoButtonStyle: CSSProperties = {
  position: "fixed",
  right: "0.85rem",
  bottom: "0.9rem",
  zIndex: 60,
  width: 46,
  height: 46,
  borderRadius: 999,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  boxShadow: "var(--shadow-md)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

function UserMatchesTable({
  matches,
  map,
  debugByMatchId,
  emptyLabel,
  mobileView,
}: {
  matches: Match[];
  map: Map<PlayerId, Player>;
  debugByMatchId: Map<string, MatchDebug>;
  emptyLabel: string;
  mobileView: boolean;
}) {
  if (matches.length === 0) {
    return <p style={{ color: "var(--muted)", margin: "0.35rem 0 0", fontSize: "0.92rem" }}>{emptyLabel}</p>;
  }
  if (mobileView) {
    return (
      <div style={mobileListStyle}>
        {matches.map((m) => (
          <MatchMobileCard key={m.id} m={m} map={map} debug={debugByMatchId.get(m.id)} />
        ))}
      </div>
    );
  }
  return (
    <div className="table-scroll">
      <table style={tableStyle}>
        <tbody>
          {matches.map((m) => (
            <tr key={m.id}>
              <MatchWhenWhereCell m={m} />
              <td style={tdStyle}>
                <MatchCompositionCell m={m} map={map} debug={debugByMatchId.get(m.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
