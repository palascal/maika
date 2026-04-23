import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { isSupabaseConfigured } from "../lib/supabaseConfig";
import { useAuth } from "./AuthContext";

export function LoginPage() {
  const { session, login, authReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (session) {
    return <Navigate to={from === "/connexion" ? "/" : from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ok = await login(username, password);
    if (!ok) {
      setError("Identifiant ou mot de passe incorrect.");
      return;
    }
    navigate(from === "/connexion" ? "/" : from, { replace: true });
  }

  return (
    <main style={{ maxWidth: 400, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: "1.35rem", marginTop: 0 }}>Connexion</h1>
      <p style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: "1.25rem" }}>
        {isSupabaseConfigured() ? (
          <>
            Connexion <strong>Supabase</strong> : e-mail et mot de passe du compte créé dans le projet (rôle admin via{" "}
            <code>app_metadata.role</code>).
          </>
        ) : (
          <>
            Compte <strong>admin</strong> / <strong>admin</strong> : gestion des joueurs. Compte <strong>user</strong> /{" "}
            <strong>user</strong> : consultation uniquement.
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
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>
        {error ? (
          <p role="alert" style={{ margin: 0, color: "#f87171", fontSize: "0.9rem" }}>
            {error}
          </p>
        ) : null}
        <button type="submit" style={buttonStyle} disabled={!authReady}>
          {authReady ? "Se connecter" : "Chargement…"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  padding: "0.6rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--muted)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "1rem",
};

const buttonStyle: CSSProperties = {
  padding: "0.65rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "var(--accent)",
  color: "#0f172a",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "1rem",
};
