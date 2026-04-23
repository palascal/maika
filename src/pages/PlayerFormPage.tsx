import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { maikaFromSeasonPoints } from "../domain/maika";
import { collectPlayerIds, uniquePlayerId } from "../domain/playerId";
import { posteLabel } from "../domain/ranking";
import type { Player, PlayerPoste, PlayersFile } from "../domain/types";
import { useSeasonData } from "../season/SeasonDataContext";

const today = () => new Date().toISOString().slice(0, 10);

type Mode = "add" | "edit";

export function PlayerFormPage({ mode }: { mode: Mode }) {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data, error, loading, savePlayersFile } = useSeasonData();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) navigate("/joueurs", { replace: true });
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  if (error) return <p role="alert">Erreur : {error}</p>;
  if (loading || !data) return <p>Chargement…</p>;

  if (mode === "edit" && (!playerId || !data.players.players.some((p) => p.id === playerId))) {
    return (
      <main>
        <p>Joueur introuvable.</p>
        <p>
          <Link to="/joueurs">Retour aux joueurs</Link>
        </p>
      </main>
    );
  }

  async function persist(nextPlayers: Player[]) {
    const next: PlayersFile = {
      ...data.players,
      players: nextPlayers,
      updatedAt: today(),
    };
    setSaveError(null);
    setSaving(true);
    try {
      await savePlayersFile(next);
      navigate("/joueurs", { replace: true });
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        <Link to="/joueurs" style={backLinkStyle}>
          ← Retour aux joueurs
        </Link>
      </p>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>{mode === "add" ? "Ajouter un joueur" : "Modifier un joueur"}</h2>
      {saveError ? <p role="alert" style={{ color: "#f87171", margin: "0 0 1rem" }}>{saveError}</p> : null}
      <PlayerForm
        players={data.players.players}
        startingSeasonPoints={data.scoring.startingSeasonPoints}
        editingPlayerId={mode === "edit" ? playerId : undefined}
        saving={saving}
        onSubmit={persist}
        onCancel={() => navigate("/joueurs")}
      />
    </main>
  );
}

function PlayerForm({
  players,
  startingSeasonPoints,
  editingPlayerId,
  saving,
  onSubmit,
  onCancel,
}: {
  players: Player[];
  startingSeasonPoints: number;
  editingPlayerId?: string;
  saving: boolean;
  onSubmit: (players: Player[]) => Promise<void>;
  onCancel?: () => void;
}) {
  const editingPlayer = editingPlayerId ? (players.find((p) => p.id === editingPlayerId) ?? null) : null;
  const [lastName, setLastName] = useState(editingPlayer?.lastName ?? "");
  const [firstName, setFirstName] = useState(editingPlayer?.firstName ?? "");
  const [poste, setPoste] = useState<PlayerPoste>(editingPlayer?.poste ?? "avant");
  const [seasonPoints, setSeasonPoints] = useState(
    () => (editingPlayer ? String(editingPlayer.seasonPoints) : String(startingSeasonPoints)),
  );

  useEffect(() => {
    if (editingPlayer) {
      setLastName(editingPlayer.lastName);
      setFirstName(editingPlayer.firstName);
      setPoste(editingPlayer.poste);
      setSeasonPoints(String(editingPlayer.seasonPoints));
    } else {
      setLastName("");
      setFirstName("");
      setPoste("avant");
      setSeasonPoints(String(startingSeasonPoints));
    }
  }, [editingPlayerId, editingPlayer, startingSeasonPoints]);

  const pointsPreview = Number(seasonPoints);
  const maikaPreview = Number.isFinite(pointsPreview) ? maikaFromSeasonPoints(pointsPreview) : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ln = lastName.trim();
    const fn = firstName.trim();
    const pts = Number(seasonPoints);
    if (!ln || !fn || !Number.isFinite(pts)) return;
    if (editingPlayer) {
      const next = players.map((p) =>
        p.id === editingPlayer.id ? { ...p, lastName: ln, firstName: fn, poste, seasonPoints: Math.round(pts) } : p,
      );
      await onSubmit(next);
      return;
    }
    const id = uniquePlayerId(fn, ln, collectPlayerIds(players));
    await onSubmit([...players, { id, lastName: ln, firstName: fn, poste, seasonPoints: Math.round(pts) }]);
  }

  return (
    <form onSubmit={(e) => void submit(e)} style={formStyle}>
      <div className="responsive-form-grid" style={gridStyle}>
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
          Points
          <input type="number" value={seasonPoints} disabled={saving} onChange={(e) => setSeasonPoints(e.target.value)} required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          Maika
          <span style={readOnlyFieldStyle} title="Partie entière des points divisés par 10">
            {maikaPreview}
          </span>
        </label>
      </div>
      <div className="form-actions">
        <button type="submit" disabled={saving} style={buttonPrimary}>
          {editingPlayer ? "Enregistrer" : "Ajouter"}
        </button>
        {onCancel ? (
          <button type="button" disabled={saving} style={buttonSecondary} onClick={onCancel}>
            Annuler
          </button>
        ) : null}
      </div>
    </form>
  );
}

const backLinkStyle: CSSProperties = { fontWeight: 600, textDecoration: "none" };
const formStyle: CSSProperties = { marginTop: "0.5rem", background: "var(--surface)", borderRadius: 12, padding: "1rem" };
const gridStyle: CSSProperties = { gap: 10, marginBottom: "0.8rem" };
const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: "0.85rem", color: "var(--muted)", minWidth: 0 };
const inputStyle: CSSProperties = {
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
  minHeight: "2.75rem",
};
const readOnlyFieldStyle: CSSProperties = {
  ...inputStyle,
  display: "flex",
  alignItems: "center",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  cursor: "default",
  userSelect: "none",
};
const buttonPrimary: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  minHeight: "2.75rem",
};
const buttonSecondary: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
  minHeight: "2.75rem",
};
