import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { maikaFromSeasonPoints } from "../domain/maika";
import { playerIsActive } from "../domain/playerActive";
import { collectPlayerIds, uniquePlayerId } from "../domain/playerId";
import { posteLabel } from "../domain/ranking";
import type { Player, PlayerPoste, PlayersFile } from "../domain/types";
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
  const { isAdmin } = useAuth();
  const { data, error, loading, savePlayersFile } = useSeasonData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"tous" | "actifs" | "inactifs">("tous");
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
      const next: PlayersFile = {
        ...data.players,
        players: nextPlayers,
        updatedAt: today(),
      };
      setSaveError(null);
      setSaving(true);
      try {
        await savePlayersFile(next);
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

  const sorted = useMemo(
    () =>
      filtered.slice().sort((a, b) => {
        const ln = a.lastName.localeCompare(b.lastName, "fr");
        if (ln !== 0) return ln;
        return a.firstName.localeCompare(b.firstName, "fr");
      }),
    [filtered],
  );

  if (!isAdmin) return <Navigate to="/" replace />;
  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data) return <p>Chargement…</p>;

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.35rem" }}>Administration des joueurs</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem", maxWidth: 640 }}>
            Création, édition, e-mail de contact et activation. Les parties existantes ne sont pas modifiées lorsqu’un joueur
            est désactivé. Le bouton « Ajouter » de la page Joueurs ouvre cette même vue.
          </p>
        </div>
        <Link to="/joueurs" style={ghostLinkStyle}>
          ← Liste & classements
        </Link>
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
        <button type="button" style={accentBtnStyle} onClick={() => setModal({ mode: "create" })}>
          + Nouveau joueur
        </button>
      </div>

      {saveError ? (
        <p role="alert" style={{ color: "#f87171", marginBottom: "0.75rem", fontSize: "0.92rem" }}>
          {saveError}
        </p>
      ) : null}

      <div className="table-scroll" style={{ borderRadius: 12, border: "1px solid var(--muted)", overflow: "hidden" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              <th style={thStyle}>Joueur</th>
              <th style={thStyle}>Poste</th>
              <th style={thStyle}>Points</th>
              <th style={thStyle}>Maika</th>
              <th style={thStyle}>E-mail</th>
              <th style={thStyle}>État</th>
              <th style={thStyle} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} style={{ opacity: playerIsActive(p) ? 1 : 0.72 }}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 600 }}>{p.firstName} {p.lastName}</div>
                  <code style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{p.id}</code>
                </td>
                <td style={tdStyle}>{posteLabel(p.poste)}</td>
                <td style={tdStyle}>{p.seasonPoints}</td>
                <td style={tdStyle}>{maikaFromSeasonPoints(p.seasonPoints)}</td>
                <td style={tdStyle}>{p.email ?? "—"}</td>
                <td style={tdStyle}>{playerIsActive(p) ? <span style={badgeOk}>Actif</span> : <span style={badgeOff}>Désactivé</span>}</td>
                <td style={tdStyle}>
                  <button type="button" style={smallBtnStyle} onClick={() => setModal({ mode: "edit", player: p })}>
                    Modifier
                  </button>
                </td>
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
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  player?: Player;
  players: Player[];
  startingSeasonPoints: number;
  saving: boolean;
  onClose: () => void;
  onSave: (list: Player[]) => void | Promise<void>;
}) {
  const [lastName, setLastName] = useState(player?.lastName ?? "");
  const [firstName, setFirstName] = useState(player?.firstName ?? "");
  const [poste, setPoste] = useState<PlayerPoste>(player?.poste ?? "avant");
  const [seasonPoints, setSeasonPoints] = useState(String(player?.seasonPoints ?? startingSeasonPoints));
  const [email, setEmail] = useState(player?.email ?? "");
  const [active, setActive] = useState(player ? playerIsActive(player) : true);
  const [localErr, setLocalErr] = useState<string | null>(null);

  useEffect(() => {
    setLastName(player?.lastName ?? "");
    setFirstName(player?.firstName ?? "");
    setPoste(player?.poste ?? "avant");
    setSeasonPoints(String(player?.seasonPoints ?? startingSeasonPoints));
    setEmail(player?.email ?? "");
    setActive(player ? playerIsActive(player) : true);
    setLocalErr(null);
  }, [player, mode, startingSeasonPoints]);

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
      const next = players.map((p) => {
        if (p.id !== player.id) return p;
        const updated: Player = { ...p, lastName: ln, firstName: fn, poste, seasonPoints: Math.round(pts), active };
        if (em) updated.email = em;
        else delete (updated as { email?: string }).email;
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
          <button type="button" aria-label="Fermer" onClick={onClose} style={closeBtnStyle}>
            ×
          </button>
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
              <input type="number" value={seasonPoints} disabled={saving} onChange={(e) => setSeasonPoints(e.target.value)} required style={inputStyle} />
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
            <label style={{ ...labelStyle, gridColumn: "1 / -1", flexDirection: "row", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={active} disabled={saving} onChange={(e) => setActive(e.target.checked)} />
              <span>Joueur actif (classé et sélectionnable pour les nouvelles parties)</span>
            </label>
          </div>
          {mode === "edit" && player ? (
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
              Identifiant technique : <code>{player.id}</code> (stable pour l’historique des parties).
            </p>
          ) : null}
          {localErr ? (
            <p role="alert" style={{ margin: 0, color: "#f87171", fontSize: "0.88rem" }}>
              {localErr}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap", marginTop: 4 }}>
            <button type="button" style={secondaryBtnStyle} onClick={onClose} disabled={saving}>
              Annuler
            </button>
            <button type="submit" style={accentBtnStyle} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
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
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
};

const selectStyle: CSSProperties = {
  padding: "0.55rem 0.75rem",
  borderRadius: 10,
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "0.95rem",
  minHeight: "2.75rem",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "var(--bg)",
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "0.65rem 0.75rem",
  fontSize: "0.78rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--muted)",
  borderBottom: "1px solid var(--muted)",
};

const tdStyle: CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderBottom: "1px solid #334155",
  verticalAlign: "top",
};

const badgeOk: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  padding: "0.2rem 0.5rem",
  borderRadius: 999,
  background: "rgba(34,197,94,0.15)",
  color: "#86efac",
};

const badgeOff: CSSProperties = {
  fontSize: "0.78rem",
  fontWeight: 700,
  padding: "0.2rem 0.5rem",
  borderRadius: 999,
  background: "rgba(251,191,36,0.12)",
  color: "#fcd34d",
};

const smallBtnStyle: CSSProperties = {
  padding: "0.35rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.88rem",
};

const accentBtnStyle: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 10,
  border: "none",
  background: "var(--accent)",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.95rem",
};

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.65)",
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
  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.45)",
  border: "1px solid var(--muted)",
};

const closeBtnStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  fontSize: "1.5rem",
  lineHeight: 1,
  cursor: "pointer",
  padding: "0 0.25rem",
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
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
  minHeight: "2.65rem",
};

const secondaryBtnStyle: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 10,
  border: "1px solid var(--muted)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
};
