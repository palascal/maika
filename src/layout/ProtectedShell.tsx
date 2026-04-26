import { CircleHelp, UserRound } from "lucide-react";
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { MaikaPointsHelpDialog } from "../components/MaikaPointsHelpDialog";
import { SiteLogo } from "../components/SiteLogo";
import { BUILD_NUMBER } from "../buildInfo";
import { useAuth } from "../auth/AuthContext";
import { ShellNavLink } from "../navigation/AppLink";
import { SeasonDataProvider, useSeasonData } from "../season/SeasonDataContext";

function Nav() {
  const { canManageLeague, canAccessConfig } = useAuth();
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    background: isActive ? "var(--nav-active-bg)" : "transparent",
    color: isActive ? "var(--nav-active-text)" : "var(--muted)",
  });

  const homeLinkStyle = ({ isActive }: { isActive: boolean }) => ({
    ...linkStyle({ isActive }),
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  });

  return (
    <nav className="app-nav">
      <ShellNavLink to="/" end style={homeLinkStyle} title="Classement — accueil">
        <span>Classement</span>
      </ShellNavLink>
      <ShellNavLink to="/parties" style={linkStyle}>
        Parties
      </ShellNavLink>
      {canManageLeague ? (
        <ShellNavLink to="/admin/joueurs" style={linkStyle}>
          Joueurs
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
  return (
    <SeasonDataProvider>
      <ProtectedShellContent />
    </SeasonDataProvider>
  );
}

function ProtectedShellContent() {
  const { session, logout } = useAuth();
  const { data } = useSeasonData();
  const seasonLabel = data?.players.seasonLabel?.trim() || "Maika";
  const [maikaHelpOpen, setMaikaHelpOpen] = useState(false);

  const helpButtonStyle = {
    display: "inline-flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: "0.45rem 0.55rem",
    minWidth: "2.5rem",
    minHeight: "2.5rem",
    borderRadius: 10,
    border: "1px solid var(--border-strong)",
    color: "var(--text)",
    fontWeight: 600,
    lineHeight: 0,
    cursor: "pointer" as const,
    background: maikaHelpOpen ? "var(--nav-active-bg)" : "transparent",
  };

  return (
    <>
      <MaikaPointsHelpDialog open={maikaHelpOpen} onClose={() => setMaikaHelpOpen(false)} />
      <header className="app-header">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <SiteLogo size={36} style={{ marginTop: 2, opacity: 0.92 }} decorative />
            <div>
              <h1
                style={{
                  fontSize: "1.35rem",
                  margin: "0 0 0.25rem",
                  color: "var(--text)",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Maïka {seasonLabel}
                <span
                  style={{
                    fontSize: "0.62rem",
                    lineHeight: 1,
                    color: "var(--muted)",
                    opacity: 0.95,
                    letterSpacing: "0.02em",
                    fontWeight: 600,
                    fontFamily: "Inter, system-ui, sans-serif",
                    textTransform: "none",
                  }}
                >
                  build {BUILD_NUMBER}
                </span>
              </h1>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>{session?.username}</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              title="Calcul des points Maïka"
              aria-label="Calcul des points Maïka"
              aria-expanded={maikaHelpOpen}
              onClick={() => setMaikaHelpOpen(true)}
              style={helpButtonStyle}
            >
              <CircleHelp size={20} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: maikaHelpOpen ? 1 : 0.88 }} />
            </button>
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
                border: "1px solid var(--border-strong)",
                color: "var(--text)",
                fontWeight: 600,
                textDecoration: "none",
                background: isActive ? "var(--nav-active-bg)" : "transparent",
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
                border: "1px solid var(--border-strong)",
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
      <Outlet />
    </>
  );
}
