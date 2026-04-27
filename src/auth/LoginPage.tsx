import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { SiteLogo } from "../components/SiteLogo";
import { getSupabaseClient } from "../lib/supabaseClient";
import { isSupabaseConfigured } from "../lib/supabaseConfig";
import { supabasePasswordRecoveryRedirectTo } from "../lib/oauthRedirect";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { session, login, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";
  const redirectAfterLogin = from === "/connexion" || from === "/profil" ? "/" : from;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetInfo, setResetInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (session) {
    return <Navigate to={redirectAfterLogin} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ok = await login(username, password);
    if (!ok) {
      setError("Identifiant ou mot de passe incorrect.");
      return;
    }
    navigate(redirectAfterLogin, { replace: true });
  }

  async function onForgotPassword() {
    if (!isSupabaseConfigured()) return;
    const email = username.trim().toLowerCase();
    setResetInfo(null);
    setError(null);
    if (!email) {
      setError("Indiquez d’abord votre adresse e-mail.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Adresse e-mail invalide.");
      return;
    }
    setResetBusy(true);
    try {
      const { error: err } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
        redirectTo: supabasePasswordRecoveryRedirectTo(),
      });
      if (err) throw err;
      setResetInfo(
        "Si un compte existe pour cette adresse, un e-mail vient d’être envoyé avec un lien. Ouvrez-le : vous serez connecté sur la page Profil pour choisir un nouveau mot de passe. Pensez aux courriers indésirables (surtout Yahoo). Si rien n’arrive, l’adresse saisie doit être exactement celle utilisée à l’inscription (ou le compte n’existe pas encore dans Supabase).",
      );
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      const redirectHint =
        /redirect/i.test(raw) && /url|uri|allowed/i.test(raw)
          ? " Ajoutez l’URL de la page Profil (origine + chemin de l’app + `/profil`) dans Supabase → Authentication → URL configuration → Redirect URLs."
          : "";
      setError(
        raw ? `${raw}${redirectHint}` : "Impossible d’envoyer l’e-mail de réinitialisation.",
      );
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "2rem auto", padding: "0 1rem" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.85rem", opacity: 0.9 }}>
        <SiteLogo size={40} decorative />
      </div>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0, textAlign: "center" }}>Connexion</h1>
      <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
        {isSupabaseConfigured() ? (
          <>Compte Supabase : e-mail / mot de passe.</>
        ) : (
          <>
            Comptes démo : <strong>admin</strong>/<strong>admin</strong> (administration),{" "}
            <strong>orga</strong>/<strong>orga</strong> (gestion joueurs + parties),{" "}
            <strong>user</strong>/<strong>user</strong> (consultation).
          </>
        )}
      </p>
      <form
        onSubmit={onSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "var(--surface)",
          padding: "1.25rem",
          borderRadius: 12,
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
            {isSupabaseConfigured() ? "E-mail" : "Identifiant"}
          </span>
          <input
            autoComplete="username"
            type={isSupabaseConfigured() ? "email" : "text"}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>Mot de passe</span>
          <div style={passwordWrapStyle}>
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        {isSupabaseConfigured() ? (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -6 }}>
            <button
              type="button"
              disabled={!authReady || resetBusy}
              onClick={() => void onForgotPassword()}
              style={forgotLinkStyle}
            >
              {resetBusy ? "Envoi…" : "Mot de passe oublié ?"}
            </button>
          </div>
        ) : null}
        {resetInfo ? (
          <p role="status" style={{ margin: 0, color: "var(--success)", fontSize: "0.9rem", lineHeight: 1.45 }}>
            {resetInfo}
          </p>
        ) : null}
        {error ? (
          <p role="alert" style={{ margin: 0, color: "var(--danger)", fontSize: "0.9rem" }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          style={{ ...buttonStyle, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
          disabled={!authReady}
          aria-label={authReady ? "Se connecter" : "Chargement de la session…"}
          title={authReady ? "Se connecter" : "Chargement…"}
        >
          {authReady ? (
            <LogIn size={20} strokeWidth={2} aria-hidden focusable={false} />
          ) : (
            <Loader2 size={20} strokeWidth={2} className="animate-icon-spin" aria-hidden focusable={false} />
          )}
        </button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--border-strong)",
  background: "var(--surface)",
  color: "var(--text)",
  fontSize: "1rem",
};

const buttonStyle: CSSProperties = {
  padding: "0.65rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "var(--on-accent)",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "1rem",
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

const forgotLinkStyle: CSSProperties = {
  border: "none",
  background: "none",
  padding: "0.2rem 0",
  cursor: "pointer",
  fontSize: "0.88rem",
  fontWeight: 600,
  color: "var(--accent)",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

