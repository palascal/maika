import { CalendarDays, Medal, Settings, UserRound, Users } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { Outlet, useLocation } from "react-router-dom";
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
  const { session } = useAuth();
  const { canManageLeague, canAccessConfig } = useAuth();
  const location = useLocation();
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

  if (mobileView) {
    const pathname = location.pathname;
    const mobileTitle = pathname === "/"
      ? "Classement"
      : pathname.startsWith("/parties")
        ? "Parties"
        : pathname.startsWith("/admin/joueurs") || pathname.startsWith("/joueurs")
          ? "Joueurs"
          : pathname.startsWith("/profil")
            ? "Profil"
            : pathname.startsWith("/config")
              ? "Config"
              : "Maïka";
    return (
      <>
        <header style={mobileTopHeaderStyle} aria-label={`Titre de page : ${mobileTitle}`}>
          <h1 style={mobileTopTitleStyle}>{mobileTitle}</h1>
        </header>
        <div style={mobileContentWrapStyle}>
          <Outlet />
        </div>
        <nav style={mobileBottomBarStyle} aria-label="Navigation principale mobile">
          <ShellNavLink to="/" end title="Classement" aria-label="Classement" style={mobileNavLinkStyle}>
            {({ isActive }) => <Medal size={19} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: isActive ? 1 : 0.86 }} />}
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
          <ShellNavLink to="/profil" title="Profil" aria-label="Profil" style={mobileNavLinkStyle}>
            {({ isActive }) => <UserRound size={19} strokeWidth={2} aria-hidden focusable={false} style={{ opacity: isActive ? 1 : 0.86 }} />}
          </ShellNavLink>
        </nav>
      </>
    );
  }

  return (
    <>
      <header className="app-header">
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <p style={{ margin: "0.35rem 0 0", color: "var(--muted)", fontSize: "0.95rem", fontWeight: 600 }}>{session?.username}</p>
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
          </div>
        </div>
      </header>
      <Nav />
      <Outlet />
    </>
  );
}

const mobileContentWrapStyle: CSSProperties = {
  paddingTop: "calc(3.1rem + env(safe-area-inset-top))",
  paddingBottom: "calc(5.2rem + env(safe-area-inset-bottom))",
};

const mobileTopHeaderStyle: CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1205,
  padding: "calc(0.35rem + env(safe-area-inset-top)) 0.9rem 0.35rem",
  borderBottom: "1px solid var(--border)",
  background: "color-mix(in srgb, var(--surface) 94%, transparent)",
  backdropFilter: "blur(4px)",
};

const mobileTopTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "1.02rem",
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: "var(--text)",
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
