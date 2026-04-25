import { UserRound } from "lucide-react";
import { Outlet } from "react-router-dom";
import { SiteLogo } from "../components/SiteLogo";
import { useAuth } from "../auth/AuthContext";
import { ShellNavLink } from "../navigation/AppLink";
import { SeasonDataProvider } from "../season/SeasonDataContext";

function Nav() {
  const { canManageLeague, canAccessConfig } = useAuth();
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    background: isActive ? "var(--surface)" : "transparent",
    color: isActive ? "var(--text)" : "var(--muted)",
  });

  const homeLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    ...linkStyle({ isActive }),
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  });

  return (
    <nav
      style={{
        display: "flex",
        gap: 8,
        marginBottom: "1.25rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <ShellNavLink to="/" end style={homeLinkStyle} title="Dashboard — accueil">
        {({ isActive }) => (
          <>
            <SiteLogo size={22} style={{ opacity: isActive ? 1 : 0.88 }} decorative />
            <span>Dashboard</span>
          </>
        )}
      </ShellNavLink>
      <ShellNavLink to="/parties" style={linkStyle}>
        Parties
      </ShellNavLink>
      <ShellNavLink to="/joueurs" style={linkStyle}>
        Joueurs
      </ShellNavLink>
      <ShellNavLink to="/reglement" style={linkStyle}>
        Règlement
      </ShellNavLink>
      {canManageLeague ? (
        <ShellNavLink to="/admin/joueurs" style={linkStyle}>
          Admin joueurs
        </ShellNavLink>
      ) : null}
      {canAccessConfig ? (
        <ShellNavLink to="/config" style={linkStyle}>
          Config
        </ShellNavLink>
      ) : null}
    </nav>
  );
}

export function ProtectedShell() {
  const { session, logout } = useAuth();

  return (
    <>
      <header style={{ marginBottom: "0.5rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <SiteLogo size={36} style={{ marginTop: 2, opacity: 0.92 }} decorative />
            <div>
              <h1
                style={{
                  fontSize: "1.35rem",
                  margin: "0 0 0.25rem",
                  background: "#ffffff",
                  color: "#0b5d2a",
                  padding: "0.2rem 0.6rem",
                  borderRadius: 8,
                  border: "1px solid color-mix(in srgb, #0b5d2a 24%, transparent)",
                  fontFamily: "\"Times New Roman\", Georgia, serif",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Maika 2026
              </h1>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>{session?.username}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <ShellNavLink
              to="/profil"
              title="Profil — compte et mot de passe"
              aria-label="Profil — compte et mot de passe"
              style={({ isActive }) => ({
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.45rem 0.55rem",
                minWidth: "2.5rem",
                minHeight: "2.5rem",
                borderRadius: 10,
                border: "1px solid var(--muted)",
                color: "var(--text)",
                fontWeight: 600,
                textDecoration: "none",
                background: isActive ? "var(--surface)" : "transparent",
                lineHeight: 0,
              })}
            >
              {({ isActive }) => (
                <UserRound size={21} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: isActive ? 1 : 0.88 }} />
              )}
            </ShellNavLink>
            <button
              type="button"
              onClick={() => void logout()}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: 8,
                border: "1px solid var(--muted)",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>
      <Nav />
      <SeasonDataProvider>
        <Outlet />
      </SeasonDataProvider>
    </>
  );
}
