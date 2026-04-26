import { KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { iconButtonBaseStyle } from "../components/IconActionButton";
import { AppLink } from "../navigation/AppLink";
import { useAuth } from "../auth/AuthContext";
import { playerIsActive } from "../domain/playerActive";
import { posteLabel } from "../domain/ranking";
import { appRoleLabel } from "../lib/accessRoles";
import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseConfigured } from "../lib/supabaseConfig";
import { useSeasonData } from "../season/SeasonDataContext";

const MIN_PASSWORD_LEN = 6;

export function ProfilePage() {
  const { session } = useAuth();
  const { data } = useSeasonData();
  const supabase = isSupabaseConfigured();
  const [providers, setProviders] = useState<string[] | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setProviders([]);
      return;
    }
    let cancelled = false;
    void getSupabaseClient()
      .auth.getUser()
      .then(({ data }) => {
        if (cancelled) return;
        const ids = data.user?.identities?.map((i) => i.provider) ?? [];
        setProviders(ids);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const hasEmailProvider = providers?.includes("email") ?? false;
  const username = session?.username?.trim().toLowerCase() ?? "";
  const linkedPlayer =
    data?.players.players.find((p) => p.email?.trim().toLowerCase() === username) ??
    data?.players.players.find((p) => p.id === username) ??
    null;
  const statusLabel = linkedPlayer ? (playerIsActive(linkedPlayer) ? "Actif" : "Désactivé") : "—";

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!supabase) return;
    if (newPassword.length < MIN_PASSWORD_LEN) {
      setError(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LEN} caractères.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les deux saisies doivent être identiques.");
      return;
    }
    setBusy(true);
    try {
      const { error: upErr } = await getSupabaseClient().auth.updateUser({ password: newPassword });
      if (upErr) throw upErr;
      setMessage("Mot de passe mis à jour. Vous restez connecté.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le mot de passe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto" }}>
      <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        <AppLink to="/" style={backLinkStyle}>
          ← Dashboard
        </AppLink>
      </p>
      <h2 style={{ fontSize: "1.15rem", marginTop: 0 }}>Mon profil</h2>

      <section style={cardStyle}>
        <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem", color: "var(--muted)" }}>Compte</h3>
        <dl style={{ margin: 0, display: "grid", gap: "0.5rem 1rem", gridTemplateColumns: "auto 1fr" }}>
          <dt style={dtStyle}>Identifiant</dt>
          <dd style={ddStyle}>{session?.username ?? "—"}</dd>
          <dt style={dtStyle}>Rôle</dt>
          <dd style={ddStyle}>{session?.role ? appRoleLabel(session.role) : "—"}</dd>
          <dt style={dtStyle}>Nom</dt>
          <dd style={ddStyle}>{linkedPlayer?.lastName ?? "—"}</dd>
          <dt style={dtStyle}>Prénom</dt>
          <dd style={ddStyle}>{linkedPlayer?.firstName ?? "—"}</dd>
          <dt style={dtStyle}>Poste</dt>
          <dd style={ddStyle}>{linkedPlayer ? posteLabel(linkedPlayer.poste) : "—"}</dd>
          <dt style={dtStyle}>Statut</dt>
          <dd style={ddStyle}>{statusLabel}</dd>
        </dl>
      </section>

      {!supabase ? (
        <section style={{ ...cardStyle, marginTop: "1rem" }}>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
            En mode démo (sans Supabase), les mots de passe sont fixes : comptes <strong>admin</strong> / <strong>admin</strong> et{" "}
            <strong>user</strong> / <strong>user</strong>. Aucun changement de mot de passe n’est disponible ici.
          </p>
        </section>
      ) : providers === null ? (
        <p style={{ marginTop: "1rem", color: "var(--muted)" }}>Chargement du profil…</p>
      ) : hasEmailProvider ? (
        <section style={{ ...cardStyle, marginTop: "1rem" }}>
          <h3 style={{ fontSize: "0.95rem", margin: "0 0 0.75rem" }}>Mot de passe</h3>
          <form
            onSubmit={(e) => void onChangePassword(e)}
            style={{ display: "flex", flexDirection: "column", gap: 12 }}
            noValidate
          >
            <label style={labelStyle}>
              Nouveau mot de passe
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError(null);
                  setMessage(null);
                }}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              Confirmer
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                  setMessage(null);
                }}
                style={inputStyle}
              />
            </label>
            {message ? (
              <p role="status" style={{ margin: 0, color: "var(--success)", fontSize: "0.9rem" }}>
                {message}
              </p>
            ) : null}
            {error ? (
              <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              style={{ ...iconButtonBaseStyle, ...submitStyle, gap: 8, padding: "0.55rem 1rem" }}
              disabled={busy}
              aria-label={busy ? "Enregistrement du mot de passe…" : "Mettre à jour le mot de passe"}
              title={busy ? "Enregistrement…" : "Mettre à jour le mot de passe"}
            >
              {busy ? (
                <Loader2 size={19} strokeWidth={2} className="animate-icon-spin" aria-hidden focusable={false} />
              ) : (
                <KeyRound size={19} strokeWidth={2} aria-hidden focusable={false} />
              )}
            </button>
          </form>
        </section>
      ) : (
        <section style={{ ...cardStyle, marginTop: "1rem" }}>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
            Ce compte n’a pas de fournisseur e-mail actif pour modifier le mot de passe ici.
          </p>
        </section>
      )}
    </main>
  );
}

const backLinkStyle: CSSProperties = { fontWeight: 600, textDecoration: "none", color: "var(--muted)" };
const cardStyle: CSSProperties = {
  background: "var(--surface)",
  borderRadius: 12,
  padding: "1.1rem 1.15rem",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
};
const dtStyle: CSSProperties = { margin: 0, color: "var(--muted)", fontSize: "0.85rem" };
const ddStyle: CSSProperties = { margin: 0, fontWeight: 600, fontSize: "0.95rem" };
const labelStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: "0.85rem", color: "var(--muted)" };
const inputStyle: CSSProperties = {
  padding: "0.55rem 0.65rem",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "1rem",
  minHeight: "2.65rem",
};
const submitStyle: CSSProperties = {
  padding: "0.6rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "1rem",
  marginTop: 4,
};
