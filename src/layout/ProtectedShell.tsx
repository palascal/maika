import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { SeasonDataProvider } from "../season/SeasonDataContext";

function Nav() {
  const { isAdmin } = useAuth();
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: "0.5rem 0.75rem",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: 600,
    background: isActive ? "var(--surface)" : "transparent",
    color: isActive ? "var(--text)" : "var(--muted)",
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
      <NavLink to="/" end style={linkStyle}>
        Synthèse
      </NavLink>
      <NavLink to="/parties" style={linkStyle}>
        Parties
      </NavLink>
      <NavLink to="/joueurs" style={linkStyle}>
        Joueurs
      </NavLink>
      {isAdmin ? (
        <NavLink to="/config" style={linkStyle}>
          Config
        </NavLink>
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
          <div>
            <h1 style={{ fontSize: "1.35rem", margin: "0 0 0.25rem" }}>Maika 2026</h1>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.95rem" }}>{session?.username}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                padding: "0.3rem 0.65rem",
                borderRadius: 999,
                border: "1px solid var(--muted)",
                color: "var(--text)",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              {session?.role === "admin" ? "Admin" : "User"}
            </span>
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
