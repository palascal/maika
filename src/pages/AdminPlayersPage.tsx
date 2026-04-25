import { Loader2, Plus, Save } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { iconButtonBaseStyle } from "../components/IconActionButton";
import { InfoTooltip } from "../components/InfoTooltip";
import { maikaFromSeasonPoints } from "../domain/maika";
import { playerIsActive } from "../domain/playerActive";
import { collectPlayerIds, uniquePlayerId } from "../domain/playerId";
import { posteLabel } from "../domain/ranking";
import type { Player, PlayerPoste, PlayersFile } from "../domain/types";
import { useSeasonData } from "../season/SeasonDataContext";

const today = () => new Date().toISOString().slice(0, 10);

export function AdminPlayersPage() {
  const { data, error, loading, savePlayersFile } = useSeasonData();
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <p>Chargement…</p>;
  if (error) return <p role="alert">Erreur : {error}</p>;
  if (!data) return <p>Aucune donnée.</p>;

  const file = data.players;

  async function persist(nextPlayers: Player[]) {
    const next: PlayersFile = {
      ...file,
      players: nextPlayers,
      updatedAt: today(),
    };
    setSaveError(null);
    setMessage(null);
    setSaving(true);
    try {
      await savePlayersFile(next);
      setMessage("Enregistré dans le fichier players.json du projet (via le serveur de dev ou preview).");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <div style={headingRowStyle}>
        <h2 style={{ fontSize: "1.1rem", marginTop: 0, marginBottom: 0 }}>Gestion des joueurs</h2>
        <InfoTooltip label="Aide gestion des joueurs">
          <p style={tipTextStyle}>
            En développement (<code>npm run dev</code>), les changements sont écrits dans <code>public/data/players.json</code>.
          </p>
          <p style={tipTextStyle}>
            Après <code>npm run build</code>, utilisez <code>npm run preview</code> pour enregistrer dans{" "}
            <code>dist/data/players.json</code>.
          </p>
          <p style={{ ...tipTextStyle, marginBottom: 0 }}>
            Sur un hébergement statique sans serveur, l’API d’enregistrement n’existe pas.
          </p>
        </InfoTooltip>
      </div>
      {message ? (
        <p style={{ color: "var(--accent)", marginBottom: "1rem", fontSize: "0.95rem" }}>{message}</p>
      ) : null}
      {saveError ? (
        <p role="alert" style={{ color: "#f87171", marginBottom: "1rem", fontSize: "0.95rem" }}>
          {saveError}
        </p>
      ) : null}
      {saving ? <p style={{ marginBottom: "1rem", color: "var(--muted)" }}>Enregistrement…</p> : null}
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {file.players.map((p) => (
          <li key={p.id}>
            <PlayerEditCard
              player={p}
              disabled={saving}
              onSave={async (updated) => {
                const idx = file.players.findIndex((x) => x.id === updated.id);
                if (idx < 0) return;
                const next = file.players.slice();
                next[idx] = updated;
                await persist(next);
              }}
            />
          </li>
        ))}
      </ul>
      <AddPlayerSection
        playersFile={file}
        startingSeasonPoints={data.scoring.startingSeasonPoints}
        saving={saving}
        onAdd={async (player) => {
          await persist([...file.players, player]);
        }}
      />
    </main>
  );
}

function PlayerEditCard({
  player,
  disabled,
  onSave,
}: {
  player: Player;
  disabled?: boolean;
  onSave: (p: Player) => void | Promise<void>;
}) {
  const [lastName, setLastName] = useState(player.lastName);
  const [firstName, setFirstName] = useState(player.firstName);
  const [poste, setPoste] = useState<PlayerPoste>(player.poste);
  const [seasonPoints, setSeasonPoints] = useState(String(player.seasonPoints));
  const [active, setActive] = useState(playerIsActive(player));

  useEffect(() => {
    setLastName(player.lastName);
    setFirstName(player.firstName);
    setPoste(player.poste);
    setSeasonPoints(String(player.seasonPoints));
    setActive(playerIsActive(player));
  }, [player.id, player.lastName, player.firstName, player.poste, player.seasonPoints, player.active]);

  const ptsPreview = Number(seasonPoints);
  const maikaPreview = Number.isFinite(ptsPreview) ? maikaFromSeasonPoints(ptsPreview) : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const pts = Number(seasonPoints);
    if (!Number.isFinite(pts)) return;
    await onSave({
      ...player,
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      poste,
      seasonPoints: Math.round(pts),
      active,
    });
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      style={{
        background: "var(--surface)",
        borderRadius: 12,
        padding: "1rem",
        display: "grid",
        gap: 10,
        gridTemplateColumns: "1fr 1fr",
      }}
    >
      <div style={{ gridColumn: "1 / -1", fontSize: "0.85rem", color: "var(--muted)" }}>
        id : <code>{player.id}</code>
        {playerIsActive(player) ? null : (
          <span style={{ marginLeft: 8, color: "#fbbf24" }}>(désactivé — hors classements / nouvelles parties)</span>
        )}
      </div>
      <label style={labelStyle}>
        Nom
        <input value={lastName} disabled={disabled} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Prénom
        <input value={firstName} disabled={disabled} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Poste
        <select value={poste} disabled={disabled} onChange={(e) => setPoste(e.target.value as PlayerPoste)} style={inputStyle}>
          <option value="avant">{posteLabel("avant")}</option>
          <option value="arriere">{posteLabel("arriere")}</option>
        </select>
      </label>
      <label style={labelStyle}>
        Points
        <input
          type="number"
          value={seasonPoints}
          disabled={disabled}
          onChange={(e) => setSeasonPoints(e.target.value)}
          required
          style={inputStyle}
        />
      </label>
      <label style={labelStyle}>
        Maika
        <span style={readOnlyBoxStyle}>{maikaPreview}</span>
      </label>
      <label style={{ ...labelStyle, gridColumn: "1 / -1", flexDirection: "row", alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={active} disabled={disabled} onChange={(e) => setActive(e.target.checked)} />
        <span>Joueur actif (classé et sélectionnable pour les nouvelles parties)</span>
      </label>
      <button
        type="submit"
        disabled={disabled}
        aria-label="Enregistrer ce joueur"
        title="Enregistrer"
        style={{ ...iconButtonBaseStyle, ...buttonSecondary, gridColumn: "1 / -1", padding: "0.55rem 0.85rem" }}
      >
        {disabled ? (
          <Loader2 size={19} strokeWidth={2} className="animate-icon-spin" aria-hidden focusable={false} />
        ) : (
          <Save size={19} strokeWidth={2} aria-hidden focusable={false} />
        )}
      </button>
    </form>
  );
}

function AddPlayerSection({
  playersFile,
  startingSeasonPoints,
  saving,
  onAdd,
}: {
  playersFile: PlayersFile;
  startingSeasonPoints: number;
  saving: boolean;
  onAdd: (p: Player) => void | Promise<void>;
}) {
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [poste, setPoste] = useState<PlayerPoste>("avant");
  const [seasonPoints, setSeasonPoints] = useState(() => String(startingSeasonPoints));

  useEffect(() => {
    setSeasonPoints(String(startingSeasonPoints));
  }, [startingSeasonPoints]);

  const existingIds = useMemo(() => collectPlayerIds(playersFile.players), [playersFile.players]);

  const ptsAddPreview = Number(seasonPoints);
  const maikaAddPreview = Number.isFinite(ptsAddPreview) ? maikaFromSeasonPoints(ptsAddPreview) : 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ln = lastName.trim();
    const fn = firstName.trim();
    if (!ln || !fn) return;
    const pts = Number(seasonPoints);
    if (!Number.isFinite(pts)) return;
    const id = uniquePlayerId(fn, ln, existingIds);
    await onAdd({
      id,
      lastName: ln,
      firstName: fn,
      poste,
      seasonPoints: Math.round(pts),
      active: true,
    });
    setLastName("");
    setFirstName("");
    setPoste("avant");
    setSeasonPoints(String(startingSeasonPoints));
  }

  return (
    <section style={{ marginTop: "1.5rem" }}>
      <h3 style={{ fontSize: "1rem", marginTop: 0 }}>Ajouter un joueur</h3>
      <form
        onSubmit={(e) => void submit(e)}
        style={{
          background: "var(--surface)",
          borderRadius: 12,
          padding: "1rem",
          display: "grid",
          gap: 10,
          gridTemplateColumns: "1fr 1fr",
        }}
      >
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
          <input
            type="number"
            value={seasonPoints}
            disabled={saving}
            onChange={(e) => setSeasonPoints(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Maika
          <span style={readOnlyBoxStyle}>{maikaAddPreview}</span>
        </label>
        <button
          type="submit"
          disabled={saving}
          aria-label="Ajouter le joueur"
          title="Ajouter"
          style={{ ...iconButtonBaseStyle, ...buttonPrimary, gridColumn: "1 / -1", border: "none", padding: "0.55rem 0.85rem" }}
        >
          {saving ? (
            <Loader2 size={20} strokeWidth={2} className="animate-icon-spin" aria-hidden focusable={false} />
          ) : (
            <Plus size={20} strokeWidth={2} aria-hidden focusable={false} />
          )}
        </button>
      </form>
    </section>
  );
}

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: "0.85rem",
  color: "var(--muted)",
};
const headingRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginBottom: "1rem",
};
const tipTextStyle: CSSProperties = { margin: "0 0 0.45rem", color: "var(--text)" };

const readOnlyBoxStyle: CSSProperties = {
  padding: "0.5rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
  minHeight: "2.5rem",
  display: "flex",
  alignItems: "center",
  userSelect: "none",
};

const inputStyle: CSSProperties = {
  padding: "0.5rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
};

const buttonSecondary: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  cursor: "pointer",
};

const buttonPrimary: CSSProperties = {
  padding: "0.55rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
};
