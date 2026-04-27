import { Eye, EyeOff, KeyRound, Loader2, LogOut, UserRound, X } from "lucide-react";
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
  const { session, logout } = useAuth();
  const { data } = useSeasonData();
  const supabase = isSupabaseConfigured();
  const [providers, setProviders] = useState<string[] | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mobileView, setMobileView] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 760px)").matches : false,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 760px)");
    const onChange = () => setMobileView(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

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
      setShowPwdModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Impossible de mettre à jour le mot de passe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: "0 auto" }}>
      <p style={{ marginTop: 0, marginBottom: "0.75rem" }}>
        {mobileView ? null : (
          <AppLink to="/" style={backLinkStyle}>
            ← Dashboard
          </AppLink>
        )}
      </p>

      <section style={cardStyle}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            style={{ ...iconButtonBaseStyle, ...secondaryActionStyle, ...fullWidthActionStyle, gap: 8, padding: "0.55rem 0.9rem" }}
            aria-label="Afficher mes informations de compte"
            title="Compte"
          >
            <UserRound size={18} strokeWidth={2} aria-hidden focusable={false} />
            Compte
          </button>
          {supabase ? (
            <button
              type="button"
              onClick={() => setShowPwdModal(true)}
              style={{ ...iconButtonBaseStyle, ...secondaryActionStyle, ...fullWidthActionStyle, gap: 8, padding: "0.55rem 0.9rem" }}
              aria-label="Mot de passe"
              title="Mot de passe"
            >
              <KeyRound size={18} strokeWidth={2} aria-hidden focusable={false} />
              Mot de passe
            </button>
          ) : null}
        </div>
      </section>

      {!supabase ? (
        <section style={{ ...cardStyle, marginTop: "1rem" }}>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>
            En mode démo (sans Supabase), les mots de passe sont fixes : comptes <strong>admin</strong> / <strong>admin</strong> et{" "}
            <strong>user</strong> / <strong>user</strong>. Aucun changement de mot de passe n’est disponible ici.
          </p>
        </section>
      ) : providers === null || !hasEmailProvider ? (
        <p style={{ marginTop: "1rem", color: "var(--muted)" }}>
          {providers === null
            ? "Chargement du profil…"
            : "Ce compte n’a pas de fournisseur e-mail actif pour modifier le mot de passe ici."}
        </p>
      ) : null}

      <div style={{ marginTop: "0.75rem" }}>
        <button
          type="button"
          onClick={() => void logout()}
          style={{ ...iconButtonBaseStyle, ...dangerActionStyle, ...fullWidthActionStyle, gap: 8, padding: "0.55rem 0.9rem" }}
          aria-label="Déconnexion"
          title="Déconnexion"
        >
          <LogOut size={18} strokeWidth={2} aria-hidden focusable={false} />
          Déconnexion
        </button>
      </div>

      {showAccountModal ? (
        <div style={overlayStyle} role="presentation" onClick={() => setShowAccountModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="account-modal-title" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 id="account-modal-title" style={{ margin: 0, fontSize: "1.05rem" }}>
                Compte
              </h3>
              <button type="button" onClick={() => setShowAccountModal(false)} style={closeIconStyle} aria-label="Fermer">
                <X size={20} strokeWidth={2} aria-hidden focusable={false} />
              </button>
            </div>
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
          </div>
        </div>
      ) : null}

      {showPwdModal ? (
        <div style={overlayStyle} role="presentation" onClick={() => (busy ? null : setShowPwdModal(false))}>
          <div role="dialog" aria-modal="true" aria-labelledby="pwd-modal-title" style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 id="pwd-modal-title" style={{ margin: 0, fontSize: "1.05rem" }}>
                Mot de passe
              </h3>
              <button type="button" onClick={() => (busy ? null : setShowPwdModal(false))} style={closeIconStyle} aria-label="Fermer">
                <X size={20} strokeWidth={2} aria-hidden focusable={false} />
              </button>
            </div>
            <form onSubmit={(e) => void onChangePassword(e)} style={{ display: "flex", flexDirection: "column", gap: 12 }} noValidate>
              <label style={labelStyle}>
                Nouveau mot de passe
                <div style={passwordWrapStyle}>
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError(null);
                      setMessage(null);
                    }}
                    style={passwordInputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={passwordToggleStyle}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    title={showPassword ? "Masquer" : "Afficher"}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden focusable={false} /> : <Eye size={18} aria-hidden focusable={false} />}
                  </button>
                </div>
              </label>
              <label style={labelStyle}>
                Confirmer
                <input
                  type={showPassword ? "text" : "password"}
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
                style={{ ...iconButtonBaseStyle, ...submitStyle, gap: 8, padding: "0.55rem 1rem", justifyContent: "center" }}
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
          </div>
        </div>
      ) : null}
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
const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "1rem",
  zIndex: 1200,
};
const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: 520,
  maxHeight: "90vh",
  overflow: "auto",
  background: "var(--surface)",
  borderRadius: 14,
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-lg)",
  padding: "1rem",
};
const modalHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: "0.75rem",
};
const closeIconStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  width: 34,
  height: 34,
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
const passwordWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
};
const passwordInputStyle: CSSProperties = {
  ...inputStyle,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  flex: 1,
  minWidth: 0,
};
const passwordToggleStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--muted)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: 8,
  marginRight: 4,
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
const secondaryActionStyle: CSSProperties = {
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  fontWeight: 600,
  justifyContent: "flex-start",
};
const dangerActionStyle: CSSProperties = {
  border: "1px solid color-mix(in srgb, var(--danger) 45%, var(--border))",
  background: "color-mix(in srgb, var(--danger) 8%, var(--surface))",
  color: "var(--danger)",
  fontWeight: 700,
  justifyContent: "flex-start",
};
const fullWidthActionStyle: CSSProperties = {
  width: "100%",
  minHeight: "2.75rem",
};
