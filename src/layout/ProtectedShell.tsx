import { CalendarDays, CircleHelp, House, LogOut, Settings, UserRound, Users } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { MaikaPointsHelpDialog } from "../components/MaikaPointsHelpDialog";
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
  const { data, loading } = useSeasonData();
  const { canManageLeague, canAccessConfig } = useAuth();
  const seasonLabel = data?.players.seasonLabel?.trim() || "Maika";
  const [maikaHelpOpen, setMaikaHelpOpen] = useState(false);
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

  if (mobileView) {
    return (
      <>
        <MaikaPointsHelpDialog
          open={maikaHelpOpen}
          onClose={() => setMaikaHelpOpen(false)}
          seasonLabel={seasonLabel}
          buildNumber={BUILD_NUMBER}
        />
        <div style={mobileContentWrapStyle}>
          <Outlet />
        </div>
        <nav style={mobileBottomBarStyle} aria-label="Navigation principale mobile">
          <ShellNavLink to="/" end title="Classement" aria-label="Classement" style={mobileNavLinkStyle}>
            {({ isActive }) => <House size={19} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: isActive ? 1 : 0.86 }} />}
          </ShellNavLink>
          <ShellNavLink to="/parties" title="Parties" aria-label="Parties" style={mobileNavLinkStyle}>
            {({ isActive }) => (
              <CalendarDays size={19} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: isActive ? 1 : 0.86 }} />
            )}
          </ShellNavLink>
          {canManageLeague ? (
            <ShellNavLink to="/admin/joueurs" title="Joueurs" aria-label="Joueurs" style={mobileNavLinkStyle}>
              {({ isActive }) => <Users size={19} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: isActive ? 1 : 0.86 }} />}
            </ShellNavLink>
          ) : null}
          {canAccessConfig ? (
            <ShellNavLink to="/config" title="Config" aria-label="Config" style={mobileNavLinkStyle}>
              {({ isActive }) => (
                <Settings size={19} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: isActive ? 1 : 0.86 }} />
              )}
            </ShellNavLink>
          ) : null}
          <button
            type="button"
            title={`Infos (${loading ? "Chargement" : `Saison ${seasonLabel} · Build ${BUILD_NUMBER}`})`}
            aria-label="Informations barème, saison et build"
            aria-expanded={maikaHelpOpen}
            onClick={() => setMaikaHelpOpen(true)}
            style={mobileIconButtonStyle}
          >
            <CircleHelp size={19} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: maikaHelpOpen ? 1 : 0.86 }} />
          </button>
          <ShellNavLink to="/profil" title="Profil" aria-label="Profil" style={mobileNavLinkStyle}>
            {({ isActive }) => <UserRound size={19} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: isActive ? 1 : 0.86 }} />}
          </ShellNavLink>
          <button type="button" title="Déconnexion" aria-label="Déconnexion" onClick={() => void logout()} style={mobileIconButtonStyle}>
            <LogOut size={19} strokeWidth={2} aria-hidden focusable={false} />
          </button>
        </nav>
      </>
    );
  }

  return (
    <>
      <MaikaPointsHelpDialog
        open={maikaHelpOpen}
        onClose={() => setMaikaHelpOpen(false)}
        seasonLabel={seasonLabel}
        buildNumber={BUILD_NUMBER}
      />
      <header className="app-header">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontSize: "0.95rem", fontWeight: 600 }}>{session?.username}</p>
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

const mobileContentWrapStyle: CSSProperties = {
  paddingBottom: "calc(5.2rem + env(safe-area-inset-bottom))",
};

const mobileBottomBarStyle: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1200,
  display: "flex",
  justifyContent: "space-around",
  alignItems: "center",
  gap: 4,
  padding: "0.45rem 0.45rem calc(0.45rem + env(safe-area-inset-bottom))",
  borderTop: "1px solid var(--border)",
  background: "var(--surface)",
  boxShadow: "0 -6px 18px color-mix(in srgb, var(--text) 10%, transparent)",
};

const mobileNavLinkStyle = ({ isActive }: { isActive: boolean }): CSSProperties => ({
  width: 42,
  height: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  color: "var(--text)",
  textDecoration: "none",
  background: isActive ? "var(--nav-active-bg)" : "transparent",
  lineHeight: 0,
  flexShrink: 0,
});

const mobileIconButtonStyle: CSSProperties = {
  width: 42,
  height: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text)",
  lineHeight: 0,
  cursor: "pointer",
  flexShrink: 0,
};
