import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export function RequireAuth() {
  const { session, authReady } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <main style={{ maxWidth: 480, margin: "2rem auto", padding: "0 1rem" }}>
        <p style={{ color: "var(--muted)" }}>Connexion…</p>
      </main>
    );
  }

  if (!session) {
    return <Navigate to="/connexion" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
