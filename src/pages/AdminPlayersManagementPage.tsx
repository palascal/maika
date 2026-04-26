import { Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { IconActionButton, iconButtonBaseStyle } from "../components/IconActionButton";
import { AppLink } from "../navigation/AppLink";
import { useAuth } from "../auth/AuthContext";
import { playerLastFirstName } from "../domain/format";
import { playerIsActive } from "../domain/playerActive";
import { collectPlayerIds, uniquePlayerId } from "../domain/playerId";
import { posteLabel } from "../domain/ranking";
import type { Player, PlayerAccessRole, PlayerPoste, PlayersFile } from "../domain/types";
import { computePlayerAuthChanges, syncPlayerAuthEmailsAfterSave } from "../data/playerEmailAuthSync";
import { appRoleLabel } from "../lib/accessRoles";
import { isSupabaseConfigured } from "../lib/supabaseConfig";
import { useSeasonData } from "../season/SeasonDataContext";

const today = () => new Date().toISOString().slice(0, 10);

function normalizeEmail(raw: string): string | undefined {
  const t = raw.trim().toLowerCase();
  return t.length > 0 ? t : undefined;
}

function isValidOptionalEmail(raw: string): boolean {
  const t = raw.trim();
  if (!t) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

export function AdminPlayersManagementPage() {
  const { canManageLeague, canAssignElevatedRoles, isAdmin } = useAuth();
  const { data, error, loading, savePlayersFile } = useSeasonData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tous" | "actifs" | "inactifs">("tous");
  const [sortMode, setSortMode] = useState<"alpha" | "poste" | "nbParties">("alpha");
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; player: Player }>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const nouv = searchParams.get("nouveau");
    const mod = searchParams.get("modifier");
    if (nouv === "1") {
      setModal({ mode: "create" });
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete("nouveau");
          return n;
        },
        { replace: true },
      );
    }
    if (mod) {
      const pl = data.players.players.find((p) => p.id === mod);
      if (pl) setModal({ mode: "edit", player: pl });
      setSearchParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete("modifier");
          return n;
        },
        { replace: true },
      );
    }
  }, [data, searchParams, setSearchParams]);

  const persist = useCallback(
    async (nextPlayers: Player[]) => {
      if (!data) return;
      const beforePlayers = data.players.players;
      const authChanges = computePlayerAuthChanges(beforePlayers, nextPlayers);
      const next: PlayersFile = {
        ...data.players,
        players: nextPlayers,
        updatedAt: today(),
      };
      setSaveError(null);
      setSaving(true);
      try {
        await savePlayersFile(next);
        if (isSupabaseConfigured() && authChanges.length > 0) {
          const sync = await syncPlayerAuthEmailsAfterSave(authChanges);
          if (!sync.ok) {
            setSaveError(
              `Joueurs enregistrés, mais la synchronisation Supabase Auth a échoué : ${sync.message} Déployez la fonction Edge « admin-sync-player-emails » (voir docs/INSTRUCTIONS.md).`,
            );
          }
        }
        setModal(null);
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : "Enregistrement impossible.");
      } finally {
        setSaving(false);
      }
    },
    [data, savePlayersFile],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.players.players.filter((p) => {
      if (statusFilter === "actifs" && !playerIsActive(p)) return false;
      if (statusFilter === "inactifs" && playerIsActive(p)) return false;
      if (!q) return true;
      const blob = `${p.lastName} ${p.firstName} ${p.id} ${p.email ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [data, query, statusFilter]);

  const playedCountByPlayerId = useMemo(() => {
    const out = new Map<string, number>();
    if (!data) return out;
    for (const m of data.matches.matches) {
      if (m.status !== "played") continue;
      for (const id of [...m.teamA, ...m.teamB]) {
        out.set(id, (out.get(id) ?? 0) + 1);
      }
    }
    return out;
  }, [data]);

  const sorted = useMemo(
    () =>
      filtered.slice().sort((a, b) => {
        if (sortMode === "poste") {
          const p = posteLabel(a.poste).localeCompare(posteLabel(b.poste), "fr");
          if (p !== 0) return p;
        }
        if (sortMode === "nbParties") {
          const aCount = playedCountByPlayerId.get(a.id) ?? 0;
          const bCount = playedCountByPlayerId.get(b.id) ?? 0;
          if (aCount !== bCount) return bCount - aCount;
        }
        const ln = a.lastName.localeCompare(b.lastName, "fr");
        if (ln !== 0) return ln;
        return a.firstName.localeCompare(b.firstName, "fr");
      }),
    [filtered, playedCountByPlayerId, sortMode],
  );

  if (!canManageLeague) return <Navigate to="/" replace />;
  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data) return <p>Chargement…</p>;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.35rem" }}>Administration des joueurs</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem", maxWidth: 640 }}>
            Création, édition, e-mail de contact et activation. Les parties existantes ne sont pas modifiées lorsqu’un joueur
            est désactivé. Le bouton « Ajouter » de la page Joueurs ouvre cette même vue. En mode Supabase, un e-mail
            renseigné est aligné sur Authentication (invitation ou changement d’adresse) après enregistrement, si la fonction
            Edge est déployée.
          </p>
        </div>
      </div>

      <div style={toolbarStyle}>
        <input
          type="search"
          placeholder="Rechercher (nom, prénom, id, e-mail)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={searchInputStyle}
          aria-label="Rechercher un joueur"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={selectStyle}>
          <option value="tous">Tous</option>
          <option value="actifs">Actifs seulement</option>
          <option value="inactifs">Désactivés seulement</option>
        </select>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)} style={selectStyle}>
          <option value="alpha">Tri : alphabétique</option>
          <option value="poste">Tri : poste</option>
          <option value="nbParties">Tri : nb parties jouées</option>
        </select>
        <IconActionButton
          label="Créer un nouveau joueur"
          icon={Plus}
          iconSize={20}
          style={{ ...iconButtonBaseStyle, ...accentBtnStyle, border: "none", padding: "0.5rem 0.75rem" }}
          onClick={() => setModal({ mode: "create" })}
        />
      </div>

      {saveError ? (
        <p role="alert" style={{ color: "var(--danger)", marginBottom: "0.75rem", fontSize: "0.92rem" }}>
          {saveError}
        </p>
      ) : null}

      <div className="table-scroll">
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              <th style={thStyle}>Joueur</th>
              <th style={thStyle}>Nb parties</th>
              <th style={thStyle}>Poste</th>
              <th style={{ ...thStyle, whiteSpace: "nowrap", minWidth: 118 }}>État</th>
              <th style={{ ...thStyle, width: 1, whiteSpace: "nowrap", textAlign: "right" }} aria-label="Modifier" />
              {isAdmin ? <th style={thStyle}>Rôle</th> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} style={{ opacity: playerIsActive(p) ? 1 : 0.72 }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600, minWidth: 0 }}>{playerLastFirstName(p)}</div>
                </td>
                <td style={tdStyle}>{playedCountByPlayerId.get(p.id) ?? 0}</td>
                <td style={tdStyle}>{posteLabel(p.poste)}</td>
                <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{playerIsActive(p) ? <span style={badgeOk}>Actif</span> : <span style={badgeOff}>Désactivé</span>}</td>
                <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap", verticalAlign: "middle" }}>
                  <IconActionButton
                    label={`Modifier ${playerLastFirstName(p)}`}
                    icon={Pencil}
                    iconSize={17}
                    style={{ ...iconButtonBaseStyle, ...smallBtnStyle, padding: "0.35rem 0.5rem" }}
                    onClick={() => setModal({ mode: "edit", player: p })}
                  />
                </td>
                {isAdmin ? <td style={tdStyle}>{appRoleLabel(p.authRole ?? "user")}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal ? (
        <PlayerModal
          mode={modal.mode}
          player={modal.mode === "edit" ? modal.player : undefined}
          players={data.players.players}
          startingSeasonPoints={data.scoring.startingSeasonPoints}
          saving={saving}
          canAssignElevatedRoles={canAssignElevatedRoles}
          onClose={() => {
            setSaveError(null);
            setModal(null);
          }}
          onSave={async (nextList) => {
            await persist(nextList);
          }}
        />
      ) : null}
    </main>
  );
}

function PlayerModal({
  mode,
  player,
  players,
  startingSeasonPoints,
  saving,
  canAssignElevatedRoles,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  player?: Player;
  players: Player[];
  startingSeasonPoints: number;
  saving: boolean;
  canAssignElevatedRoles: boolean;
  onClose: () => void;
  onSave: (list: Player[]) => void | Promise<void>;
}) {
  const [lastName, setLastName] = useState(player?.lastName ?? "");
  const [firstName, setFirstName] = useState(player?.firstName ?? "");
  const [poste, setPoste] = useState<PlayerPoste>(player?.poste ?? "avant");
  const [seasonPoints, setSeasonPoints] = useState(String(player?.seasonPoints ?? startingSeasonPoints));
  const [email, setEmail] = useState(player?.email ?? "");
  const [authRole, setAuthRole] = useState<PlayerAccessRole>(player?.authRole ?? "user");
  const [active, setActive] = useState(player ? playerIsActive(player) : true);
  const [localErr, setLocalErr] = useState<string | null>(null);
  /** Si faux, à l’enregistrement on garde les points de la fiche à jour (`players`) — ex. changement de poste seul ou formulaire désynchronisé. */
  const [seasonPointsEdited, setSeasonPointsEdited] = useState(false);

  useEffect(() => {
    setSeasonPointsEdited(false);
    setLastName(player?.lastName ?? "");
    setFirstName(player?.firstName ?? "");
    setPoste(player?.poste ?? "avant");
    setSeasonPoints(String(player?.seasonPoints ?? startingSeasonPoints));
    setEmail(player?.email ?? "");
    setAuthRole(player?.authRole ?? "user");
    setActive(player ? playerIsActive(player) : true);
    setLocalErr(null);
  }, [player, mode, startingSeasonPoints]);

  useEffect(() => {
    if (mode !== "edit" || !player || seasonPointsEdited) return;
    const live = players.find((pl) => pl.id === player.id);
    if (!live) return;
    setSeasonPoints(String(live.seasonPoints));
  }, [mode, player, players, seasonPointsEdited]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    if (!isValidOptionalEmail(email)) {
      setLocalErr("E-mail invalide (laisser vide si besoin).");
      return;
    }
    const ln = lastName.trim();
    const fn = firstName.trim();
    const pts = Number(seasonPoints);
    if (!ln || !fn || !Number.isFinite(pts)) return;
    const em = normalizeEmail(email);
    if (mode === "edit" && player) {
      const liveRow = players.find((pl) => pl.id === player.id);
      const resolvedSeasonPoints = seasonPointsEdited ? Math.round(pts) : (liveRow?.seasonPoints ?? Math.round(pts));
      const next = players.map((p) => {
        if (p.id !== player.id) return p;
        const updated: Player = { ...p, lastName: ln, firstName: fn, poste, seasonPoints: resolvedSeasonPoints, active };
        if (em) updated.email = em;
        else delete (updated as { email?: string }).email;
        if (canAssignElevatedRoles) {
          if (authRole === "user") delete (updated as { authRole?: PlayerAccessRole }).authRole;
          else updated.authRole = authRole;
        }
        return updated;
      });
      await onSave(next);
      return;
    }
    const id = uniquePlayerId(fn, ln, collectPlayerIds(players));
    const newP: Player = {
      id,
      lastName: ln,
      firstName: fn,
      poste,
      seasonPoints: Math.round(pts),
      active,
      ...(em ? { email: em } : {}),
      ...(canAssignElevatedRoles && authRole !== "user" ? { authRole } : {}),
    };
    await onSave([...players, newP]);
  }

  return (
    <div style={overlayStyle} role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-modal-title"
        style={dialogStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, marginBottom: "1rem" }}>
          <h3 id="player-modal-title" style={{ margin: 0, fontSize: "1.05rem" }}>
            {mode === "create" ? "Nouveau joueur" : "Modifier le joueur"}
          </h3>
          <IconActionButton label="Fermer" icon={X} iconSize={22} style={{ ...iconButtonBaseStyle, ...closeBtnStyle }} onClick={onClose} />
        </div>
        <form onSubmit={(e) => void submit(e)} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="responsive-form-grid" style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <label style={labelStyle}>
              Nom
              <input value={lastName} disabled={saving} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Prénom
              <input value={firstName} disabled={saving} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Poste
              <select value={poste} disabled={saving} onChange={(e) => setPoste(e.target.value as PlayerPoste)} style={inputStyle}>
                <option value="avant">{posteLabel("avant")}</option>
                <option value="arriere">{posteLabel("arriere")}</option>
              </select>
            </label>
            <label style={labelStyle}>
              Points saison
              <input
                type="number"
                value={seasonPoints}
                disabled={saving}
                onChange={(e) => {
                  setSeasonPointsEdited(true);
                  setSeasonPoints(e.target.value);
                }}
                required
                style={inputStyle}
              />
            </label>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              E-mail (optionnel)
              <input
                type="email"
                value={email}
                disabled={saving}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@exemple.fr"
                autoComplete="off"
                style={inputStyle}
              />
            </label>
            {canAssignElevatedRoles ? (
              <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                Rôle applicatif (compte lié à l’e-mail)
                <select value={authRole} disabled={saving} onChange={(e) => setAuthRole(e.target.value as PlayerAccessRole)} style={inputStyle}>
                  <option value="user">User (lecture)</option>
                  <option value="orga">Orga (gestion joueurs + parties)</option>
                  <option value="admin">Admin (config + attribution des rôles)</option>
                </select>
              </label>
            ) : (
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--muted)", gridColumn: "1 / -1" }}>
                Seul un admin peut attribuer les rôles <code>orga</code> ou <code>admin</code>.
              </p>
            )}
            <label style={{ ...labelStyle, gridColumn: "1 / -1", flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={active} disabled={saving} onChange={(e) => setActive(e.target.checked)} />
              <span>Joueur Actif</span>
            </label>
          </div>
          {mode === "edit" && player && canAssignElevatedRoles ? (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
              Identifiant technique : <code>{player.id}</code> (stable pour l’historique des parties).
            </p>
          ) : null}
          {localErr ? (
            <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.88rem" }}>
              {localErr}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 4 }}>
            <IconActionButton
              label="Annuler"
              icon={X}
              iconSize={20}
              disabled={saving}
              style={{ ...iconButtonBaseStyle, ...secondaryBtnStyle, padding: "0.5rem 0.75rem" }}
              onClick={onClose}
            />
            <button
              type="submit"
              disabled={saving}
              aria-label={saving ? "Enregistrement en cours" : "Enregistrer le joueur"}
              title={saving ? "Enregistrement…" : "Enregistrer"}
              style={{ ...iconButtonBaseStyle, ...accentBtnStyle, border: "none", padding: "0.5rem 0.85rem" }}
            >
              {saving ? (
                <Loader2 size={20} strokeWidth={2} className="animate-icon-spin" aria-hidden focusable={false} />
              ) : (
                <Save size={20} strokeWidth={2} aria-hidden focusable={false} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ghostLinkStyle: CSSProperties = {
  fontWeight: 600,
  textDecoration: "none",
  color: "var(--muted)",
  fontSize: "0.9rem",
};

const toolbarStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: "1rem",
  alignItems: "center",
};

const searchInputStyle: CSSProperties = {
  flex: "1 1 200px",
  minWidth: 180,
  padding: "0.55rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "1rem",
};

const selectStyle: CSSProperties = {
  padding: "0.55rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "0.95rem",
  minHeight: "2.75rem",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "var(--surface)",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "0.65rem 0.75rem",
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--muted)",
  borderBottom: "1px solid var(--border)",
};

const tdStyle: CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "top",
};

const badgeOk: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  padding: "0.2rem 0.5rem",
  borderRadius: 999,
  background: "color-mix(in srgb, var(--success) 14%, var(--surface))",
  color: "var(--success)",
};

const badgeOff: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  padding: "0.2rem 0.5rem",
  borderRadius: 999,
  background: "color-mix(in srgb, #f59e0b 16%, var(--surface))",
  color: "var(--warning-fg)",
};

const smallBtnStyle: CSSProperties = {
  padding: "0.35rem 0.65rem",
  borderRadius: 8,
  border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
  background: "color-mix(in srgb, var(--accent) 12%, transparent)",
  color: "var(--accent)",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.88rem",
};

const accentBtnStyle: CSSProperties = {
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.95rem",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 50,
};

const dialogStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  maxHeight: "90vh",
  overflow: "auto",
  background: "var(--surface)",
  borderRadius: 16,
  padding: "1.25rem",
  boxShadow: "var(--shadow-lg)",
  border: "1px solid var(--border)",
};

const closeBtnStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  padding: "0.15rem",
  minWidth: "2.25rem",
  minHeight: "2.25rem",
};

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: "0.85rem",
  color: "var(--muted)",
  minWidth: 0,
};

const inputStyle: CSSProperties = {
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "1rem",
  minHeight: "2.65rem",
};

const secondaryBtnStyle: CSSProperties = {
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
};
